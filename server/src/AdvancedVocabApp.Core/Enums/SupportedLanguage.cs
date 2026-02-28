namespace AdvancedVocabApp.Core.Enums;

public static class SupportedLanguages
{
    public static readonly Dictionary<string, string> All = new()
    {
        { "en", "English" },
        { "fr", "French" },
        { "de", "German" },
        { "es", "Spanish" },
        { "it", "Italian" },
        { "pt", "Portuguese" },
        { "ja", "Japanese" },
        { "ko", "Korean" },
        { "ru", "Russian" },
        { "tr", "Turkish" },
        { "ar", "Arabic" },
        { "hi", "Hindi" },
    };

    public static bool IsSupported(string code) => All.ContainsKey(code);
}
