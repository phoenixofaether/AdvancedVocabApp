import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useVocabEntry, useUpdateVocabEntry } from "../../../api/vocabEntries";
import { useCurrentUser } from "../../../api/auth";
import { apiClient } from "../../../api/client";
import type { DictionaryMeaning } from "@vocabapp/shared";

const WordCardPage = () => {
  const { entryId } = Route.useParams();
  const router = useRouter();
  const { data: entry, isLoading } = useVocabEntry(entryId);
  const { data: user } = useCurrentUser();
  const updateEntry = useUpdateVocabEntry(entryId);

  const [editing, setEditing] = useState(false);
  const [customDef, setCustomDef] = useState("");
  const [customPhonetic, setCustomPhonetic] = useState("");
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState("");

  const handleEditStart = () => {
    setCustomDef(entry?.customDefinition ?? "");
    setCustomPhonetic(entry?.customPhonetic ?? "");
    setEditing(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateEntry.mutateAsync({
      customDefinition: customDef || null,
      customPhonetic: customPhonetic || null,
    });
    setEditing(false);
  };

  const handlePlayAudio = async () => {
    setAudioLoading(true);
    setAudioError("");
    try {
      const voice = user?.voicePreference;
      const params = voice ? `?voice=${encodeURIComponent(voice)}` : "";
      const { data } = await apiClient.get<{ url: string }>(
        `/vocab-entries/${entryId}/audio${params}`
      );
      new Audio(data.url).play();
    } catch {
      setAudioError("Audio unavailable for this word.");
    } finally {
      setAudioLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-gray-400">Loading…</div>;
  }
  if (!entry) {
    return <div className="text-gray-400">Entry not found.</div>;
  }

  const phonetic = entry.customPhonetic || entry.dictionaryData?.phoneticText;

  // Group meanings by part of speech
  const meaningsByPos = entry.dictionaryData?.meanings.reduce<
    Record<string, DictionaryMeaning[]>
  >((acc, m) => {
    if (!acc[m.partOfSpeech]) acc[m.partOfSpeech] = [];
    acc[m.partOfSpeech].push(m);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <button
        onClick={() => router.history.back()}
        className="text-sm text-blue-600 hover:underline mb-5 inline-block"
      >
        ← Back
      </button>

      {/* Word header */}
      <div className="mb-7">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-4xl font-bold text-gray-900">{entry.word}</h1>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full uppercase">
            {entry.language}
          </span>
        </div>
        {phonetic && (
          <p className="text-xl text-gray-400 font-mono mt-1.5">{phonetic}</p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handlePlayAudio}
            disabled={audioLoading}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
          >
            {audioLoading ? "⏳" : "🔊"}{" "}
            {audioLoading ? "Loading…" : "Play audio"}
          </button>
          {audioError && (
            <span className="text-xs text-red-500">{audioError}</span>
          )}
        </div>
      </div>

      {/* Custom definition / note */}
      {entry.customDefinition && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <p className="text-xs font-semibold text-amber-700 mb-1 uppercase tracking-wide">
            Your note
          </p>
          <p className="text-gray-800">{entry.customDefinition}</p>
        </div>
      )}

      {/* Dictionary meanings */}
      {meaningsByPos &&
        Object.entries(meaningsByPos).map(([pos, meanings]) => (
          <div key={pos} className="mb-5">
            <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full mb-2">
              {pos}
            </span>
            <div className="space-y-3">
              {meanings.map((m, i) => (
                <div key={i} className="pl-4 border-l-2 border-gray-100">
                  <p className="text-gray-800">{m.definition}</p>
                  {m.example && (
                    <p className="text-sm text-gray-500 italic mt-1">
                      "{m.example}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

      {!entry.dictionaryData && (
        <div className="text-gray-400 text-sm bg-gray-50 rounded-xl p-4 mb-5">
          Dictionary data unavailable for this word.
        </div>
      )}

      {/* Edit section */}
      <div className="border-t border-gray-100 pt-5 mt-4">
        {!editing ? (
          <button
            onClick={handleEditStart}
            className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit custom definition / phonetic
          </button>
        ) : (
          <form onSubmit={handleEditSave} className="space-y-4 max-w-md">
            <h3 className="text-sm font-semibold text-gray-700">
              Edit custom fields
            </h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Custom phonetic
              </label>
              <input
                type="text"
                value={customPhonetic}
                onChange={(e) => setCustomPhonetic(e.target.value)}
                placeholder="/ɪˈfem.ər.əl/"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Personal note / custom definition
              </label>
              <textarea
                value={customDef}
                onChange={(e) => setCustomDef(e.target.value)}
                placeholder="Your personal note or definition…"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={updateEntry.isPending}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {updateEntry.isPending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-sm text-gray-500 hover:underline px-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/entries/$entryId")({
  component: WordCardPage,
});
