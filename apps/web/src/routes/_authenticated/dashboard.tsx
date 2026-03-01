import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCurrentUser } from "../../api/auth";
import { useReviewStats } from "../../api/review";
import { useCreateVocabEntry } from "../../api/vocabEntries";

const StatCard = ({
  label,
  value,
  accent = "gray",
}: {
  label: string;
  value: string | number;
  accent?: "gray" | "blue" | "orange";
}) => {
  const accentClass = {
    gray: "text-gray-900",
    blue: "text-blue-600",
    orange: "text-orange-500",
  }[accent];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
      <div className={`text-2xl font-bold ${accentClass}`}>{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
};

const DashboardPage = () => {
  const { data: user } = useCurrentUser();
  const { data: stats } = useReviewStats();
  const navigate = useNavigate();
  const createEntry = useCreateVocabEntry();
  const [word, setWord] = useState("");

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = word.trim();
    if (!trimmed) return;
    const entry = await createEntry.mutateAsync({ word: trimmed });
    setWord("");
    navigate({ to: "/entries/$entryId", params: { entryId: entry.id } });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome{user?.displayName ? `, ${user.displayName}` : ""}
        </h1>
        <p className="text-gray-500 mt-1">Your vocabulary dashboard</p>
      </div>

      {/* Stats widget */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Due Today"
          value={stats?.dueToday ?? "—"}
          accent={stats && stats.dueToday > 0 ? "blue" : "gray"}
        />
        <StatCard label="Reviewed Today" value={stats?.reviewedToday ?? "—"} />
        <StatCard
          label="Day Streak"
          value={stats ? `${stats.currentStreak} 🔥` : "—"}
          accent="orange"
        />
      </div>

      {/* Quick-add word */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add a word</h2>
        <form onSubmit={handleAddWord} className="flex gap-2">
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="e.g. ephemeral"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={createEntry.isPending || !word.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createEntry.isPending ? "Adding…" : "Add"}
          </button>
        </form>
        {createEntry.isError && (
          <p className="text-red-500 text-sm mt-2">
            Failed to add word. Please try again.
          </p>
        )}
      </div>

      {/* CTAs */}
      <div className="flex gap-3">
        <Link
          to="/sets"
          className="px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          My Sets →
        </Link>
        <Link
          to="/review"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Start Review →
        </Link>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});
