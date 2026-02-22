using System.Security.Claims;
using AdvancedVocabApp.Core.Entities;

namespace AdvancedVocabApp.Core.Interfaces;

public interface ITokenService
{
    string GenerateAccessToken(ApplicationUser user);
    string GenerateRefreshToken();
    ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
}
