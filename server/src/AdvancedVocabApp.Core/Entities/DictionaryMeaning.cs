namespace AdvancedVocabApp.Core.Entities;

public class DictionaryMeaning
{
    public Guid Id { get; set; }
    public Guid DictionaryDataId { get; set; }
    public string PartOfSpeech { get; set; } = string.Empty;
    public string Definition { get; set; } = string.Empty;
    public string? Example { get; set; }
    public int SortOrder { get; set; }

    public DictionaryData DictionaryData { get; set; } = null!;
}
