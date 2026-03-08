import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type {
  CambridgeExerciseContent,
  CambridgeExerciseType,
} from "@vocabapp/shared";
import { useExercise, useSubmitAttempt } from "../../../../api/cambridge";

// ─── Utility ─────────────────────────────────────────────────────────────────

const parseContent = (json: string): CambridgeExerciseContent | null => {
  try {
    return JSON.parse(json) as CambridgeExerciseContent;
  } catch {
    return null;
  }
};

const countWords = (text: string) =>
  text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

// ─── Sub-renderers ────────────────────────────────────────────────────────────

const ClozeExercise = ({
  content,
  answers,
  onAnswer,
  exerciseType,
}: {
  content: CambridgeExerciseContent;
  answers: Record<string, string>;
  onAnswer: (num: number, val: string) => void;
  exerciseType: CambridgeExerciseType;
}) => {
  if (!content.text || !content.blanks) return null;

  const parts = content.text.split(/(\[BLANK_\d+\])/g);

  return (
    <div>
      <p className="text-sm text-gray-600 italic mb-4">{content.instructions}</p>
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 leading-8 text-gray-800 mb-6">
        {parts.map((part, i) => {
          const match = part.match(/\[BLANK_(\d+)\]/);
          if (!match) return <span key={i}>{part}</span>;
          const num = parseInt(match[1]);
          const blank = content.blanks!.find((b) => b.number === num);

          if (exerciseType === "MultipleChoiceCloze" && blank?.options) {
            return (
              <select
                key={i}
                value={answers[num] ?? ""}
                onChange={(e) => onAnswer(num, e.target.value)}
                className="inline-block mx-1 border border-gray-300 rounded-md px-2 py-0.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— {num} —</option>
                {blank.options.map((opt) => (
                  <option key={opt} value={opt.split(":")[0].trim()}>
                    {opt}
                  </option>
                ))}
              </select>
            );
          }

          return (
            <span key={i} className="inline-flex items-center mx-1 gap-1">
              {exerciseType === "WordFormation" && blank?.baseWord && (
                <span className="text-xs font-bold text-indigo-600 uppercase">[{blank.baseWord}]</span>
              )}
              <input
                type="text"
                value={answers[num] ?? ""}
                onChange={(e) => onAnswer(num, e.target.value)}
                placeholder={`${num}`}
                className="border-b-2 border-gray-400 bg-transparent w-24 text-sm text-center focus:outline-none focus:border-indigo-500 py-0.5"
              />
            </span>
          );
        })}
      </div>

      {/* Numbered answer reference */}
      <div className="grid grid-cols-2 gap-2">
        {content.blanks.map((blank) => (
          <div key={blank.number} className="flex items-center gap-2 text-sm">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
              {blank.number}
            </span>
            {exerciseType === "WordFormation" && blank.baseWord && (
              <span className="text-xs font-bold text-indigo-600 uppercase">{blank.baseWord}</span>
            )}
            {exerciseType === "MultipleChoiceCloze" && blank.options ? (
              <span className="text-gray-500">{blank.options.join(" / ")}</span>
            ) : (
              <span className="text-gray-400 text-xs italic">fill in</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const KeyWordTransformationsExercise = ({
  content,
  answers,
  onAnswer,
}: {
  content: CambridgeExerciseContent;
  answers: Record<string, string>;
  onAnswer: (num: number, val: string) => void;
}) => {
  if (!content.sentences) return null;

  return (
    <div>
      <p className="text-sm text-gray-600 italic mb-5">{content.instructions}</p>
      <div className="space-y-6">
        {content.sentences.map((sentence) => (
          <div key={sentence.number} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <div className="flex gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {sentence.number}
              </span>
              <p className="text-gray-800">{sentence.originalSentence}</p>
            </div>
            <div className="flex items-center gap-2 ml-8">
              <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded uppercase">
                {sentence.keyword}
              </span>
            </div>
            <div className="ml-8 mt-3 text-gray-700">
              {sentence.gappedSentence.split("_____").map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <input
                      type="text"
                      value={answers[sentence.number] ?? ""}
                      onChange={(e) => onAnswer(sentence.number, e.target.value)}
                      placeholder="2–5 words"
                      className="border-b-2 border-gray-400 bg-transparent mx-1 w-40 text-sm text-center focus:outline-none focus:border-indigo-500 py-0.5"
                    />
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReadingExercise = ({
  content,
  answers,
  onAnswer,
  exerciseType,
}: {
  content: CambridgeExerciseContent;
  answers: Record<string, string>;
  onAnswer: (num: number, val: string) => void;
  exerciseType: CambridgeExerciseType;
}) => {
  if (!content.passages || !content.questions) return null;

  return (
    <div>
      <p className="text-sm text-gray-600 italic mb-5">{content.instructions}</p>

      {/* Passages */}
      <div className="space-y-4 mb-6">
        {content.passages.map((p) => (
          <div key={p.id} className="bg-gray-50 rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center">
                {p.id}
              </span>
              {p.title && <span className="font-semibold text-gray-800">{p.title}</span>}
            </div>
            <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{p.text}</p>
          </div>
        ))}
      </div>

      {/* Removed sentences for GappedText */}
      {exerciseType === "GappedText" && content.removedSentences && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Removed sentences</h3>
          <div className="grid grid-cols-1 gap-2">
            {content.removedSentences.map((s) => (
              <div key={s.id} className="flex gap-2 items-start bg-white border border-gray-200 rounded-lg p-3">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {s.id}
                </span>
                <p className="text-sm text-gray-700">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {content.questions.map((q) => (
          <div key={q.number} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {q.number}
              </span>
              <p className="text-sm font-medium text-gray-800">{q.text}</p>
            </div>
            <div className="ml-8 space-y-1">
              {q.options.map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name={`q-${q.number}`}
                    value={opt}
                    checked={answers[q.number] === opt}
                    onChange={() => onAnswer(q.number, opt)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-indigo-700 transition-colors">
                    {opt}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const WritingExercise = ({
  content,
  answer,
  onAnswer,
}: {
  content: CambridgeExerciseContent;
  answer: string;
  onAnswer: (val: string) => void;
}) => {
  const wordCount = countWords(answer);
  const limit = content.wordLimit ?? 240;
  const overLimit = wordCount > limit + 10;

  return (
    <div>
      <p className="text-sm text-gray-600 italic mb-4">{content.instructions}</p>

      {content.taskDescription && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-5">
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {content.taskDescription}
          </p>
        </div>
      )}

      {content.assessmentCriteria && (
        <div className="flex gap-2 flex-wrap mb-4">
          {content.assessmentCriteria.map((c) => (
            <span key={c} className="text-xs px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full text-indigo-700">
              {c}
            </span>
          ))}
        </div>
      )}

      <textarea
        value={answer}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder={`Write your ${content.format ?? "response"} here…`}
        rows={16}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y leading-relaxed"
      />
      <div className={`text-xs mt-1 text-right ${overLimit ? "text-red-500 font-semibold" : "text-gray-400"}`}>
        {wordCount} / {limit} words
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const ExercisePage = () => {
  const { exerciseId } = Route.useParams();
  const navigate = useNavigate();
  const { data: exercise, isLoading, isError } = useExercise(exerciseId);
  const submitAttempt = useSubmitAttempt();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [writingAnswer, setWritingAnswer] = useState("");
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [exerciseId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-gray-500">Loading exercise…</p>
        </div>
      </div>
    );
  }

  if (isError || !exercise) {
    return (
      <div className="text-red-500">
        Failed to load exercise.{" "}
        <button onClick={() => navigate({ to: "/cambridge" })} className="underline">
          Go back
        </button>
      </div>
    );
  }

  const content = parseContent(exercise.contentJson);
  const exerciseType = exercise.exerciseType as CambridgeExerciseType;
  const isWriting = ["Essay", "Article", "Letter", "Report", "Review", "Proposal"].includes(exerciseType);

  if (!content) {
    return <div className="text-red-500">Exercise content could not be parsed.</div>;
  }

  const handleAnswer = (num: number, val: string) => {
    setAnswers((prev) => ({ ...prev, [num]: val }));
  };

  const buildAnswerJson = (): string => {
    if (isWriting) return writingAnswer;
    return JSON.stringify({ answers });
  };

  const handleSubmit = async () => {
    const timeSpentSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    try {
      const attempt = await submitAttempt.mutateAsync({
        exerciseId: exercise.id,
        answerJson: buildAnswerJson(),
        timeSpentSeconds,
      });
      navigate({ to: "/cambridge/results/$attemptId", params: { attemptId: attempt.id } });
    } catch {
      // error shown below
    }
  };

  const levelLabel: Record<string, string> = {
    B2First: "B2 First",
    C1Advanced: "C1 Advanced",
    C2Proficiency: "C2 Proficiency",
  };

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
          <h1 className="text-xl font-bold text-gray-900">{exerciseType.replace(/([A-Z])/g, " $1").trim()}</h1>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
            {levelLabel[exercise.level] ?? exercise.level}
          </span>
        </div>
      </div>

      {/* Exercise body */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        {exerciseType === "KeyWordTransformations" ? (
          <KeyWordTransformationsExercise
            content={content}
            answers={answers}
            onAnswer={handleAnswer}
          />
        ) : isWriting ? (
          <WritingExercise
            content={content}
            answer={writingAnswer}
            onAnswer={setWritingAnswer}
          />
        ) : exerciseType === "MultipleChoice" ||
          exerciseType === "GappedText" ||
          exerciseType === "MultipleMatching" ? (
          <ReadingExercise
            content={content}
            answers={answers}
            onAnswer={handleAnswer}
            exerciseType={exerciseType}
          />
        ) : (
          <ClozeExercise
            content={content}
            answers={answers}
            onAnswer={handleAnswer}
            exerciseType={exerciseType}
          />
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSubmit}
          disabled={submitAttempt.isPending}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitAttempt.isPending
            ? isWriting
              ? "Evaluating your writing…"
              : "Submitting…"
            : "Submit Answers →"}
        </button>
        {submitAttempt.isPending && isWriting && (
          <p className="text-sm text-gray-500">
            Gemini is assessing your response against Cambridge criteria…
          </p>
        )}
        {submitAttempt.isError && (
          <p className="text-sm text-red-500">Submission failed. Please try again.</p>
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/cambridge/exercise/$exerciseId")({
  component: ExercisePage,
});
