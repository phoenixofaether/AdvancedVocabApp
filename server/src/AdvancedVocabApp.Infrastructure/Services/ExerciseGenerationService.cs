using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using AdvancedVocabApp.Core.Entities;
using AdvancedVocabApp.Core.Interfaces;
using Microsoft.Extensions.Configuration;

namespace AdvancedVocabApp.Infrastructure.Services;

public class ExerciseGenerationService(HttpClient httpClient, IConfiguration configuration) : IExerciseGenerationService
{
    private static readonly HashSet<string> WritingTypes =
    [
        "Essay", "Article", "Letter", "Report", "Review", "Proposal"
    ];

    private readonly string _apiKey = configuration["GoogleCloud:GeminiApiKey"]
        ?? throw new InvalidOperationException("GoogleCloud:GeminiApiKey is not configured.");

    private readonly string _model = configuration["GoogleCloud:GeminiModel"]
        ?? throw new InvalidOperationException("GoogleCloud:GeminiModel is not configured.");

    // ─── Response schemas ────────────────────────────────────────────────────
    // Gemini enforces these schemas exactly — no malformed JSON can come back.

    private static readonly JsonElement ClozeSchema = JsonDocument.Parse("""
        {
          "type": "object",
          "properties": {
            "instructions": { "type": "string", "description": "Exam-style instructions shown to the student." },
            "text": { "type": "string", "description": "The passage with [BLANK_1]…[BLANK_8] placeholders." },
            "blanks": {
              "type": "array",
              "description": "One entry per blank in the passage.",
              "items": {
                "type": "object",
                "properties": {
                  "number":        { "type": "integer", "description": "Matches the placeholder number in the text." },
                  "correctAnswer": { "type": "string",  "description": "The single correct word or phrase." },
                  "options":       { "type": "array", "nullable": true, "items": { "type": "string" }, "description": "A/B/C/D options for MultipleChoiceCloze; null for OpenCloze and WordFormation." },
                  "baseWord":      { "type": "string", "nullable": true, "description": "The capitalised base word for WordFormation; null otherwise." },
                  "explanation":   { "type": "string", "description": "Brief grammatical or lexical reason for the answer." }
                },
                "required": ["number", "correctAnswer", "options", "baseWord", "explanation"]
              }
            }
          },
          "required": ["instructions", "text", "blanks"]
        }
        """).RootElement.Clone();

    private static readonly JsonElement KwtSchema = JsonDocument.Parse("""
        {
          "type": "object",
          "properties": {
            "instructions": { "type": "string" },
            "sentences": {
              "type": "array",
              "description": "Exactly 6 transformation pairs.",
              "items": {
                "type": "object",
                "properties": {
                  "number":           { "type": "integer" },
                  "originalSentence": { "type": "string", "description": "The full original sentence." },
                  "keyword":          { "type": "string", "description": "The keyword in CAPITALS." },
                  "gappedSentence":   { "type": "string", "description": "The second sentence with _____ marking where 2-5 words (including the keyword) go." },
                  "correctAnswer":    { "type": "string", "description": "The 2-5 words that fill the gap, including the keyword." },
                  "explanation":      { "type": "string", "description": "Brief explanation of the grammar/vocabulary point tested." }
                },
                "required": ["number", "originalSentence", "keyword", "gappedSentence", "correctAnswer", "explanation"]
              }
            }
          },
          "required": ["instructions", "sentences"]
        }
        """).RootElement.Clone();

