namespace AdvancedVocabApp.Core.Entities;

public class DictionaryData
{
    public Guid Id { get; set; }
    public string Word { get; set; } = string.Empty;
    public string Language { get; set; } = "en";
    public string? PhoneticText { get; set; }
    public string? AudioUrl { get; set; }
    public string RawJson { get; set; } = "{}";
    public DateTime FetchedAt { get; set; } = DateTime.UtcNow;

    public ICollection<DictionaryMeaning> Meanings { get; set; } = [];
    public ICollection<VocabEntry> VocabEntries { get; set; } = [];
}
