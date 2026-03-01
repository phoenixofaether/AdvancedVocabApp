using System.IdentityModel.Tokens.Jwt;
using AdvancedVocabApp.Core.DTOs;
using AdvancedVocabApp.Core.Entities;
using AdvancedVocabApp.Core.Interfaces;
using AdvancedVocabApp.Infrastructure.Data;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AdvancedVocabApp.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    ITokenService tokenService,
    AppDbContext db,
    IConfiguration configuration) : ControllerBase
{
    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> GoogleLogin(
        [FromBody] GoogleAuthRequest request,
        CancellationToken ct)
    {
        GoogleJsonWebSignature.Payload payload;
        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = [configuration["Google:ClientId"]!]
            };
            payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, settings);
        }
        catch
        {
            return Unauthorized(new { message = "Invalid Google ID token." });
        }

        // Find or create user
        var user = await userManager.FindByEmailAsync(payload.Email);
        if (user is null)
        {
            user = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                Email = payload.Email,
                UserName = payload.Email,
                DisplayName = payload.Name ?? payload.Email.Split('@')[0],
                EmailConfirmed = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            var createResult = await userManager.CreateAsync(user);
            if (!createResult.Succeeded)
                return BadRequest(new { message = "Failed to create user account." });
        }

        return Ok(await IssueTokensAsync(user, request.DeviceInfo, ct));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(
        [FromBody] RefreshRequest request,
        CancellationToken ct)
    {
        var storedToken = await db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == request.RefreshToken, ct);

        if (storedToken is null || !storedToken.IsActive)
            return Unauthorized(new { message = "Invalid or expired refresh token." });

        // Rotate the token
        var newRefreshToken = tokenService.GenerateRefreshToken();
        var newTokenEntity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = storedToken.UserId,
            Token = newRefreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(
                int.Parse(configuration["Jwt:RefreshTokenExpirationDays"] ?? "30")),
            CreatedAt = DateTime.UtcNow,
            DeviceInfo = storedToken.DeviceInfo,
        };

        storedToken.RevokedAt = DateTime.UtcNow;
        storedToken.ReplacedByTokenId = newTokenEntity.Id;

        db.RefreshTokens.Add(newTokenEntity);
        await db.SaveChangesAsync(ct);

        var accessToken = tokenService.GenerateAccessToken(storedToken.User);
        return Ok(new AuthResponse(
            accessToken,
            newRefreshToken,
            MapToProfile(storedToken.User)));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(
        [FromBody] RefreshRequest request,
        CancellationToken ct)
    {
        var userId = GetUserId();
        var storedToken = await db.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == request.RefreshToken && t.UserId == userId, ct);

        if (storedToken is not null && storedToken.IsActive)
        {
            storedToken.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }

        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileResponse>> GetMe(CancellationToken ct)
    {
        var userId = GetUserId();
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null) return NotFound();
        return Ok(MapToProfile(user));
    }

    [Authorize]
    [HttpPut("/api/users/me")]
    public async Task<ActionResult<UserProfileResponse>> UpdateMe(
        [FromBody] UpdateUserRequest request,
        CancellationToken ct)
    {
        var userId = GetUserId();
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null) return NotFound();

        if (request.VoicePreference is not null)
            user.VoicePreference = request.VoicePreference;
        if (request.PreferredLanguage is not null)
            user.PreferredLanguage = request.PreferredLanguage;

        user.UpdatedAt = DateTime.UtcNow;
        await userManager.UpdateAsync(user);

        return Ok(MapToProfile(user));
    }

    private async Task<AuthResponse> IssueTokensAsync(
        ApplicationUser user,
        string? deviceInfo,
        CancellationToken ct)
    {
        var accessToken = tokenService.GenerateAccessToken(user);
        var refreshTokenStr = tokenService.GenerateRefreshToken();

        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = refreshTokenStr,
            ExpiresAt = DateTime.UtcNow.AddDays(
                int.Parse(configuration["Jwt:RefreshTokenExpirationDays"] ?? "30")),
            CreatedAt = DateTime.UtcNow,
            DeviceInfo = deviceInfo,
        };

        db.RefreshTokens.Add(refreshToken);
        await db.SaveChangesAsync(ct);

        return new AuthResponse(accessToken, refreshTokenStr, MapToProfile(user));
    }

    private static UserProfileResponse MapToProfile(ApplicationUser user) =>
        new(user.Id, user.Email!, user.DisplayName, user.VoicePreference, user.PreferredLanguage);

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? throw new InvalidOperationException("User ID not found in token"));
}
