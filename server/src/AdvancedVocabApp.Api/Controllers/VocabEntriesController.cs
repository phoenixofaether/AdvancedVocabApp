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
[Route("api/vocab-entries")]
[Authorize]
public class VocabEntriesController(
    AppDbContext db,
    IDictionaryService dictionaryService,
    ITextToSpeechService ttsService) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<VocabEntryResponse>> GetById(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        var entry = await db.VocabEntries
            .Include(e => e.DictionaryData)
                .ThenInclude(d => d!.Meanings)
            .FirstOrDefaultAsync(e => e.Id == id && e.CreatedByUserId == userId, ct);

        if (entry is null) return NotFound();

        // Lazy-fetch dictionary data if missing (e.g. API was down at creation time)
        if (entry.DictionaryData is null)
        {
            var dictData = await dictionaryService.LookupWordAsync(entry.Word, entry.Language, ct);
            if (dictData is not null)
            {
                entry.DictionaryDataId = dictData.Id;
                entry.DictionaryData = dictData;
                await db.SaveChangesAsync(ct);
            }
        }

        return Ok(MapToResponse(entry));
    }

    [HttpPost]
    public async Task<ActionResult<VocabEntryResponse>> Create(
        [FromBody] CreateVocabEntryRequest request,
        CancellationToken ct)
    {
        var userId = GetUserId();

        var entry = new VocabEntry
        {
            Id = Guid.NewGuid(),
            Word = request.Word.Trim().ToLowerInvariant(),
            Language = request.Language,
            CustomDefinition = request.CustomDefinition,
            CustomPhonetic = request.CustomPhonetic,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow,
        };

        db.VocabEntries.Add(entry);

        // Auto-create a ReviewCard for this user+entry
        db.ReviewCards.Add(new ReviewCard
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            VocabEntryId = entry.Id,
            NextReviewDate = DateTime.UtcNow,
        });

        await db.SaveChangesAsync(ct);

        // Fetch dictionary data (uses cache if already known for this word)
        var dictData = await dictionaryService.LookupWordAsync(entry.Word, entry.Language, ct);
        if (dictData is not null)
        {
            entry.DictionaryDataId = dictData.Id;
            entry.DictionaryData = dictData;
            await db.SaveChangesAsync(ct);
        }

        return CreatedAtAction(nameof(GetById), new { id = entry.Id }, MapToResponse(entry));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<VocabEntryResponse>> Update(
        Guid id,
        [FromBody] CreateVocabEntryRequest request,
        CancellationToken ct)
    {
        var userId = GetUserId();
        var entry = await db.VocabEntries
            .Include(e => e.DictionaryData)
                .ThenInclude(d => d!.Meanings)
            .FirstOrDefaultAsync(e => e.Id == id && e.CreatedByUserId == userId, ct);

        if (entry is null) return NotFound();

        entry.CustomDefinition = request.CustomDefinition;
        entry.CustomPhonetic = request.CustomPhonetic;

        await db.SaveChangesAsync(ct);

        return Ok(MapToResponse(entry));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        var entry = await db.VocabEntries
            .FirstOrDefaultAsync(e => e.Id == id && e.CreatedByUserId == userId, ct);

        if (entry is null) return NotFound();

        db.VocabEntries.Remove(entry);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("{id:guid}/audio")]
    public async Task<ActionResult<AudioUrlResponse>> GetAudio(
        Guid id,
        [FromQuery] string? voice,
        CancellationToken ct)
    {
        var userId = GetUserId();
        var entry = await db.VocabEntries
            .FirstOrDefaultAsync(e => e.Id == id && e.CreatedByUserId == userId, ct);

        if (entry is null) return NotFound();

        var url = await ttsService.GetPronunciationUrlAsync(entry.Word, entry.Language, voice, ct);
        if (url is null) return NotFound("TTS audio is unavailable for this word.");

        return Ok(new AudioUrlResponse(url));
    }

    private static VocabEntryResponse MapToResponse(VocabEntry entry) =>
        new(entry.Id,
            entry.Word,
            entry.Language,
            entry.CustomDefinition,
            entry.CustomPhonetic,
            entry.DictionaryData is null ? null : new DictionaryDataResponse(
                entry.DictionaryData.PhoneticText ?? string.Empty,
                entry.DictionaryData.AudioUrl,
                entry.DictionaryData.Meanings
                    .OrderBy(m => m.SortOrder)
                    .Select(m => new DictionaryMeaningResponse(m.PartOfSpeech, m.Definition, m.Example))
                    .ToList()),
            entry.CreatedAt);

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? throw new InvalidOperationException("User ID not found in token"));
}
