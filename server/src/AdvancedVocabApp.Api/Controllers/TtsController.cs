using AdvancedVocabApp.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AdvancedVocabApp.Api.Controllers;

[ApiController]
[Route("api/tts")]
[Authorize]
public class TtsController(ITextToSpeechService ttsService) : ControllerBase
{
    [HttpGet("voices")]
    public async Task<ActionResult<IReadOnlyList<string>>> GetVoices(
        [FromQuery] string language = "en",
        CancellationToken ct = default)
    {
        var voices = await ttsService.GetAvailableVoicesAsync(language, ct);
        return Ok(voices);
    }
}
