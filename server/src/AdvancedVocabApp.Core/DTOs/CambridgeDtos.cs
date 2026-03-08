namespace AdvancedVocabApp.Core.DTOs;

public record GenerateExerciseRequest(string Level, string ExerciseType);

public record ExerciseResponse(
    Guid Id,
    string Level,
    string ExerciseType,
    string ContentJson,
    DateTime GeneratedAt);

public record SubmitAttemptRequest(
    Guid ExerciseId,
    string AnswerJson,
    int? TimeSpentSeconds);

public record AttemptResponse(
    Guid Id,
    Guid ExerciseId,
    string Level,
    string ExerciseType,
    string AnswerJson,
    string ContentJson,  // full content including answer key, returned after submission
    double? Score,
    string? FeedbackJson,
    int? TimeSpentSeconds,
    DateTime SubmittedAt);

public record SkillProfileEntry(
    string Level,
    string ExerciseType,
    int AttemptCount,
    double AverageScore,
    DateTime? LastAttemptAt);

public record ExerciseTypeInfo(
    string Type,
    string Category,
    string DisplayName,
    string Description,
    string[] AvailableLevels);
