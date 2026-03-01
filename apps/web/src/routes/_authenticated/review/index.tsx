import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useReviewDue, useSubmitReview } from "../../../api/review";
import { useVocabEntry } from "../../../api/vocabEntries";
import { useCurrentUser } from "../../../api/auth";
import { apiClient } from "../../../api/client";
import type { ReviewCard } from "@vocabapp/shared";

interface SessionResult {
  cardId: string;
  quality: number;
}

const ReviewBack = ({
  card,
  voicePreference,
  onRate,
  isSubmitting,
}: {
  card: ReviewCard;
  voicePreference: string | null;
  onRate: (q: 1 | 3 | 4 | 5) => void;
  isSubmitting: boolean;
}) => {
  const { data: entry, isLoading } = useVocabEntry(card.vocabEntryId);
  const [audioError, setAudioError] = useState("");

  const handlePlayAudio = async () => {
    setAudioError("");
    try {
      const params = voicePreference
        ? `?voice=${encodeURIComponent(voicePreference)}`
        : "";
      const { data } = await apiClient.get<{ url: string }>(
        `/vocab-entries/${card.vocabEntryId}/audio${params}`
      );
      new Audio(data.url).play();
    } catch {
      setAudioError("Audio unavailable");
    }
  };

  const ratings: Array<{
    quality: 1 | 3 | 4 | 5;
    label: string;
    colorClass: string;
  }> = [
    {
      quality: 1,
      label: "Again",
      colorClass:
        "text-red-600 border-red-200 hover:bg-red-50",
    },
    {
      quality: 3,
      label: "Hard",
      colorClass:
        "text-orange-600 border-orange-200 hover:bg-orange-50",
    },
    {
      quality: 4,
      label: "Good",
      colorClass:
        "text-green-600 border-green-200 hover:bg-green-50",
    },
    {
      quality: 5,
      label: "Easy",
      colorClass:
        "text-blue-600 border-blue-200 hover:bg-blue-50",
    },
  ];

  return (
    <div className="p-6">
      {/* Definition section */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-4 text-sm">
          Loading definition…
        </div>
      ) : (
        <div className="mb-4">
          {entry?.dictionaryData?.phoneticText && (
            <p className="text-gray-400 font-mono text-sm text-center mb-3">
              {entry.dictionaryData.phoneticText}
            </p>
          )}

          {/* Audio button */}
          <div className="flex justify-center mb-4">
            <button
              onClick={handlePlayAudio}
              className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              🔊 Play audio
            </button>
          </div>
          {audioError && (
            <p className="text-xs text-red-500 text-center mb-2">
              {audioError}
            </p>
          )}

          {/* Custom note */}
          {entry?.customDefinition && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm text-gray-700">
              {entry.customDefinition}
            </div>
          )}

          {/* Top 2 meanings */}
          {entry?.dictionaryData?.meanings?.slice(0, 2).map((m, i) => (
            <div key={i} className="mb-2.5 pl-3 border-l-2 border-gray-100">
              <span className="text-xs text-blue-600 font-semibold">
                {m.partOfSpeech}
              </span>
              <p className="text-sm text-gray-700 mt-0.5">{m.definition}</p>
              {m.example && (
                <p className="text-xs text-gray-400 italic mt-0.5">
                  "{m.example}"
                </p>
              )}
            </div>
          ))}

          {!entry?.dictionaryData && !entry?.customDefinition && (
            <p className="text-sm text-gray-400 text-center">
              No definition available.
            </p>
          )}
        </div>
      )}

      {/* Rating buttons */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-center text-gray-400 mb-3">
          How well did you know this?
        </p>
        <div className="grid grid-cols-4 gap-2">
          {ratings.map(({ quality, label, colorClass }) => (
            <button
              key={quality}
              onClick={() => onRate(quality)}
              disabled={isSubmitting}
              className={`border rounded-xl py-2.5 text-sm font-medium disabled:opacity-40 transition-colors ${colorClass}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ReviewPage = () => {
  const { data: dueCards, isLoading } = useReviewDue();
  const submitReview = useSubmitReview();
  const { data: user } = useCurrentUser();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [isDone, setIsDone] = useState(false);

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="text-gray-400">Loading review cards…</div>
      </div>
    );
  }

  if (!dueCards || dueCards.length === 0) {
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900">All caught up!</h2>
        <p className="text-gray-500 mt-2">
          No cards due for review right now. Come back later!
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (isDone) {
    const goodCount = results.filter((r) => r.quality >= 4).length;
    const hardCount = results.length - goodCount;
    return (
      <div className="text-center py-12 max-w-md mx-auto">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900">Session complete!</h2>
        <p className="text-gray-500 mt-2">
          You reviewed {results.length} card{results.length !== 1 ? "s" : ""}
        </p>
        <div className="grid grid-cols-3 gap-3 mt-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {results.length}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Reviewed</div>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{goodCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">Good / Easy</div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{hardCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">Again / Hard</div>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <Link
            to="/dashboard"
            className="px-4 py-2 border border-gray-300 bg-white text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            to="/review"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Review again
          </Link>
        </div>
      </div>
    );
  }

  const currentCard = dueCards[currentIndex];

  const handleRate = async (quality: 1 | 3 | 4 | 5) => {
    await submitReview.mutateAsync({
      reviewCardId: currentCard.id,
      quality,
    });
    setResults((prev) => [...prev, { cardId: currentCard.id, quality }]);
    if (currentIndex + 1 >= dueCards.length) {
      setIsDone(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="flex justify-between items-center mb-6 gap-4">
        <span className="text-sm text-gray-500 shrink-0">
          {currentIndex + 1} / {dueCards.length}
        </span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-2 bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${(currentIndex / dueCards.length) * 100}%` }}
          />
        </div>
        <Link
          to="/dashboard"
          className="text-sm text-gray-400 hover:text-gray-600 shrink-0"
        >
          Quit
        </Link>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Front — always visible */}
        <div className="p-8 text-center border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            {currentCard.language}
          </p>
          <h2 className="text-5xl font-bold text-gray-900">
            {currentCard.word}
          </h2>
        </div>

        {/* Back — flip to reveal */}
        {!isFlipped ? (
          <div className="p-6 text-center">
            <button
              onClick={() => setIsFlipped(true)}
              className="px-6 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Show definition
            </button>
          </div>
        ) : (
          <ReviewBack
            card={currentCard}
            voicePreference={user?.voicePreference ?? null}
            onRate={handleRate}
            isSubmitting={submitReview.isPending}
          />
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/review/")({
  component: ReviewPage,
});
