namespace AdvancedVocabApp.Core.Entities;

public class CambridgeSkillProfile
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Level { get; set; } = string.Empty;
    public string ExerciseType { get; set; } = string.Empty;
    public int AttemptCount { get; set; } = 0;
    public double AverageScore { get; set; } = 0.0;
    public DateTime? LastAttemptAt { get; set; }

    public ApplicationUser User { get; set; } = null!;
}
