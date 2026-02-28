namespace AdvancedVocabApp.Core.Entities;

public class AudioCache
{
    public Guid Id { get; set; }
    public string Word { get; set; } = string.Empty;
    public string Language { get; set; } = "en";
    public string VoiceName { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}
