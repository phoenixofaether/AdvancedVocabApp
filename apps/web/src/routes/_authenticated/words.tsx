import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { WordListItem } from "@vocabapp/shared";
import { useAllWords } from "../../api/review";

type FilterOption = "all" | "new" | "due" | "learned";
type SortOption = "newest" | "oldest" | "az" | "next-review";

const getWordStatus = (
  item: WordListItem
): "new" | "learning" | "learned" | "mastered" => {
  if (item.lastReviewedAt === null) return "new";
  if (item.repetitions < 2) return "learning";
  if (item.interval >= 21) return "mastered";
  return "learned";
};

const isDueToday = (item: WordListItem): boolean =>
  new Date(item.nextReviewDate) <= new Date();

const StatusBadge = ({ item }: { item: WordListItem }) => {
  const status = getWordStatus(item);
  const due = isDueToday(item);

  const configs = {
    new: { label: "New", className: "bg-gray-100 text-gray-600" },
    learning: { label: "Learning", className: "bg-yellow-100 text-yellow-700" },
    learned: { label: "Learned", className: "bg-green-100 text-green-700" },
    mastered: { label: "Mastered", className: "bg-blue-100 text-blue-700" },
  };

  const { label, className } = configs[status];

  return (
    <span className="flex items-center gap-1.5 flex-wrap">
      <span
        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${className}`}
      >
        {label}
      </span>
      {due && (
        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
          Due
        </span>
      )}
    </span>
  );
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatNextReview = (item: WordListItem): string => {
  if (item.repetitions === 0 && item.lastReviewedAt === null) return "Now";
  const d = new Date(item.nextReviewDate);
  const now = new Date();
  if (d <= now) return "Now (overdue)";
  const diffDays = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 30) return `In ${diffDays} days`;
  return formatDate(item.nextReviewDate);
};

const WordCard = ({ item }: { item: WordListItem }) => {
  const definition =
    item.customDefinition ??
    (item.firstPartOfSpeech && item.firstDefinition
      ? `${item.firstPartOfSpeech} · ${item.firstDefinition}`
      : item.firstDefinition ?? null);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
      {/* Top row: word + status */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <Link
            to="/entries/$entryId"
            params={{ entryId: item.vocabEntryId }}
            className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-lg"
          >
            {item.word}
          </Link>
          {item.phoneticText && (
            <span className="ml-2 text-sm text-gray-400 font-mono">
              {item.phoneticText}
            </span>
          )}
          {item.language !== "en" && (
            <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              {item.language}
            </span>
          )}
        </div>
        <StatusBadge item={item} />
      </div>

      {/* Definition */}
      {definition && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {item.customDefinition ? (
            <span className="italic">{item.customDefinition}</span>
          ) : (
            <>
              {item.firstPartOfSpeech && (
                <span className="text-gray-400 mr-1">
                  {item.firstPartOfSpeech} ·
                </span>
              )}
              {item.firstDefinition}
            </>
          )}
        </p>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-gray-500 border-t border-gray-100 pt-3">
        <div>
          <span className="block text-gray-400 uppercase tracking-wide text-[10px] font-medium">
            Reviews
          </span>
          <span className="text-gray-700 font-medium">{item.repetitions}×</span>
        </div>
        <div>
          <span className="block text-gray-400 uppercase tracking-wide text-[10px] font-medium">
            Interval
          </span>
          <span className="text-gray-700 font-medium">
            {item.interval === 0 ? "—" : `${item.interval}d`}
          </span>
        </div>
        <div>
          <span className="block text-gray-400 uppercase tracking-wide text-[10px] font-medium">
            Ease
          </span>
          <span className="text-gray-700 font-medium">
            {item.easeFactor.toFixed(1)}
          </span>
        </div>
        <div>
          <span className="block text-gray-400 uppercase tracking-wide text-[10px] font-medium">
            Next review
          </span>
          <span className="text-gray-700 font-medium">
            {formatNextReview(item)}
          </span>
        </div>
        <div>
          <span className="block text-gray-400 uppercase tracking-wide text-[10px] font-medium">
            Last reviewed
          </span>
          <span>{formatDate(item.lastReviewedAt)}</span>
        </div>
        <div className="sm:col-span-1">
          <span className="block text-gray-400 uppercase tracking-wide text-[10px] font-medium">
            Added
          </span>
          <span>{formatDate(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

const WordsPage = () => {
  const { data: words, isLoading } = useAllWords();
  const [filter, setFilter] = useState<FilterOption>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");

  const now = new Date();

  const filtered = useMemo(() => {
    if (!words) return [];

    let result = words;

    // Filter
    if (filter === "new") {
      result = result.filter((w) => w.lastReviewedAt === null);
    } else if (filter === "due") {
      result = result.filter((w) => new Date(w.nextReviewDate) <= now);
    } else if (filter === "learned") {
      result = result.filter((w) => w.repetitions >= 2);
    }

    // Search
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (w) =>
          w.word.toLowerCase().includes(q) ||
          w.firstDefinition?.toLowerCase().includes(q) ||
          w.customDefinition?.toLowerCase().includes(q)
      );
    }

    // Sort
    const sorted = [...result];
    if (sort === "newest") {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sort === "oldest") {
      sorted.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else if (sort === "az") {
      sorted.sort((a, b) => a.word.localeCompare(b.word));
    } else if (sort === "next-review") {
      sorted.sort(
        (a, b) =>
          new Date(a.nextReviewDate).getTime() -
          new Date(b.nextReviewDate).getTime()
      );
    }

    return sorted;
  }, [words, filter, sort, search]);

  const counts = useMemo(() => {
    if (!words) return { all: 0, new: 0, due: 0, learned: 0 };
    return {
      all: words.length,
      new: words.filter((w) => w.lastReviewedAt === null).length,
      due: words.filter((w) => new Date(w.nextReviewDate) <= now).length,
      learned: words.filter((w) => w.repetitions >= 2).length,
    };
  }, [words]);

  const filterTabs: { key: FilterOption; label: string }[] = [
    { key: "all", label: `All (${counts.all})` },
    { key: "new", label: `New (${counts.new})` },
    { key: "due", label: `Due (${counts.due})` },
    { key: "learned", label: `Learned (${counts.learned})` },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Words</h1>
        <p className="text-gray-500 mt-1">
          All vocabulary you're tracking with spaced repetition
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4 overflow-x-auto">
        {filterTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 min-w-max px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div className="flex gap-2 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search words or definitions…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="az">A → Z</option>
          <option value="next-review">Next review</option>
        </select>
      </div>

      {/* Word list */}
      {isLoading && (
        <div className="text-gray-400 text-sm">Loading words…</div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          {words?.length === 0 ? (
            <>
              <p className="font-medium">No words yet.</p>
              <p className="text-sm mt-1">
                Add words from the{" "}
                <Link to="/dashboard" className="text-blue-600 hover:underline">
                  dashboard
                </Link>{" "}
                to get started.
              </p>
            </>
          ) : (
            <p>No words match the current filter.</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((item) => (
          <WordCard key={item.reviewCardId} item={item} />
        ))}
      </div>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/words")({
  component: WordsPage,
});
