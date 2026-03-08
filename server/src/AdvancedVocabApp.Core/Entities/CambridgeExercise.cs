namespace AdvancedVocabApp.Core.Entities;

public class CambridgeExercise
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Level { get; set; } = string.Empty;        // "B2First" | "C1Advanced" | "C2Proficiency"
    public string ExerciseType { get; set; } = string.Empty; // "OpenCloze" | "Essay" | etc.
    public string ContentJson { get; set; } = "{}";
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
    public ICollection<CambridgeExerciseAttempt> Attempts { get; set; } = [];
}
