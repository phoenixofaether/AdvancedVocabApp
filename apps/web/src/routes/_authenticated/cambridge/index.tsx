import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { CambridgeLevel, CambridgeExerciseType, ExerciseTypeInfo } from "@vocabapp/shared";
import { useExerciseTypes, useGenerateExercise, useSkillProfile } from "../../../api/cambridge";

const LEVELS: { value: CambridgeLevel; label: string; subtitle: string; color: string }[] = [
  { value: "B2First", label: "B2 First", subtitle: "FCE", color: "blue" },
  { value: "C1Advanced", label: "C1 Advanced", subtitle: "CAE", color: "purple" },
  { value: "C2Proficiency", label: "C2 Proficiency", subtitle: "CPE", color: "rose" },
];

const CATEGORY_ORDER = ["Use of English", "Reading", "Writing"];

const scoreColor = (score: number) => {
  if (score >= 0.8) return "text-green-600 bg-green-50 border-green-200";
  if (score >= 0.5) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
};

const LevelCard = ({
  level,
  selected,
  onSelect,
}: {
  level: (typeof LEVELS)[number];
  selected: boolean;
  onSelect: () => void;
}) => {
  const colors: Record<string, string> = {
    blue: selected ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50",
    purple: selected ? "border-purple-500 bg-purple-50 ring-2 ring-purple-500" : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/50",
    rose: selected ? "border-rose-500 bg-rose-50 ring-2 ring-rose-500" : "border-gray-200 hover:border-rose-300 hover:bg-rose-50/50",
  };
  const labelColors: Record<string, string> = {
    blue: "text-blue-700",
    purple: "text-purple-700",
    rose: "text-rose-700",
  };

  return (
    <button
      onClick={onSelect}
      className={`flex-1 rounded-xl border-2 p-5 text-left transition-all cursor-pointer ${colors[level.color]}`}
    >
      <div className={`text-lg font-bold ${labelColors[level.color]}`}>{level.label}</div>
      <div className="text-xs text-gray-500 mt-0.5">{level.subtitle} · Cambridge English</div>
    </button>
  );
};

const ExerciseTypeCard = ({
  info,
  selected,
  onSelect,
  skillScore,
}: {
  info: ExerciseTypeInfo;
  selected: boolean;
  onSelect: () => void;
  skillScore?: number;
}) => (
  <button
    onClick={onSelect}
    className={`w-full text-left rounded-xl border-2 p-4 transition-all cursor-pointer ${
      selected
        ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500"
        : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40"
    }`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1">
        <div className="font-semibold text-sm text-gray-900">{info.displayName}</div>
        <div className="text-xs text-gray-500 mt-1 leading-snug">{info.description}</div>
      </div>
      {skillScore !== undefined && (
        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${scoreColor(skillScore)}`}>
          {Math.round(skillScore * 100)}%
        </span>
      )}
    </div>
  </button>
);

const CambridgePage = () => {
  const navigate = useNavigate();
  const [selectedLevel, setSelectedLevel] = useState<CambridgeLevel | null>(null);
  const [selectedType, setSelectedType] = useState<CambridgeExerciseType | null>(null);

  const { data: exerciseTypes, isLoading: typesLoading } = useExerciseTypes();
  const { data: skillProfile } = useSkillProfile();
  const generate = useGenerateExercise();

  const availableTypes = exerciseTypes?.filter((t) =>
    selectedLevel ? t.availableLevels.includes(selectedLevel) : true
  );

  const grouped = CATEGORY_ORDER.reduce<Record<string, ExerciseTypeInfo[]>>((acc, cat) => {
    const items = availableTypes?.filter((t) => t.category === cat) ?? [];
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const getSkillScore = (type: CambridgeExerciseType) =>
    skillProfile?.find((p) => p.level === selectedLevel && p.exerciseType === type)?.averageScore;

  const canGenerate = selectedLevel && selectedType && !generate.isPending;

  const handleGenerate = async () => {
    if (!selectedLevel || !selectedType) return;
    try {
      const exercise = await generate.mutateAsync({ level: selectedLevel, exerciseType: selectedType });
      navigate({ to: "/cambridge/exercise/$exerciseId", params: { exerciseId: exercise.id } });
    } catch {
      // error shown below
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cambridge Practice</h1>
        <p className="text-gray-500 mt-1">
          AI-generated exercises personalised to your level and performance
        </p>
      </div>

      {/* Step 1 — Choose level */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          1 · Choose your level
        </h2>
        <div className="flex gap-3">
          {LEVELS.map((l) => (
            <LevelCard
              key={l.value}
              level={l}
              selected={selectedLevel === l.value}
              onSelect={() => {
                setSelectedLevel(l.value);
                setSelectedType(null);
              }}
            />
          ))}
        </div>
      </section>

      {/* Step 2 — Choose exercise type */}
      {selectedLevel && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            2 · Choose exercise type
          </h2>
          {typesLoading ? (
            <div className="text-gray-400 text-sm">Loading…</div>
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([category, types]) => (
                <div key={category}>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    {category}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {types.map((t) => (
                      <ExerciseTypeCard
                        key={t.type}
                        info={t}
                        selected={selectedType === t.type}
                        onSelect={() => setSelectedType(t.type)}
                        skillScore={getSkillScore(t.type)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Step 3 — Generate */}
      {selectedLevel && selectedType && (
        <section className="mb-8">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            {generate.isPending ? "Generating exercise…" : "Generate Exercise →"}
          </button>
          {generate.isPending && (
            <p className="text-sm text-gray-500 mt-2">
              Gemini is crafting your personalised exercise. This may take a few seconds…
            </p>
          )}
          {generate.isError && (
            <p className="text-sm text-red-500 mt-2">
              Failed to generate exercise. Please try again.
            </p>
          )}
        </section>
      )}

      {/* Skill profile summary */}
      {skillProfile && skillProfile.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Your performance
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {skillProfile.map((p) => (
              <div key={`${p.level}-${p.exerciseType}`} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-800">{p.exerciseType}</span>
                  <span className="ml-2 text-xs text-gray-400">{p.level}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{p.attemptCount} attempt{p.attemptCount !== 1 ? "s" : ""}</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-full border ${scoreColor(p.averageScore)}`}>
                    {Math.round(p.averageScore * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/cambridge/")({
  component: CambridgePage,
});
