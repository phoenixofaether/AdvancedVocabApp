import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  useVocabSet,
  useVocabSetEntries,
  useUpdateVocabSet,
  useDeleteVocabSet,
  useAddEntriesToSet,
  useRemoveEntryFromSet,
} from "../../../api/vocabSets";
import { useCreateVocabEntry } from "../../../api/vocabEntries";

const SetDetailPage = () => {
  const { setId } = Route.useParams();
  const navigate = useNavigate();

  const { data: set } = useVocabSet(setId);
  const { data: entries, isLoading: entriesLoading } =
    useVocabSetEntries(setId);
  const updateSet = useUpdateVocabSet(setId);
  const deleteSet = useDeleteVocabSet();
  const addEntries = useAddEntriesToSet(setId);
  const removeEntry = useRemoveEntryFromSet(setId);
  const createEntry = useCreateVocabEntry();

  const [editingSet, setEditingSet] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [addWord, setAddWord] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleEditStart = () => {
    setEditName(set?.name ?? "");
    setEditDescription(set?.description ?? "");
    setEditingSet(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    await updateSet.mutateAsync({
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    });
    setEditingSet(false);
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = addWord.trim();
    if (!trimmed) return;
    const entry = await createEntry.mutateAsync({ word: trimmed });
    await addEntries.mutateAsync([entry.id]);
    setAddWord("");
  };

  const handleDelete = async () => {
    await deleteSet.mutateAsync(setId);
    navigate({ to: "/sets" });
  };

  const isAdding = createEntry.isPending || addEntries.isPending;

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        to="/sets"
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
      >
        ← My Sets
      </Link>

      {/* Set header */}
      <div className="mb-6">
        {editingSet ? (
          <form onSubmit={handleEditSave} className="space-y-2 max-w-lg">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-2xl font-bold text-gray-900 border-b border-blue-500 outline-none w-full bg-transparent"
              autoFocus
            />
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description…"
              className="text-sm text-gray-500 border-b border-gray-300 outline-none w-full bg-transparent"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={updateSet.isPending}
                className="text-sm text-blue-600 hover:underline disabled:opacity-50"
              >
                {updateSet.isPending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditingSet(false)}
                className="text-sm text-gray-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {set?.name ?? "…"}
              </h1>
              {set?.description && (
                <p className="text-gray-500 mt-1">{set.description}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleEditStart}
                className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Edit
              </button>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-sm text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              ) : (
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-600">Are you sure?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleteSet.isPending}
                    className="text-sm text-white bg-red-600 px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleteSet.isPending ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Flashcard mode link */}
      <div className="mb-5">
        <Link
          to="/review/flashcard"
          search={{ setId }}
          className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
        >
          🃏 Flashcard mode
        </Link>
      </div>

      {/* Add word form */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <form onSubmit={handleAddWord} className="flex gap-2">
          <input
            type="text"
            value={addWord}
            onChange={(e) => setAddWord(e.target.value)}
            placeholder="Add a word to this set…"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isAdding || !addWord.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isAdding ? "Adding…" : "Add"}
          </button>
        </form>
      </div>

      {/* Entry list */}
      {entriesLoading && (
        <div className="text-gray-400 text-sm">Loading words…</div>
      )}
      {!entriesLoading && (!entries || entries.length === 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          <p>No words yet. Add your first word above.</p>
        </div>
      )}

      <div className="space-y-2">
        {entries?.map((entry) => (
          <div
            key={entry.id}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
          >
            <Link
              to="/entries/$entryId"
              params={{ entryId: entry.id }}
              className="flex-1 min-w-0 hover:text-blue-600 transition-colors"
            >
              <span className="font-medium text-gray-900">{entry.word}</span>
              {entry.dictionaryData?.phoneticText && (
                <span className="ml-2 text-sm text-gray-400 font-mono">
                  {entry.dictionaryData.phoneticText}
                </span>
              )}
              {entry.dictionaryData?.meanings?.[0] && (
                <span className="ml-3 text-sm text-gray-500 truncate hidden sm:inline">
                  {entry.dictionaryData.meanings[0].partOfSpeech} ·{" "}
                  {entry.dictionaryData.meanings[0].definition.slice(0, 60)}
                  {entry.dictionaryData.meanings[0].definition.length > 60
                    ? "…"
                    : ""}
                </span>
              )}
            </Link>
            <button
              onClick={() => removeEntry.mutate(entry.id)}
              disabled={removeEntry.isPending}
              className="text-gray-300 hover:text-red-500 ml-4 text-xl leading-none disabled:opacity-50 transition-colors shrink-0"
              title="Remove from set"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/sets/$setId")({
  component: SetDetailPage,
});