    private static readonly JsonElement ReadingSchema = JsonDocument.Parse("""
        {
          "type": "object",
          "properties": {
            "instructions": { "type": "string" },
            "passages": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id":    { "type": "string", "description": "Single letter label e.g. A, B, C, D or 'main'." },
                  "title": { "type": "string" },
                  "text":  { "type": "string", "description": "Full passage text. For GappedText include [GAP_1]…[GAP_6] placeholders." }
                },
                "required": ["id", "title", "text"]
              }
            },
            "removedSentences": {
              "type": "array",
              "nullable": true,
              "description": "7 sentences (A–G) for GappedText only; null for other reading types.",
              "items": {
                "type": "object",
                "properties": {
                  "id":   { "type": "string" },
                  "text": { "type": "string" }
                },
                "required": ["id", "text"]
              }
            },
            "questions": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "number":        { "type": "integer" },
                  "text":          { "type": "string" },
                  "options":       { "type": "array", "items": { "type": "string" }, "description": "A/B/C/D for MultipleChoice; A/B/C/D/E/F/G for GappedText; A/B/C/D for MultipleMatching." },
                  "correctAnswer": { "type": "string", "description": "The letter of the correct option." },
                  "passageId":     { "type": "string", "nullable": true, "description": "Which passage the question refers to; null for MultipleMatching." },
                  "explanation":   { "type": "string", "description": "Brief justification citing the passage." }
                },
                "required": ["number", "text", "options", "correctAnswer", "passageId", "explanation"]
              }
            }
          },
          "required": ["instructions", "passages", "questions"]
        }
        """).RootElement.Clone();

    private static readonly JsonElement WritingTaskSchema = JsonDocument.Parse("""
        {
          "type": "object",
          "properties": {
            "instructions":      { "type": "string", "description": "One-line instruction telling the student what to write and the word limit." },
            "taskDescription":   { "type": "string", "description": "The full task prompt shown to the student, including any stimulus material, notes or bullet points." },
            "wordLimit":         { "type": "integer", "description": "Target word count (e.g. 220, 240, 260)." },
            "format":            { "type": "string", "description": "One of: essay, article, letter, report, review, proposal." },
            "assessmentCriteria":{ "type": "array", "items": { "type": "string" }, "description": "Always [Content, Communicative Achievement, Organisation, Language]." }
          },
          "required": ["instructions", "taskDescription", "wordLimit", "format", "assessmentCriteria"]
        }
        """).RootElement.Clone();

    private static readonly JsonElement WritingEvalSchema = JsonDocument.Parse("""
        {
          "type": "object",
          "properties": {
            "content":                    { "$ref": "#/$defs/criterion" },
            "communicativeAchievement":   { "$ref": "#/$defs/criterion" },
            "organisation":               { "$ref": "#/$defs/criterion" },
            "language":                   { "$ref": "#/$defs/criterion" },
            "overallFeedback": { "type": "string", "description": "2-3 sentence summary of main strengths and priority areas to improve." },
            "modelAnswer":     { "type": "string", "description": "A strong 50-80 word excerpt modelling good register, cohesion and vocabulary for this task type." }
          },
          "$defs": {
            "criterion": {
              "type": "object",
              "properties": {
                "score":    { "type": "number", "description": "0–5 Cambridge band score for this criterion." },
                "feedback": { "type": "string", "description": "Specific, actionable feedback for this criterion." }
              },
              "required": ["score", "feedback"]
            }
          },
          "required": ["content", "communicativeAchievement", "organisation", "language", "overallFeedback", "modelAnswer"]
        }
        """).RootElement.Clone();

    // ─── Public interface ────────────────────────────────────────────────────

