namespace AdvancedVocabApp.Core.Entities;

public class ReviewCard
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid VocabEntryId { get; set; }
    public double EaseFactor { get; set; } = 2.5;
    public int Interval { get; set; } = 0;
    public int Repetitions { get; set; } = 0;
    public DateTime NextReviewDate { get; set; } = DateTime.UtcNow;
    public DateTime? LastReviewedAt { get; set; }

    public ApplicationUser User { get; set; } = null!;
    public VocabEntry VocabEntry { get; set; } = null!;
    public ICollection<ReviewHistory> History { get; set; } = [];
}
