using AdvancedVocabApp.Core.Entities;

namespace AdvancedVocabApp.Core.Interfaces;

public interface IDictionaryService
{
    Task<DictionaryData?> LookupWordAsync(string word, string language, CancellationToken ct = default);
}