    public async Task<CambridgeExercise> GenerateExerciseAsync(
        Guid userId,
        string level,
        string exerciseType,
        IReadOnlyList<CambridgeSkillProfile> skillProfile,
        CancellationToken ct = default)
    {
        var prompt = BuildGenerationPrompt(level, exerciseType, skillProfile);
        var schema = GetExerciseSchema(exerciseType);
        var contentJson = await CallGeminiAsync(prompt, schema, ct);

        return new CambridgeExercise
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Level = level,
            ExerciseType = exerciseType,
            ContentJson = contentJson,
            GeneratedAt = DateTime.UtcNow,
        };
    }

    public async Task<(double Score, string FeedbackJson)> EvaluateWritingAsync(
        string taskJson,
        string userAnswer,
        string level,
        CancellationToken ct = default)
    {
        var prompt = BuildEvaluationPrompt(taskJson, userAnswer, level);
        var feedbackJson = await CallGeminiAsync(prompt, WritingEvalSchema, ct);

        try
        {
            using var doc = JsonDocument.Parse(feedbackJson);
            var root = doc.RootElement;
            var criteria = new[] { "content", "communicativeAchievement", "organisation", "language" };
            double total = 0;
            int count = 0;
            foreach (var criterion in criteria)
            {
                if (root.TryGetProperty(criterion, out var val) &&
                    val.TryGetProperty("score", out var score))
                {
                    total += score.GetDouble();
                    count++;
                }
            }
            double normalizedScore = count > 0 ? (total / count) / 5.0 : 0.0;
            return (Math.Clamp(normalizedScore, 0.0, 1.0), feedbackJson);
        }
        catch
        {
            return (0.0, feedbackJson);
        }
    }

    // ─── Core API call ───────────────────────────────────────────────────────

    private async Task<string> CallGeminiAsync(string prompt, JsonElement schema, CancellationToken ct)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={_apiKey}";

        var requestBody = new GeminiRequest(
            Contents: [new GeminiContent("user", [new GeminiPart(prompt)])],
            GenerationConfig: new GeminiGenerationConfig(
                Temperature: 0.7,
                MaxOutputTokens: 4096,
                ResponseMimeType: "application/json",
                ResponseSchema: schema));

        var response = await httpClient.PostAsJsonAsync(url, requestBody, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException(
                $"Gemini API returned {(int)response.StatusCode} {response.StatusCode}. Body: {errorBody}",
                null,
                response.StatusCode);
        }

        var geminiResponse = await response.Content.ReadFromJsonAsync<GeminiResponse>(cancellationToken: ct)
            ?? throw new InvalidOperationException("Empty response from Gemini API.");

        return geminiResponse.Candidates?[0].Content?.Parts?[0].Text
            ?? throw new InvalidOperationException("No text in Gemini response.");
    }

    // ─── Schema selection ────────────────────────────────────────────────────

    private static JsonElement GetExerciseSchema(string exerciseType) => exerciseType switch
    {
        "KeyWordTransformations" => KwtSchema,
        "Essay" or "Article" or "Letter" or "Report" or "Review" or "Proposal" => WritingTaskSchema,
        "MultipleChoice" or "GappedText" or "MultipleMatching" => ReadingSchema,
        _ => ClozeSchema   // OpenCloze, MultipleChoiceCloze, WordFormation
    };

    // ─── Prompt builders ─────────────────────────────────────────────────────

    private static string BuildGenerationPrompt(
        string level, string exerciseType, IReadOnlyList<CambridgeSkillProfile> skillProfile)
    {
        var levelName = LevelDisplayName(level);
        var sb = new StringBuilder();

        sb.AppendLine($"You are an expert Cambridge English exam writer creating a {exerciseType} exercise for the {levelName} exam.");
        sb.AppendLine();
        sb.AppendLine(GetContentInstructions(exerciseType, levelName));

        // Personalisation from skill profile
        var profile = skillProfile.FirstOrDefault(p => p.Level == level && p.ExerciseType == exerciseType);
        if (profile is { AttemptCount: > 0 })
        {
            sb.AppendLine();
            sb.AppendLine($"Personalisation: the student has completed {profile.AttemptCount} previous attempt(s) " +
                          $"with an average score of {profile.AverageScore:P0}.");
            if (profile.AverageScore < 0.5)
                sb.AppendLine("They struggle with this type — keep the topic accessible but maintain the correct level difficulty.");
            else if (profile.AverageScore > 0.8)
                sb.AppendLine("They perform well — push the difficulty: use rarer vocabulary, more complex structures.");
        }

        return sb.ToString();
    }

    private static string GetContentInstructions(string exerciseType, string levelName) => exerciseType switch
    {
        "OpenCloze" => $"""
            Generate an Open Cloze exercise (Cambridge Use of English Part 2) at {levelName} level.
            - Write a 200–250 word passage on an engaging topic (culture, science, society, nature).
            - Remove exactly 8 words and replace each with a [BLANK_N] placeholder.
            - Each gap must test a grammatical or collocational word (preposition, article, auxiliary verb, conjunction, pronoun, linking adverb). Avoid content vocabulary gaps.
            - Ensure exactly one word is correct per gap.
            """,

        "MultipleChoiceCloze" => $"""
            Generate a Multiple Choice Cloze exercise (Cambridge Use of English Part 1) at {levelName} level.
            - Write a 200–250 word passage with exactly 8 gaps marked [BLANK_N].
            - Each gap tests vocabulary knowledge: synonyms, collocations, phrasal verbs, fixed expressions, or idioms.
            - Provide four options (A/B/C/D) per gap; exactly one is correct and the distractors must be plausible.
            - Format each option as "A: word", "B: word", etc. The correctAnswer should be just the letter (e.g. "B").
            """,

        "WordFormation" => $"""
            Generate a Word Formation exercise (Cambridge Use of English Part 3) at {levelName} level.
            - Write a 200–250 word passage with exactly 8 gaps marked [BLANK_N].
            - Each gap requires the student to derive the correct form of the given base word using prefixes/suffixes.
            - The base word is given in CAPITALS. Choose forms that require non-trivial derivation.
            - Include a mix of nouns, verbs, adjectives, and adverbs.
            """,

        "KeyWordTransformations" => $"""
            Generate a Key Word Transformations exercise (Cambridge Use of English Part 4) at {levelName} level.
            - Write exactly 6 sentence pairs.
            - Each pair: an original sentence and a gapped second sentence that means the same thing.
            - The student must use the given keyword (in CAPITALS) plus 1–4 additional words to complete the gap (2–5 words total).
            - Mark the gap with _____ in the gappedSentence field.
            - Test a range of structures: passive voice, reported speech, modal verbs, conditionals, phrasal verbs, comparatives.
            """,

        "MultipleChoice" => $"""
            Generate a Multiple Choice Reading Comprehension exercise (Cambridge Reading Part 1 style) at {levelName} level.
            - Write an original 400–500 word article on a sophisticated topic (science, psychology, culture, environment).
            - Write 6 four-option (A/B/C/D) questions testing: detailed understanding, inference, attitude, reference, vocabulary in context.
            - Format options as "A: text", "B: text" etc. The correctAnswer should be just the letter.
            - Use a single passage with id "A".
            - Set removedSentences to null.
            """,

        "GappedText" => $"""
            Generate a Gapped Text exercise (Cambridge Reading Part 2 style) at {levelName} level.
            - Write an original 400–500 word article with exactly 6 sentences removed, replaced by [GAP_1]…[GAP_6].
            - Provide 7 sentences labelled A–G: 6 that fit the gaps and 1 decoy that does not fit anywhere.
            - Gaps should require understanding of cohesion, reference, and discourse structure.
            - Use a single passage with id "main". Set each question's text to "Gap N" and passageId to "main".
            """,

        "MultipleMatching" => $"""
            Generate a Multiple Matching Reading exercise (Cambridge Reading Part 3 style) at {levelName} level.
            - Write 4 short texts (100–130 words each) by different people on the same topic, labelled A–D.
            - Write 10 questions, each matching to exactly one text. Some texts may match more than one question.
            - Each question asks "Which person/text states/mentions/describes X?" The correctAnswer is the passage id letter.
            - Set removedSentences to null. Set passageId to null for each question.
            """,

        "Essay" => $"""
            Generate a Cambridge {levelName} Writing Essay task.
            - Create a discursive or argumentative essay prompt on a contemporary issue relevant to young adults.
            - Include two stimulus points/notes the student must address, plus space for their own idea.
            - Word limit: {(levelName.Contains("FCE") ? "140–190" : "220–260")} words.
            - Set format to "essay".
            """,

        "Article" => $"""
            Generate a Cambridge {levelName} Writing Article task for a magazine or website.
            - The article should be engaging and semi-formal/informal.
            - Include a clear topic with guidance on what aspects to cover.
            - Word limit: {(levelName.Contains("FCE") ? "140–190" : "220–260")} words.
            - Set format to "article".
            """,

        "Letter" => $"""
            Generate a Cambridge {levelName} Writing Letter or Email task.
            - May be formal (complaint, application, request) or informal (to a friend).
            - Provide sufficient context: who the student is writing to and why.
            - Word limit: {(levelName.Contains("FCE") ? "140–190" : "220–260")} words.
            - Set format to "letter".
            """,

        "Report" => $"""
            Generate a Cambridge {levelName} Writing Report task.
            - The report should be formal with a clear purpose (survey findings, recommendations, evaluation).
            - Specify the intended audience and what the report should cover.
            - Word limit: {(levelName.Contains("FCE") ? "140–190" : "220–260")} words.
            - Set format to "report".
            """,

        "Review" => $"""
            Generate a Cambridge {levelName} Writing Review task.
            - The review could be for a film, book, restaurant, product, or event.
            - The student should describe and evaluate, making a recommendation.
            - Word limit: {(levelName.Contains("FCE") ? "140–190" : "220–260")} words.
            - Set format to "review".
            """,

        "Proposal" => $"""
            Generate a Cambridge {levelName} Writing Proposal task.
            - The proposal should argue persuasively for a specific initiative or project.
            - Specify the organisation/committee receiving it and what it should cover.
            - Word limit: 220–260 words.
            - Set format to "proposal".
            """,

        _ => throw new ArgumentException($"Unknown exercise type: {exerciseType}")
    };

    private static string BuildEvaluationPrompt(string taskJson, string userAnswer, string level)
    {
        var levelName = LevelDisplayName(level);
        return $"""
            You are a Cambridge English examiner assessing a writing response for {levelName}.

            TASK:
            {taskJson}

            STUDENT RESPONSE:
            {userAnswer}

            Evaluate using the four Cambridge criteria, each scored 0–5 (0 = nothing worthy of credit, 5 = exceptional):
            - Content: task fully achieved, all points addressed, appropriate length.
            - Communicative Achievement: register, format, and effect on the target reader.
            - Organisation: structure, paragraphing, cohesive devices, logical flow.
            - Language: grammar accuracy and range, vocabulary range and precision, spelling/punctuation.

            Also write 2-3 sentences of overall feedback highlighting the strongest aspect and the single most important area to improve.
            Provide a short model answer excerpt (50-80 words) demonstrating strong language and register for this task type.
            """;
    }

    private static string LevelDisplayName(string level) => level switch
    {
        "B2First" => "B2 First (FCE)",
        "C1Advanced" => "C1 Advanced (CAE)",
        "C2Proficiency" => "C2 Proficiency (CPE)",
        _ => level
    };

    // ─── Gemini REST API models ──────────────────────────────────────────────

    private sealed record GeminiRequest(
        [property: JsonPropertyName("contents")] IReadOnlyList<GeminiContent> Contents,
        [property: JsonPropertyName("generationConfig")] GeminiGenerationConfig GenerationConfig);

    private sealed record GeminiContent(
        [property: JsonPropertyName("role")] string Role,
        [property: JsonPropertyName("parts")] IReadOnlyList<GeminiPart> Parts);

    private sealed record GeminiPart(
        [property: JsonPropertyName("text")] string Text);

    private sealed record GeminiGenerationConfig(
        [property: JsonPropertyName("temperature")] double Temperature,
        [property: JsonPropertyName("maxOutputTokens")] int MaxOutputTokens,
        [property: JsonPropertyName("responseMimeType")] string ResponseMimeType,
        [property: JsonPropertyName("responseSchema")] JsonElement ResponseSchema);

    private sealed record GeminiResponse(
        [property: JsonPropertyName("candidates")] IReadOnlyList<GeminiCandidate>? Candidates);

    private sealed record GeminiCandidate(
        [property: JsonPropertyName("content")] GeminiContent? Content);
}
