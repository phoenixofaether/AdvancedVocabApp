namespace AdvancedVocabApp.Core.Entities;

public class ReviewHistory
{
    public Guid Id { get; set; }
    public Guid ReviewCardId { get; set; }
    public int Quality { get; set; }
    public DateTime ReviewedAt { get; set; } = DateTime.UtcNow;
    public int PreviousInterval { get; set; }
    public int NewInterval { get; set; }
    public double PreviousEaseFactor { get; set; }
    public double NewEaseFactor { get; set; }

    public ReviewCard ReviewCard { get; set; } = null!;
}
