using AdvancedVocabApp.Core.Entities;

namespace AdvancedVocabApp.Core.Interfaces;

public interface IExerciseGenerationService
{
    Task<CambridgeExercise> GenerateExerciseAsync(
        Guid userId,
        string level,
        string exerciseType,
        IReadOnlyList<CambridgeSkillProfile> skillProfile,
        CancellationToken ct = default);

    Task<(double Score, string FeedbackJson)> EvaluateWritingAsync(
        string taskJson,
        string userAnswer,
        string level,
        CancellationToken ct = default);
}
