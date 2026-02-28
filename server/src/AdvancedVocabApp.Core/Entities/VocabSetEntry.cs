namespace AdvancedVocabApp.Core.Entities;

public class VocabSetEntry
{
    public Guid VocabSetId { get; set; }
    public Guid VocabEntryId { get; set; }
    public int SortOrder { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public VocabSet VocabSet { get; set; } = null!;
    public VocabEntry VocabEntry { get; set; } = null!;
}
