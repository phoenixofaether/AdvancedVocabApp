namespace AdvancedVocabApp.Core.Interfaces;

public interface ITextToSpeechService
{
    Task<string?> GetPronunciationUrlAsync(string word, string language, string? voiceName = null, CancellationToken ct = default);
    Task<IReadOnlyList<string>> GetAvailableVoicesAsync(string language, CancellationToken ct = default);
}
