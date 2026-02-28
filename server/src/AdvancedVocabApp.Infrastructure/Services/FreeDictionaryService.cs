using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using AdvancedVocabApp.Core.Entities;
using AdvancedVocabApp.Core.Interfaces;
using AdvancedVocabApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AdvancedVocabApp.Infrastructure.Services;

public class FreeDictionaryService(HttpClient httpClient, AppDbContext db) : IDictionaryService
{
    public async Task<DictionaryData?> LookupWordAsync(string word, string language, CancellationToken ct = default)
    {
        word = word.Trim().ToLowerInvariant();

        // Return from cache if already fetched
        var existing = await db.DictionaryData
            .Include(d => d.Meanings)
            .FirstOrDefaultAsync(d => d.Word == word && d.Language == language, ct);

        if (existing is not null)
            return existing;

        // Call Free Dictionary API — no API key required
        var url = $"https://api.dictionaryapi.dev/api/v2/entries/{language}/{Uri.EscapeDataString(word)}";

        List<FreeDictEntry>? apiResponse;
        try
        {
            apiResponse = await httpClient.GetFromJsonAsync<List<FreeDictEntry>>(url, ct);
        }
        catch (HttpRequestException)
        {
            return null;
        }
        catch (JsonException)
        {
            return null;
        }

        if (apiResponse is null or { Count: 0 })
            return null;

        // Pick best phonetic: prefer one that has both text and audio
        var phonetics = apiResponse.SelectMany(e => e.Phonetics ?? []).ToList();
        var bestPhonetic = phonetics.FirstOrDefault(p => !string.IsNullOrEmpty(p.Text) && !string.IsNullOrEmpty(p.Audio))
                        ?? phonetics.FirstOrDefault(p => !string.IsNullOrEmpty(p.Text));

        var dictData = new DictionaryData
        {
            Id = Guid.NewGuid(),
            Word = word,
            Language = language,
            PhoneticText = bestPhonetic?.Text,
            AudioUrl = string.IsNullOrEmpty(bestPhonetic?.Audio) ? null : bestPhonetic.Audio,
            RawJson = JsonSerializer.Serialize(apiResponse),
            FetchedAt = DateTime.UtcNow,
        };

        // Flatten all definitions across all entries, preserving part-of-speech
        int sortOrder = 0;
        foreach (var entry in apiResponse)
        {
            foreach (var meaning in entry.Meanings ?? [])
            {
                foreach (var def in meaning.Definitions ?? [])
                {
                    if (string.IsNullOrEmpty(def.Definition))
                        continue;

                    dictData.Meanings.Add(new DictionaryMeaning
                    {
                        Id = Guid.NewGuid(),
                        DictionaryDataId = dictData.Id,
                        PartOfSpeech = meaning.PartOfSpeech ?? string.Empty,
                        Definition = def.Definition,
                        Example = def.Example,
                        SortOrder = sortOrder++,
                    });
                }
            }
        }

        db.DictionaryData.Add(dictData);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Another concurrent request saved the same word — fetch and return that
            db.ChangeTracker.Clear();
            return await db.DictionaryData
                .Include(d => d.Meanings)
                .FirstOrDefaultAsync(d => d.Word == word && d.Language == language, ct);
        }

        return dictData;
    }

    // Internal API response model
    private sealed class FreeDictEntry
    {
        [JsonPropertyName("phonetics")]
        public List<FreeDictPhonetic>? Phonetics { get; set; }

        [JsonPropertyName("meanings")]
        public List<FreeDictMeaning>? Meanings { get; set; }
    }

    private sealed class FreeDictPhonetic
    {
        [JsonPropertyName("text")]
        public string? Text { get; set; }

        [JsonPropertyName("audio")]
        public string? Audio { get; set; }
    }

    private sealed class FreeDictMeaning
    {
        [JsonPropertyName("partOfSpeech")]
        public string? PartOfSpeech { get; set; }

        [JsonPropertyName("definitions")]
        public List<FreeDictDefinition>? Definitions { get; set; }
    }

    private sealed class FreeDictDefinition
    {
        [JsonPropertyName("definition")]
        public string? Definition { get; set; }

        [JsonPropertyName("example")]
        public string? Example { get; set; }
    }
}
