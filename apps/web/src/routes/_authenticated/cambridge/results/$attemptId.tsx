import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type {
  CambridgeExerciseContent,
  CambridgeExerciseType,
  StructuredFeedback,
  WritingFeedback,
} from "@vocabapp/shared";
import { useAttempt } from "../../../../api/cambridge";

// ─── Utility ─────────────────────────────────────────────────────────────────

const parseJson = <T,>(json: string | null | undefined): T | null => {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
};

const scoreToBand = (score: number): { band: string; color: string } => {
  if (score >= 0.9) return { band: "Exceptional", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (score >= 0.75) return { band: "Good", color: "text-green-700 bg-green-50 border-green-200" };
  if (score >= 0.6) return { band: "Satisfactory", color: "text-blue-700 bg-blue-50 border-blue-200" };
  if (score >= 0.4) return { band: "Needs Work", color: "text-amber-700 bg-amber-50 border-amber-200" };
  return { band: "Keep Practising", color: "text-red-700 bg-red-50 border-red-200" };
};

const criterionLabel: Record<string, string> = {
  content: "Content",
  communicativeAchievement: "Communicative Achievement",
  organisation: "Organisation",
  language: "Language",
};

// ─── Components ──────────────────────────────────────────────────────────────

const ScoreCircle = ({ score }: { score: number }) => {
  const pct = Math.round(score * 100);
  const { band, color } = scoreToBand(score);
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center ${color} mb-2`}
      >
        <span className="text-3xl font-bold">{pct}%</span>
      </div>
      <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${color}`}>
        {band}
      </span>
    </div>
  );
};

const WritingResults = ({ feedback }: { feedback: WritingFeedback }) => (
  <div className="space-y-4">
    {(["content", "communicativeAchievement", "organisation", "language"] as const).map((key) => {
      const item = feedback[key];
      return (
        <div key={key} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm text-gray-800">{criterionLabel[key]}</span>
            <span className="text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              {item.score}/5
            </span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{item.feedback}</p>
        </div>
      );
    })}

    {feedback.overallFeedback && (
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-1">Overall Feedback</p>
        <p className="text-sm text-gray-800 leading-relaxed">{feedback.overallFeedback}</p>
      </div>
    )}

    {feedback.modelAnswer && (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Model Answer Excerpt</p>
        <p className="text-sm text-gray-700 italic leading-relaxed">"{feedback.modelAnswer}"</p>
      </div>
    )}
  </div>
);

// For MultipleChoiceCloze, options are "A: word" — resolve letter to full option string
const resolveOption = (options: string[] | null | undefined, letter: string): string => {
  if (!options || !letter) return letter || "(blank)";
  const found = options.find((o) => o.split(":")[0].trim().toUpperCase() === letter.trim().toUpperCase());
  return found ?? letter;
};

