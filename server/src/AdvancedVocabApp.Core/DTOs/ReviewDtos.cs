namespace AdvancedVocabApp.Core.DTOs;

public record ReviewSubmitRequest(Guid ReviewCardId, int Quality);

public record ReviewCardResponse(
    Guid Id,
    Guid VocabEntryId,
    string Word,
    string Language,
    double EaseFactor,
    int Interval,
    int Repetitions,
    DateTime NextReviewDate,
    DateTime? LastReviewedAt);

public record ReviewStatsResponse(
    int DueToday,
    int ReviewedToday,
    int TotalCards,
    int CurrentStreak);
