using Microsoft.AspNetCore.Identity;

namespace AdvancedVocabApp.Core.Entities;

public class ApplicationUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
    public string? VoicePreference { get; set; }
    public string PreferredLanguage { get; set; } = "en";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<VocabSet> VocabSets { get; set; } = [];
    public ICollection<ReviewCard> ReviewCards { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
