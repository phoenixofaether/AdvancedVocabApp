using System.Security.Claims;
using System.Text.Json;
using AdvancedVocabApp.Core.DTOs;
using AdvancedVocabApp.Core.Entities;
using AdvancedVocabApp.Core.Interfaces;
using AdvancedVocabApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AdvancedVocabApp.Api.Controllers;

[ApiController]
[Route("api/cambridge")]
[Authorize]
public class CambridgeController(AppDbContext db, IExerciseGenerationService exerciseService) : ControllerBase
{
    private static readonly HashSet<string> WritingTypes =
        ["Essay", "Article", "Letter", "Report", "Review", "Proposal"];

    private static readonly ExerciseTypeInfo[] ExerciseTypes =
    [
        new("OpenCloze", "Use of English", "Open Cloze", "Fill in 8 missing words in a passage (grammar & collocation focus).", ["B2First", "C1Advanced", "C2Proficiency"]),
        new("MultipleChoiceCloze", "Use of English", "Multiple Choice Cloze", "Choose the correct word from 4 options for 8 gaps (vocabulary focus).", ["B2First", "C1Advanced"]),
        new("WordFormation", "Use of English", "Word Formation", "Change the form of a given word to fill 8 gaps (prefixes/suffixes).", ["B2First", "C1Advanced", "C2Proficiency"]),
        new("KeyWordTransformations", "Use of English", "Key Word Transformations", "Rewrite 6 sentences using a given keyword with the same meaning.", ["B2First", "C1Advanced", "C2Proficiency"]),
        new("MultipleChoice", "Reading", "Multiple Choice", "Read a passage and answer 6 multiple-choice comprehension questions.", ["B2First", "C1Advanced", "C2Proficiency"]),
        new("GappedText", "Reading", "Gapped Text", "Restore 6 removed sentences to their correct positions in an article.", ["B2First", "C1Advanced", "C2Proficiency"]),
        new("MultipleMatching", "Reading", "Multiple Matching", "Match 10 questions to 4 short texts on the same topic.", ["B2First", "C1Advanced", "C2Proficiency"]),
        new("Essay", "Writing", "Essay", "Write a discursive or argumentative essay addressing given content points.", ["B2First", "C1Advanced", "C2Proficiency"]),
        new("Article", "Writing", "Article", "Write an engaging article for a magazine or website.", ["B2First", "C1Advanced", "C2Proficiency"]),
        new("Letter", "Writing", "Letter / Email", "Write a formal or informal letter or email.", ["B2First", "C1Advanced", "C2Proficiency"]),
        new("Report", "Writing", "Report", "Write a formal report with findings and recommendations.", ["B2First", "C1Advanced", "C2Proficiency"]),
        new("Review", "Writing", "Review", "Write a review of a book, film, restaurant, or other experience.", ["B2First", "C1Advanced", "C2Proficiency"]),
        new("Proposal", "Writing", "Proposal", "Write a formal proposal aimed at persuading a decision-maker.", ["C1Advanced", "C2Proficiency"]),
    ];

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("exercise-types")]
    public IActionResult GetExerciseTypes() => Ok(ExerciseTypes);

    [HttpPost("exercises")]
    public async Task<IActionResult> GenerateExercise(
        [FromBody] GenerateExerciseRequest request,
        CancellationToken ct)
    {
        if (!IsValidLevel(request.Level))
            return BadRequest(new { error = $"Invalid level: {request.Level}" });

        var typeInfo = ExerciseTypes.FirstOrDefault(t => t.Type == request.ExerciseType);
        if (typeInfo == null)
            return BadRequest(new { error = $"Invalid exercise type: {request.ExerciseType}" });

        if (!typeInfo.AvailableLevels.Contains(request.Level))
            return BadRequest(new { error = $"{request.ExerciseType} is not available at {request.Level} level." });

        var userId = UserId;
        var skillProfile = await db.CambridgeSkillProfiles
            .Where(p => p.UserId == userId)
            .ToListAsync(ct);

        var exercise = await exerciseService.GenerateExerciseAsync(
            userId, request.Level, request.ExerciseType, skillProfile, ct);

        db.CambridgeExercises.Add(exercise);
        await db.SaveChangesAsync(ct);

        return Ok(ToExerciseResponse(exercise, includeAnswers: false));
    }

    [HttpGet("exercises/{id:guid}")]
    public async Task<IActionResult> GetExercise(Guid id, CancellationToken ct)
    {
        var userId = UserId;
        var exercise = await db.CambridgeExercises
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId, ct);

        if (exercise == null)
            return NotFound();

        // Only include answers if the user has already submitted an attempt
        var hasAttempt = await db.CambridgeExerciseAttempts
            .AnyAsync(a => a.ExerciseId == id && a.UserId == userId, ct);

        return Ok(ToExerciseResponse(exercise, includeAnswers: hasAttempt));
    }

    [HttpPost("attempts")]
    public async Task<IActionResult> SubmitAttempt(
        [FromBody] SubmitAttemptRequest request,
        CancellationToken ct)
    {
        var userId = UserId;
        var exercise = await db.CambridgeExercises
            .FirstOrDefaultAsync(e => e.Id == request.ExerciseId && e.UserId == userId, ct);

        if (exercise == null)
            return NotFound();

        // Prevent re-attempt
        var existing = await db.CambridgeExerciseAttempts
            .AnyAsync(a => a.ExerciseId == request.ExerciseId && a.UserId == userId, ct);
        if (existing)
            return Conflict(new { error = "You have already submitted an attempt for this exercise." });

        double? score;
        string? feedbackJson;

        if (WritingTypes.Contains(exercise.ExerciseType))
        {
            var (s, f) = await exerciseService.EvaluateWritingAsync(
                exercise.ContentJson, request.AnswerJson, exercise.Level, ct);
            score = s;
            feedbackJson = f;
        }
        else
        {
            (score, feedbackJson) = GradeStructuredExercise(exercise.ContentJson, request.AnswerJson, exercise.ExerciseType);
        }

        var attempt = new CambridgeExerciseAttempt
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ExerciseId = request.ExerciseId,
            AnswerJson = request.AnswerJson,
            Score = score,
            FeedbackJson = feedbackJson,
            TimeSpentSeconds = request.TimeSpentSeconds,
            SubmittedAt = DateTime.UtcNow,
        };

        db.CambridgeExerciseAttempts.Add(attempt);

        // Upsert skill profile
        await UpsertSkillProfileAsync(userId, exercise.Level, exercise.ExerciseType, score ?? 0.0, ct);

        await db.SaveChangesAsync(ct);

        return Ok(new AttemptResponse(
            attempt.Id,
            attempt.ExerciseId,
            exercise.Level,
            exercise.ExerciseType,
            attempt.AnswerJson,
            exercise.ContentJson,  // full content with answers included in result
            attempt.Score,
            attempt.FeedbackJson,
            attempt.TimeSpentSeconds,
            attempt.SubmittedAt));
    }

    [HttpGet("attempts/{id:guid}")]
    public async Task<IActionResult> GetAttempt(Guid id, CancellationToken ct)
    {
        var userId = UserId;
        var attempt = await db.CambridgeExerciseAttempts
            .Include(a => a.Exercise)
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, ct);

        if (attempt == null)
            return NotFound();

        return Ok(new AttemptResponse(
            attempt.Id,
            attempt.ExerciseId,
            attempt.Exercise.Level,
            attempt.Exercise.ExerciseType,
            attempt.AnswerJson,
            attempt.Exercise.ContentJson,
            attempt.Score,
            attempt.FeedbackJson,
            attempt.TimeSpentSeconds,
            attempt.SubmittedAt));
    }

    [HttpGet("skill-profile")]
    public async Task<IActionResult> GetSkillProfile(CancellationToken ct)
    {
        var userId = UserId;
        var profiles = await db.CambridgeSkillProfiles
            .Where(p => p.UserId == userId)
            .OrderBy(p => p.Level)
            .ThenBy(p => p.ExerciseType)
            .ToListAsync(ct);

        var result = profiles.Select(p => new SkillProfileEntry(
            p.Level, p.ExerciseType, p.AttemptCount, p.AverageScore, p.LastAttemptAt));

        return Ok(result);
    }

    // Auto-grading for structured (non-writing) exercises
    private static (double Score, string FeedbackJson) GradeStructuredExercise(
        string contentJson, string answerJson, string exerciseType)
    {
        try
        {
            using var content = JsonDocument.Parse(contentJson);
            using var answers = JsonDocument.Parse(answerJson);
            var root = content.RootElement;
            var answerRoot = answers.RootElement;

            var feedbackItems = new List<object>();
            int correct = 0;
            int total = 0;

            if (exerciseType == "KeyWordTransformations")
            {
                if (root.TryGetProperty("sentences", out var sentences) &&
                    answerRoot.TryGetProperty("answers", out var userAnswers))
                {
                    foreach (var sentence in sentences.EnumerateArray())
                    {
                        var num = sentence.GetProperty("number").GetInt32();
                        var correctAnswer = sentence.GetProperty("correctAnswer").GetString() ?? "";
                        var explanation = sentence.TryGetProperty("explanation", out var exp) ? exp.GetString() : null;

                        string userAnswer = "";
                        if (userAnswers.TryGetProperty(num.ToString(), out var ua))
                            userAnswer = ua.GetString() ?? "";

                        bool isCorrect = string.Equals(
                            userAnswer.Trim(), correctAnswer.Trim(),
                            StringComparison.OrdinalIgnoreCase);
                        if (isCorrect) correct++;
                        total++;

                        feedbackItems.Add(new
                        {
                            number = num,
                            userAnswer,
                            correctAnswer,
                            isCorrect,
                            explanation
                        });
                    }
                }
            }
            else if (exerciseType is "MultipleChoice" or "GappedText" or "MultipleMatching")
            {
                if (root.TryGetProperty("questions", out var questions) &&
                    answerRoot.TryGetProperty("answers", out var userAnswers))
                {
                    foreach (var question in questions.EnumerateArray())
                    {
                        var num = question.GetProperty("number").GetInt32();
                        var correctAnswer = question.GetProperty("correctAnswer").GetString() ?? "";
                        var explanation = question.TryGetProperty("explanation", out var exp) ? exp.GetString() : null;
                        var questionText = question.TryGetProperty("text", out var qt) ? qt.GetString() : "";

                        string userAnswer = "";
                        if (userAnswers.TryGetProperty(num.ToString(), out var ua))
                            userAnswer = ua.GetString() ?? "";

                        bool isCorrect = string.Equals(
                            userAnswer.Trim(), correctAnswer.Trim(),
                            StringComparison.OrdinalIgnoreCase);
                        if (isCorrect) correct++;
                        total++;

                        feedbackItems.Add(new
                        {
                            number = num,
                            questionText,
                            userAnswer,
                            correctAnswer,
                            isCorrect,
                            explanation
                        });
                    }
                }
            }
            else
            {
                // OpenCloze, MultipleChoiceCloze, WordFormation
                if (root.TryGetProperty("blanks", out var blanks) &&
                    answerRoot.TryGetProperty("answers", out var userAnswers))
                {
                    foreach (var blank in blanks.EnumerateArray())
                    {
                        var num = blank.GetProperty("number").GetInt32();
                        var correctAnswer = blank.GetProperty("correctAnswer").GetString() ?? "";
                        var explanation = blank.TryGetProperty("explanation", out var exp) ? exp.GetString() : null;
                        var baseWord = blank.TryGetProperty("baseWord", out var bw) && bw.ValueKind != JsonValueKind.Null
                            ? bw.GetString() : null;

                        string userAnswer = "";
                        if (userAnswers.TryGetProperty(num.ToString(), out var ua))
                            userAnswer = ua.GetString() ?? "";

                        bool isCorrect = string.Equals(
                            userAnswer.Trim(), correctAnswer.Trim(),
                            StringComparison.OrdinalIgnoreCase);
                        if (isCorrect) correct++;
                        total++;

                        feedbackItems.Add(new
                        {
                            number = num,
                            userAnswer,
                            correctAnswer,
                            baseWord,
                            isCorrect,
                            explanation
                        });
                    }
                }
            }

            double score = total > 0 ? (double)correct / total : 0.0;
            var feedbackJson = JsonSerializer.Serialize(new { correct, total, items = feedbackItems });
            return (score, feedbackJson);
        }
        catch
        {
            return (0.0, JsonSerializer.Serialize(new { error = "Could not grade exercise." }));
        }
    }

    private async Task UpsertSkillProfileAsync(
        Guid userId, string level, string exerciseType, double score, CancellationToken ct)
    {
        var profile = await db.CambridgeSkillProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId && p.Level == level && p.ExerciseType == exerciseType, ct);

        if (profile == null)
        {
            db.CambridgeSkillProfiles.Add(new CambridgeSkillProfile
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Level = level,
                ExerciseType = exerciseType,
                AttemptCount = 1,
                AverageScore = score,
                LastAttemptAt = DateTime.UtcNow,
            });
        }
        else
        {
            // Running average
            profile.AverageScore = (profile.AverageScore * profile.AttemptCount + score) / (profile.AttemptCount + 1);
            profile.AttemptCount++;
            profile.LastAttemptAt = DateTime.UtcNow;
        }
    }

    private static ExerciseResponse ToExerciseResponse(CambridgeExercise exercise, bool includeAnswers)
    {
        var contentJson = includeAnswers
            ? exercise.ContentJson
            : StripAnswers(exercise.ContentJson, exercise.ExerciseType);

        return new ExerciseResponse(exercise.Id, exercise.Level, exercise.ExerciseType, contentJson, exercise.GeneratedAt);
    }

    private static string StripAnswers(string contentJson, string exerciseType)
    {
        try
        {
            using var doc = JsonDocument.Parse(contentJson);
            var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(contentJson) ?? [];

            if (exerciseType == "KeyWordTransformations" && dict.TryGetValue("sentences", out var sentences))
            {
                var cleaned = JsonSerializer.Deserialize<List<Dictionary<string, JsonElement>>>(sentences.GetRawText()) ?? [];
                foreach (var s in cleaned)
                    s.Remove("correctAnswer");
                dict["sentences"] = JsonSerializer.SerializeToElement(cleaned);
            }
            else if (dict.TryGetValue("blanks", out var blanks) && blanks.ValueKind == JsonValueKind.Array)
            {
                var cleaned = JsonSerializer.Deserialize<List<Dictionary<string, JsonElement>>>(blanks.GetRawText()) ?? [];
                foreach (var b in cleaned)
                    b.Remove("correctAnswer");
                dict["blanks"] = JsonSerializer.SerializeToElement(cleaned);
            }
            else if (dict.TryGetValue("questions", out var questions) && questions.ValueKind == JsonValueKind.Array)
            {
                var cleaned = JsonSerializer.Deserialize<List<Dictionary<string, JsonElement>>>(questions.GetRawText()) ?? [];
                foreach (var q in cleaned)
                {
                    q.Remove("correctAnswer");
                    q.Remove("explanation");
                }
                dict["questions"] = JsonSerializer.SerializeToElement(cleaned);
            }

            return JsonSerializer.Serialize(dict);
        }
        catch
        {
            return contentJson;
        }
    }

    private static bool IsValidLevel(string level) =>
        level is "B2First" or "C1Advanced" or "C2Proficiency";
}
