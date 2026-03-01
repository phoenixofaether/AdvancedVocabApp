import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useVocabSets, useVocabSetEntries } from "../../../api/vocabSets";
import { useCurrentUser } from "../../../api/auth";
import { apiClient } from "../../../api/client";

const FlashcardPage = () => {
  const { setId: initialSetId } = Route.useSearch();
  const [selectedSetId, setSelectedSetId] = useState<string | undefined>(
    initialSetId
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [audioError, setAudioError] = useState("");

  const { data: sets } = useVocabSets();
  const { data: entries, isLoading: entriesLoading } = useVocabSetEntries(
    selectedSetId ?? ""
  );
  const { data: user } = useCurrentUser();

  // Reset card position when set changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedSetId]);

  const handleSetChange = (id: string) => {
    setSelectedSetId(id || undefined);
  };

  const handlePlayAudio = async (entryId: string) => {
    setAudioError("");
    try {
      const params = user?.voicePreference
        ? `?voice=${encodeURIComponent(user.voicePreference)}`
        : "";
      const { data } = await apiClient.get<{ url: string }>(
        `/vocab-entries/${entryId}/audio${params}`
      );
      new Audio(data.url).play();
    } catch {
      setAudioError("Audio unavailable");
    }
  };

  const total = entries?.length ?? 0;
  const current = entries?.[currentIndex];

  const prev = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
    setIsFlipped(false);
  };

  const next = () => {
    setCurrentIndex((i) => Math.min(total - 1, i + 1));
    setIsFlipped(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link to="/sets" className="text-blue-600 hover:underline">
          ← My Sets
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600">Flashcard mode</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-5">Flashcards</h1>

      {/* Set picker */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Select a set
        </label>
        <select
          value={selectedSetId ?? ""}
          onChange={(e) => handleSetChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
        >
          <option value="">— Choose a set —</option>
          {sets?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.entryCount} words)
            </option>
          ))}
        </select>
      </div>

      {/* No set selected */}
      {!selectedSetId && (
        <div className="bg-white rounded-2xl border border-gray-200 p-14 text-center text-gray-400">
          Select a set above to start browsing
        </div>
      )}

      {/* Loading */}
      {selectedSetId && entriesLoading && (
        <div className="bg-white rounded-2xl border border-gray-200 p-14 text-center text-gray-400">
          Loading cards…
        </div>
      )}

      {/* Empty set */}
      {selectedSetId && !entriesLoading && total === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-14 text-center text-gray-400">
          This set has no words yet.
        </div>
      )}

      {/* Flashcard UI */}
      {current && (
        <>
          {/* Navigation controls */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={prev}
              disabled={currentIndex === 0}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-500">
              {currentIndex + 1} / {total}
            </span>
            <button
              onClick={next}
              disabled={currentIndex === total - 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              Next →
            </button>
          </div>

          {/* Card */}
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-sm cursor-pointer select-none"
            onClick={() => setIsFlipped((f) => !f)}
            style={{ minHeight: "280px" }}
          >
            {!isFlipped ? (
              /* Front */
              <div
                className="flex flex-col items-center justify-center p-10"
                style={{ minHeight: "280px" }}
              >
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">
                  Tap to reveal
                </p>
                <h2 className="text-5xl font-bold text-gray-900">
                  {current.word}
                </h2>
                {(current.customPhonetic ||
                  current.dictionaryData?.phoneticText) && (
                  <p className="text-gray-400 font-mono mt-2.5 text-lg">
                    {current.customPhonetic ||
                      current.dictionaryData?.phoneticText}
                  </p>
                )}
              </div>
            ) : (
              /* Back */
              <div className="p-7" style={{ minHeight: "280px" }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {current.word}
                  </h2>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayAudio(current.id);
                    }}
                    className="text-sm text-blue-600 border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    🔊 Play
                  </button>
                </div>
                {audioError && (
                  <p className="text-xs text-red-500 mb-2">{audioError}</p>
                )}

                {/* Custom note */}
                {current.customDefinition && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm text-gray-700">
                    {current.customDefinition}
                  </div>
                )}

                {/* Top 3 meanings */}
                {current.dictionaryData?.meanings
                  .slice(0, 3)
                  .map((m, i) => (
                    <div key={i} className="mb-3 pl-3 border-l-2 border-gray-100">
                      <span className="text-xs text-blue-600 font-semibold">
                        {m.partOfSpeech}
                      </span>
                      <p className="text-sm text-gray-700 mt-0.5">
                        {m.definition}
                      </p>
                      {m.example && (
                        <p className="text-xs text-gray-400 italic mt-0.5">
                          "{m.example}"
                        </p>
                      )}
                    </div>
                  ))}

                {!current.dictionaryData && !current.customDefinition && (
                  <p className="text-gray-400 text-sm">
                    No definition available.
                  </p>
                )}

                <p className="text-xs text-gray-300 text-center mt-4">
                  Tap anywhere to flip back
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/review/flashcard")({
  validateSearch: (search: Record<string, unknown>) => ({
    setId: typeof search.setId === "string" ? search.setId : undefined,
  }),
  component: FlashcardPage,
});