const StructuredResults = ({
  feedback,
  content,
  exerciseType,
  userAnswerJson,
}: {
  feedback: StructuredFeedback;
  content: CambridgeExerciseContent;
  exerciseType: CambridgeExerciseType;
  userAnswerJson: string;
}) => {
  const isKwt = exerciseType === "KeyWordTransformations";
  const isReading =
    exerciseType === "MultipleChoice" ||
    exerciseType === "GappedText" ||
    exerciseType === "MultipleMatching";

  return (
    <div className="space-y-3">
      {/* Passage(s) for reading exercises */}
      {isReading && content.passages && (
        <div className="space-y-3 mb-4">
          {content.passages.map((p) => (
            <details key={p.id} className="bg-gray-50 border border-gray-200 rounded-xl">
              <summary className="px-4 py-3 cursor-pointer text-sm font-semibold text-gray-700 select-none">
                {p.id}: {p.title}
              </summary>
              <div className="px-4 pb-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap border-t border-gray-100 mt-1 pt-3">
                {p.text}
              </div>
            </details>
          ))}
          {content.removedSentences && (
            <div className="grid grid-cols-1 gap-2">
              {content.removedSentences.map((s) => (
                <div key={s.id} className="flex gap-2 bg-white border border-gray-200 rounded-lg p-3">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {s.id}
                  </span>
                  <p className="text-sm text-gray-700">{s.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KWT: show original + your transformation */}
      {isKwt && content.sentences && (
        <div className="space-y-3">
          {content.sentences.map((sentence) => {
            const item = feedback.items.find((it) => it.number === sentence.number);
            return (
              <div
                key={sentence.number}
                className={`rounded-xl border p-4 ${item?.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
              >
                <p className="text-sm text-gray-700 mb-1">{sentence.originalSentence}</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded uppercase">
                    {sentence.keyword}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="font-medium text-gray-600">Your answer: </span>
                    <span className={item?.isCorrect ? "text-green-700 font-semibold" : "text-red-700"}>
                      {item?.userAnswer || "(no answer)"}
                    </span>
                  </p>
                  {!item?.isCorrect && (
                    <p>
                      <span className="font-medium text-gray-600">Correct: </span>
                      <span className="text-green-700 font-semibold">{item?.correctAnswer}</span>
                    </p>
                  )}
                  {item?.explanation && (
                    <p className="text-xs text-gray-500 italic">{item.explanation}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cloze: reconstructed passage */}
      {!isKwt && !isReading && content.text && content.blanks && (
        <div>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 leading-9 text-gray-800 mb-4">
            {content.text.split(/(\[BLANK_\d+\])/g).map((part, i) => {
              const match = part.match(/\[BLANK_(\d+)\]/);
              if (!match) return <span key={i}>{part}</span>;
              const num = parseInt(match[1]);
              const item = feedback.items.find((it) => it.number === num);
              const correct = item?.isCorrect;
              const blank = content.blanks?.find((b) => b.number === num);
              const isMcc = exerciseType === "MultipleChoiceCloze";
              const userDisplay = isMcc
                ? resolveOption(blank?.options, item?.userAnswer ?? "")
                : (item?.userAnswer || "_");
              const correctDisplay = isMcc
                ? resolveOption(blank?.options, item?.correctAnswer ?? "")
                : item?.correctAnswer;
              return (
                <span
                  key={i}
                  className={`inline-block mx-1 px-2 py-0.5 rounded font-semibold text-sm border ${
                    correct
                      ? "bg-green-100 border-green-300 text-green-800"
                      : "bg-red-100 border-red-300 text-red-800"
                  }`}
                  title={correct ? "Correct" : `Correct: ${correctDisplay}`}
                >
                  {userDisplay}{" "}
                  {!correct && (
                    <span className="text-xs font-normal text-green-700">→ {correctDisplay}</span>
                  )}
                </span>
              );
            })}
          </div>

          <div className="space-y-2">
            {feedback.items.map((item) => {
              const isMcc = exerciseType === "MultipleChoiceCloze";
              const blank = isMcc ? content.blanks?.find((b) => b.number === item.number) : null;
              const userDisplay = isMcc
                ? resolveOption(blank?.options, item.userAnswer)
                : (item.userAnswer || "(blank)");
              const correctDisplay = isMcc
                ? resolveOption(blank?.options, item.correctAnswer)
                : item.correctAnswer;
              return (
                <div
                  key={item.number}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${
                    item.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                    item.isCorrect ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                  }`}>
                    {item.number}
                  </span>
                  <div className="text-sm">
                    <span className="font-medium">{item.isCorrect ? "✓" : "✗"} </span>
                    Your: <strong>{userDisplay}</strong>
                    {!item.isCorrect && (
                      <> → Correct: <strong className="text-green-700">{correctDisplay}</strong></>
                    )}
                    {item.baseWord && (
                      <span className="ml-2 text-xs text-indigo-600 uppercase">[{item.baseWord}]</span>
                    )}
                    {item.explanation && (
                      <p className="text-xs text-gray-500 italic mt-0.5">{item.explanation}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reading: per-question breakdown */}
      {isReading && content.questions && (
        <div className="space-y-2">
          {content.questions.map((q) => {
            const item = feedback.items.find((it) => it.number === q.number);
            return (
              <div
                key={q.number}
                className={`p-4 rounded-xl border ${
                  item?.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex gap-2 mb-1">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                    item?.isCorrect ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                  }`}>
                    {q.number}
                  </span>
                  <p className="text-sm font-medium text-gray-800">{q.text}</p>
                </div>
                <div className="ml-8 text-sm space-y-0.5">
                  <p>
                    <span className="text-gray-600">Your answer: </span>
                    <strong className={item?.isCorrect ? "text-green-700" : "text-red-700"}>
                      {item?.userAnswer || "(no answer)"}
                    </strong>
                  </p>
                  {!item?.isCorrect && (
                    <p>
                      <span className="text-gray-600">Correct: </span>
                      <strong className="text-green-700">{item?.correctAnswer ?? q.correctAnswer}</strong>
                    </p>
                  )}
                  {item?.explanation && (
                    <p className="text-xs text-gray-500 italic">{item.explanation}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Show the user's writing answer if a writing exercise somehow ended up here */}
      {exerciseType !== "KeyWordTransformations" && !content.blanks && !content.questions && userAnswerJson && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Your response</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{userAnswerJson}</p>
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const ResultsPage = () => {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  const { data: attempt, isLoading, isError } = useAttempt(attemptId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Loading results…</p>
      </div>
    );
  }

  if (isError || !attempt) {
    return (
      <div className="text-red-500">
        Failed to load results.{" "}
        <button onClick={() => navigate({ to: "/cambridge" })} className="underline">
          Go back
        </button>
      </div>
    );
  }

  const exerciseType = attempt.exerciseType as CambridgeExerciseType;
  const isWriting = ["Essay", "Article", "Letter", "Report", "Review", "Proposal"].includes(exerciseType);

  const content = parseJson<CambridgeExerciseContent>(attempt.contentJson);
  const writingFeedback = isWriting ? parseJson<WritingFeedback>(attempt.feedbackJson) : null;
  const structuredFeedback = !isWriting ? parseJson<StructuredFeedback>(attempt.feedbackJson) : null;

  const levelLabel: Record<string, string> = {
    B2First: "B2 First",
    C1Advanced: "C1 Advanced",
    C2Proficiency: "C2 Proficiency",
  };

  const timeLabel =
    attempt.timeSpentSeconds
      ? attempt.timeSpentSeconds < 60
        ? `${attempt.timeSpentSeconds}s`
        : `${Math.floor(attempt.timeSpentSeconds / 60)}m ${attempt.timeSpentSeconds % 60}s`
      : null;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate({ to: "/cambridge" })}
          className="text-sm text-indigo-600 hover:underline mb-3 inline-block"
        >
          ← Cambridge Practice
        </button>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-gray-900">Results</h1>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
            {exerciseType.replace(/([A-Z])/g, " $1").trim()} · {levelLabel[attempt.level] ?? attempt.level}
          </span>
          {timeLabel && (
            <span className="text-xs text-gray-400">⏱ {timeLabel}</span>
          )}
        </div>
      </div>

      {/* Score */}
      {attempt.score !== null && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 flex flex-col items-center gap-4">
          <ScoreCircle score={attempt.score} />
          {!isWriting && structuredFeedback && (
            <p className="text-sm text-gray-500">
              {structuredFeedback.correct} / {structuredFeedback.total} correct
            </p>
          )}
        </div>
      )}

      {/* Detailed feedback */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Detailed Feedback
        </h2>
        {isWriting && writingFeedback ? (
          <WritingResults feedback={writingFeedback} />
        ) : !isWriting && structuredFeedback && content ? (
          <StructuredResults
            feedback={structuredFeedback}
            content={content}
            exerciseType={exerciseType}
            userAnswerJson={attempt.answerJson}
          />
        ) : (
          <div className="text-gray-400 text-sm">No feedback available.</div>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate({ to: "/cambridge" })}
        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
      >
        Try Another Exercise →
      </button>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/cambridge/results/$attemptId")({
  component: ResultsPage,
});
