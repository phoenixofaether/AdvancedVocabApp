using AdvancedVocabApp.Core.Entities;

namespace AdvancedVocabApp.Core.Interfaces;

public interface ISpacedRepetitionService
{
    ReviewCard ProcessReview(ReviewCard card, int quality);
}
