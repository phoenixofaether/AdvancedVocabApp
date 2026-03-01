namespace AdvancedVocabApp.Core.DTOs;

public record GoogleAuthRequest(string IdToken, string? DeviceInfo = null);

public record RefreshRequest(string RefreshToken);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    UserProfileResponse User);

public record UserProfileResponse(
    Guid Id,
    string Email,
    string DisplayName,
    string? VoicePreference,
    string PreferredLanguage);

public record UpdateUserRequest(
    string? VoicePreference = null,
    string? PreferredLanguage = null);
