using System.IdentityModel.Tokens.Jwt;
using AdvancedVocabApp.Core.DTOs;
using AdvancedVocabApp.Core.Entities;
using AdvancedVocabApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AdvancedVocabApp.Api.Controllers;

[ApiController]
[Route("api/vocab-sets")]
[Authorize]
public class VocabSetsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<VocabSetResponse>>> GetAll(CancellationToken ct)
    {
        var userId = GetUserId();
        var sets = await db.VocabSets
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.UpdatedAt)
            .Select(s => new VocabSetResponse(
                s.Id, s.Name, s.Description, s.TargetLanguage,
                s.Entries.Count, s.CreatedAt, s.UpdatedAt))
            .ToListAsync(ct);

        return Ok(sets);
    }

    [HttpPost]
    public async Task<ActionResult<VocabSetResponse>> Create(
        [FromBody] CreateVocabSetRequest request,
        CancellationToken ct)
    {
        var userId = GetUserId();
        var set = new VocabSet
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = request.Name,
            Description = request.Description,
            TargetLanguage = request.TargetLanguage,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.VocabSets.Add(set);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = set.Id },
            new VocabSetResponse(set.Id, set.Name, set.Description, set.TargetLanguage, 0, set.CreatedAt, set.UpdatedAt));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<VocabSetResponse>> GetById(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        var set = await db.VocabSets
            .Include(s => s.Entries)
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);

        if (set is null) return NotFound();

        return Ok(new VocabSetResponse(
            set.Id, set.Name, set.Description, set.TargetLanguage,
            set.Entries.Count, set.CreatedAt, set.UpdatedAt));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<VocabSetResponse>> Update(
        Guid id,
        [FromBody] UpdateVocabSetRequest request,
        CancellationToken ct)
    {
        var userId = GetUserId();
        var set = await db.VocabSets.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);
        if (set is null) return NotFound();

        set.Name = request.Name;
        set.Description = request.Description;
        set.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        return Ok(new VocabSetResponse(
            set.Id, set.Name, set.Description, set.TargetLanguage,
            0, set.CreatedAt, set.UpdatedAt));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        var set = await db.VocabSets.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);
        if (set is null) return NotFound();

        db.VocabSets.Remove(set);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/entries")]
    public async Task<IActionResult> AddEntries(
        Guid id,
        [FromBody] AddEntriesToSetRequest request,
        CancellationToken ct)
    {
        var userId = GetUserId();
        var set = await db.VocabSets
            .Include(s => s.Entries)
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);
        if (set is null) return NotFound();

        var currentMax = set.Entries.Any() ? set.Entries.Max(e => e.SortOrder) : 0;

        foreach (var entryId in request.EntryIds)
        {
            if (set.Entries.Any(e => e.VocabEntryId == entryId)) continue;
            db.VocabSetEntries.Add(new VocabSetEntry
            {
                VocabSetId = id,
                VocabEntryId = entryId,
                SortOrder = ++currentMax,
                AddedAt = DateTime.UtcNow,
            });
        }

        set.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}/entries/{entryId:guid}")]
    public async Task<IActionResult> RemoveEntry(Guid id, Guid entryId, CancellationToken ct)
    {
        var userId = GetUserId();
        var set = await db.VocabSets.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct);
        if (set is null) return NotFound();

        var entry = await db.VocabSetEntries
            .FirstOrDefaultAsync(e => e.VocabSetId == id && e.VocabEntryId == entryId, ct);
        if (entry is null) return NotFound();

        db.VocabSetEntries.Remove(entry);
        set.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? throw new InvalidOperationException("User ID not found in token"));
}
