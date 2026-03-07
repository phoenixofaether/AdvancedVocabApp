using System.IdentityModel.Tokens.Jwt;
using AdvancedVocabApp.Core.DTOs;
using AdvancedVocabApp.Core.Entities;
using AdvancedVocabApp.Core.Interfaces;
using AdvancedVocabApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AdvancedVocabApp.Api.Controllers;

[ApiController]
[Route("api/review")]
[Authorize]
public class ReviewController(AppDbContext db, ISpacedRepetitionService srs) : ControllerBase
{
    /// <summary>Returns all review cards for the current user with vocab entry details.</summary>
    [HttpGet("cards")]
    public async Task<ActionResult<IReadOnlyList<WordListItemResponse>>> GetAllCards(CancellationToken ct)
    {
        var userId = GetUserId();

        var cards = await db.ReviewCards
            .Include(c => c.VocabEntry)
                .ThenInclude(e => e.DictionaryData)
                    .ThenInclude(d => d!.Meanings)
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.VocabEntry.CreatedAt)
            .ToListAsync(ct);

        return Ok(cards.Select(MapToWordListItem).ToList());
    }

    /// <summary>Returns review cards due now for the current user, ordered by due date.</summary>
    [HttpGet("due")]
    public async Task<ActionResult<IReadOnlyList<ReviewCardResponse>>> GetDue(CancellationToken ct)
    {
        var userId = GetUserId();
        var now = DateTime.UtcNow;

        var cards = await db.ReviewCards
            .Include(c => c.VocabEntry)
            .Where(c => c.UserId == userId && c.NextReviewDate <= now)
            .OrderBy(c => c.NextReviewDate)
            .ToListAsync(ct);

        return Ok(cards.Select(MapToResponse).ToList());
    }

    /// <summary>Submit a review result; updates the card's SM-2 scheduling.</summary>
    [HttpPost("submit")]
    public async Task<ActionResult<ReviewCardResponse>> Submit(
        [FromBody] ReviewSubmitRequest request,
        CancellationToken ct)
    {
        if (request.Quality is not (1 or 3 or 4 or 5))
            return BadRequest("Quality must be 1, 3, 4, or 5.");

        var userId = GetUserId();
        var card = await db.ReviewCards
            .Include(c => c.VocabEntry)
            .FirstOrDefaultAsync(c => c.Id == request.ReviewCardId && c.UserId == userId, ct);

        if (card is null) return NotFound();

        var prevInterval = card.Interval;
        var prevEase = card.EaseFactor;

        srs.ProcessReview(card, request.Quality);

        db.ReviewHistories.Add(new ReviewHistory
        {
            Id = Guid.NewGuid(),
            ReviewCardId = card.Id,
            Quality = request.Quality,
            ReviewedAt = DateTime.UtcNow,
            PreviousInterval = prevInterval,
            NewInterval = card.Interval,
            PreviousEaseFactor = prevEase,
            NewEaseFactor = card.EaseFactor,
        });

        await db.SaveChangesAsync(ct);

        return Ok(MapToResponse(card));
    }

    /// <summary>Returns review stats for the current user.</summary>
    [HttpGet("stats")]
    public async Task<ActionResult<ReviewStatsResponse>> GetStats(CancellationToken ct)
    {
        var userId = GetUserId();
        var now = DateTime.UtcNow;
        var todayStart = now.Date;
        var todayEnd = todayStart.AddDays(1);

        var totalCards = await db.ReviewCards.CountAsync(c => c.UserId == userId, ct);
        var dueToday = await db.ReviewCards.CountAsync(c => c.UserId == userId && c.NextReviewDate <= now, ct);

        var reviewedTodayCardIds = await db.ReviewHistories
            .Where(h => h.ReviewCard.UserId == userId
                     && h.ReviewedAt >= todayStart
                     && h.ReviewedAt < todayEnd)
            .Select(h => h.ReviewCardId)
            .Distinct()
            .CountAsync(ct);

        var streak = await ComputeStreakAsync(userId, ct);

        return Ok(new ReviewStatsResponse(dueToday, reviewedTodayCardIds, totalCards, streak));
    }

    // Counts consecutive calendar days (ending today or yesterday) with at least one review.
    private async Task<int> ComputeStreakAsync(Guid userId, CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date;

        // Get distinct review dates for this user (most recent first)
        var reviewDates = await db.ReviewHistories
            .Where(h => h.ReviewCard.UserId == userId)
            .Select(h => h.ReviewedAt.Date)
            .Distinct()
            .OrderByDescending(d => d)
            .ToListAsync(ct);

        if (reviewDates.Count == 0)
            return 0;

        // Streak is still alive if there was a review today or yesterday
        var streakAnchor = reviewDates[0];
        if (streakAnchor < today.AddDays(-1))
            return 0;

        int streak = 1;
        for (int i = 1; i < reviewDates.Count; i++)
        {
            if (reviewDates[i - 1].AddDays(-1) == reviewDates[i])
                streak++;
            else
                break;
        }

        return streak;
    }

    private static ReviewCardResponse MapToResponse(ReviewCard card) =>
        new(card.Id,
            card.VocabEntryId,
            card.VocabEntry.Word,
            card.VocabEntry.Language,
            card.EaseFactor,
            card.Interval,
            card.Repetitions,
            card.NextReviewDate,
            card.LastReviewedAt);

    private static WordListItemResponse MapToWordListItem(ReviewCard card)
    {
        var firstMeaning = card.VocabEntry.DictionaryData?.Meanings
            .OrderBy(m => m.SortOrder)
            .FirstOrDefault();

        return new WordListItemResponse(
            card.Id,
            card.VocabEntryId,
            card.VocabEntry.Word,
            card.VocabEntry.Language,
            card.VocabEntry.DictionaryData?.PhoneticText,
            firstMeaning?.Definition,
            firstMeaning?.PartOfSpeech,
            card.VocabEntry.CustomDefinition,
            card.EaseFactor,
            card.Interval,
            card.Repetitions,
            card.NextReviewDate,
            card.LastReviewedAt,
            card.VocabEntry.CreatedAt);
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? throw new InvalidOperationException("User ID not found in token"));
}
