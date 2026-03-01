namespace AdvancedVocabApp.Core.DTOs;

public record CreateVocabSetRequest(
    string Name,
    string? Description,
    string TargetLanguage = "en");

public record UpdateVocabSetRequest(
    string Name,
    string? Description);

public record VocabSetResponse(
    Guid Id,
    string Name,
    string? Description,
    string TargetLanguage,
    int EntryCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record CreateVocabEntryRequest(
    string Word,
    string Language = "en",
    string? CustomDefinition = null,
    string? CustomPhonetic = null);

public record VocabEntryResponse(
    Guid Id,
    string Word,
    string Language,
    string? CustomDefinition,
    string? CustomPhonetic,
    DictionaryDataResponse? DictionaryData,
    DateTime CreatedAt);

public record DictionaryDataResponse(
    string PhoneticText,
    string? AudioUrl,
    IReadOnlyList<DictionaryMeaningResponse> Meanings);

public record DictionaryMeaningResponse(
    string PartOfSpeech,
    string Definition,
    string? Example);

public record AddEntriesToSetRequest(IReadOnlyList<Guid> EntryIds);

public record AudioUrlResponse(string Url);
