namespace AdvancedVocabApp.Core.Entities;

public class CambridgeExerciseAttempt
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ExerciseId { get; set; }
    public string AnswerJson { get; set; } = "{}";
    public double? Score { get; set; }       // 0.0–1.0
    public string? FeedbackJson { get; set; }
    public int? TimeSpentSeconds { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
    public CambridgeExercise Exercise { get; set; } = null!;
}
