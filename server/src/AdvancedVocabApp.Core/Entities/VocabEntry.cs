namespace AdvancedVocabApp.Core.Entities;

public class VocabEntry
{
    public Guid Id { get; set; }
    public string Word { get; set; } = string.Empty;
    public string Language { get; set; } = "en";
    public Guid? DictionaryDataId { get; set; }
    public string? CustomDefinition { get; set; }
    public string? CustomPhonetic { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DictionaryData? DictionaryData { get; set; }
    public ApplicationUser CreatedByUser { get; set; } = null!;
    public ICollection<VocabSetEntry> SetEntries { get; set; } = [];
    public ICollection<ReviewCard> ReviewCards { get; set; } = [];
}
