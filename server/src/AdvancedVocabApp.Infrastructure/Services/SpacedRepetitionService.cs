using AdvancedVocabApp.Core.Entities;
using AdvancedVocabApp.Core.Interfaces;

namespace AdvancedVocabApp.Infrastructure.Services;

public class SpacedRepetitionService : ISpacedRepetitionService
{
    private const double MinEaseFactor = 1.3;
    private const double DefaultEaseFactor = 2.5;

    /// <summary>
    /// Applies the SM-2 algorithm to update review card scheduling.
    /// Quality ratings: 1=Again, 3=Hard, 4=Good, 5=Easy.
    /// </summary>
    public ReviewCard ProcessReview(ReviewCard card, int quality)
    {
        quality = Math.Clamp(quality, 1, 5);

        if (quality >= 3)
        {
            // Correct response
            card.Interval = card.Repetitions switch
            {
                0 => 1,
                1 => 6,
                _ => (int)Math.Round(card.Interval * card.EaseFactor),
            };
            card.Repetitions++;
        }
        else
        {
            // Incorrect response - reset
            card.Repetitions = 0;
            card.Interval = 1;
        }

        // Update ease factor using SM-2 formula
        card.EaseFactor += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
        card.EaseFactor = Math.Max(MinEaseFactor, card.EaseFactor);

        card.NextReviewDate = DateTime.UtcNow.AddDays(card.Interval);
        card.LastReviewedAt = DateTime.UtcNow;

        return card;
    }
}
