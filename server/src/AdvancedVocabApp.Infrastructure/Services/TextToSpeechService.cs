using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using AdvancedVocabApp.Core.Entities;
using AdvancedVocabApp.Core.Interfaces;
using AdvancedVocabApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace AdvancedVocabApp.Infrastructure.Services;

public class TextToSpeechService(HttpClient httpClient, AppDbContext db, IConfiguration config) : ITextToSpeechService
{
    private const string DefaultVoice = "en-US-Wavenet-D";

    private string ApiKey => config["GoogleCloud:TtsApiKey"]
        ?? throw new InvalidOperationException("GoogleCloud:TtsApiKey is not configured.");

    public async Task<string?> GetPronunciationUrlAsync(
        string word,
        string language,
        string? voiceName = null,
        CancellationToken ct = default)
    {
        word = word.Trim().ToLowerInvariant();
        voiceName ??= DefaultVoice;

        // Return from cache if available
        var cached = await db.AudioCaches
            .FirstOrDefaultAsync(a => a.Word == word && a.Language == language && a.VoiceName == voiceName, ct);

        if (cached is not null)
            return cached.StoragePath;

        // Derive BCP-47 language code from voice name (e.g. "en-GB-Wavenet-A" → "en-GB")
        var languageCode = DeriveLanguageCode(voiceName);

        var requestUrl = $"https://texttospeech.googleapis.com/v1/text:synthesize?key={ApiKey}";
        var requestBody = new TtsSynthesizeRequest(
            new TtsInput(word),
            new TtsVoiceSelection(languageCode, voiceName),
            new TtsAudioConfig("MP3"));

        HttpResponseMessage httpResponse;
        try
        {
            httpResponse = await httpClient.PostAsJsonAsync(requestUrl, requestBody, ct);
        }
        catch (HttpRequestException)
        {
            return null;
        }

        if (!httpResponse.IsSuccessStatusCode)
            return null;

        TtsSynthesizeResponse? ttsResponse;
        try
        {
            ttsResponse = await httpResponse.Content.ReadFromJsonAsync<TtsSynthesizeResponse>(cancellationToken: ct);
        }
        catch (JsonException)
        {
            return null;
        }

        if (string.IsNullOrEmpty(ttsResponse?.AudioContent))
            return null;

        // Store as base64 data-URI (GCS not yet configured)
        var dataUri = $"data:audio/mp3;base64,{ttsResponse.AudioContent}";

        var audioCache = new AudioCache
        {
            Id = Guid.NewGuid(),
            Word = word,
            Language = language,
            VoiceName = voiceName,
            StoragePath = dataUri,
            GeneratedAt = DateTime.UtcNow,
        };

        db.AudioCaches.Add(audioCache);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Concurrent insert — another request won the race; return their result
            db.ChangeTracker.Clear();
            var existing = await db.AudioCaches
                .FirstOrDefaultAsync(a => a.Word == word && a.Language == language && a.VoiceName == voiceName, ct);
            return existing?.StoragePath;
        }

        return dataUri;
    }

    public async Task<IReadOnlyList<string>> GetAvailableVoicesAsync(string language, CancellationToken ct = default)
    {
        var requestUrl = $"https://texttospeech.googleapis.com/v1/voices?languageCode={language}&key={ApiKey}";

        try
        {
            var response = await httpClient.GetFromJsonAsync<TtsVoicesResponse>(requestUrl, ct);
            if (response?.Voices is { Count: > 0 })
            {
                return response.Voices
                    .Where(v => v.Name?.Contains("Wavenet", StringComparison.OrdinalIgnoreCase) == true)
                    .Select(v => v.Name!)
                    .OrderBy(n => n)
                    .ToList();
            }
        }
        catch (HttpRequestException) { }
        catch (JsonException) { }

        // Fallback: well-known English WaveNet voices
        return FallbackEnglishVoices;
    }

    // Parses BCP-47 language code from voice name: "en-GB-Wavenet-A" → "en-GB"
    private static string DeriveLanguageCode(string voiceName)
    {
        var parts = voiceName.Split('-');
        return parts.Length >= 2 ? $"{parts[0]}-{parts[1]}" : "en-US";
    }

    private static readonly IReadOnlyList<string> FallbackEnglishVoices =
    [
        "en-AU-Wavenet-A", "en-AU-Wavenet-B", "en-AU-Wavenet-C", "en-AU-Wavenet-D",
        "en-GB-Wavenet-A", "en-GB-Wavenet-B", "en-GB-Wavenet-C", "en-GB-Wavenet-D", "en-GB-Wavenet-F",
        "en-IN-Wavenet-A", "en-IN-Wavenet-B", "en-IN-Wavenet-C", "en-IN-Wavenet-D",
        "en-US-Wavenet-A", "en-US-Wavenet-B", "en-US-Wavenet-C", "en-US-Wavenet-D",
        "en-US-Wavenet-E", "en-US-Wavenet-F", "en-US-Wavenet-G", "en-US-Wavenet-H",
        "en-US-Wavenet-I", "en-US-Wavenet-J",
    ];

    // ── Google Cloud TTS request/response models ─────────────────────────────

    private sealed record TtsSynthesizeRequest(
        [property: JsonPropertyName("input")]       TtsInput Input,
        [property: JsonPropertyName("voice")]       TtsVoiceSelection Voice,
        [property: JsonPropertyName("audioConfig")] TtsAudioConfig AudioConfig);

    private sealed record TtsInput(
        [property: JsonPropertyName("text")] string Text);

    private sealed record TtsVoiceSelection(
        [property: JsonPropertyName("languageCode")] string LanguageCode,
        [property: JsonPropertyName("name")]         string Name);

    private sealed record TtsAudioConfig(
        [property: JsonPropertyName("audioEncoding")] string AudioEncoding);

    private sealed record TtsSynthesizeResponse(
        [property: JsonPropertyName("audioContent")] string? AudioContent);

    private sealed class TtsVoicesResponse
    {
        [JsonPropertyName("voices")]
        public List<TtsVoice>? Voices { get; set; }
    }

    private sealed class TtsVoice
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }
    }
}
