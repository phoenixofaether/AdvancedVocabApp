import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useCurrentUser } from "../../api/auth";
import { useAvailableVoices } from "../../api/tts";
import { useUpdateUser } from "../../api/users";

const SettingsPage = () => {
  const { data: user } = useCurrentUser();
  const { data: voices, isLoading: voicesLoading } = useAvailableVoices();
  const updateUser = useUpdateUser();

  const [voice, setVoice] = useState<string>("");
  const [saved, setSaved] = useState(false);

  // Sync initial value from user profile
  useEffect(() => {
    if (user?.voicePreference != null) {
      setVoice(user.voicePreference);
    }
  }, [user?.voicePreference]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUser.mutateAsync({ voicePreference: voice || null });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Voice preference */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Voice Preference
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Choose an accent for audio pronunciation.
        </p>
        <form onSubmit={handleSave} className="space-y-4">
          {voicesLoading ? (
            <div className="text-sm text-gray-400">Loading voices…</div>
          ) : (
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Default (en-US-Wavenet-D)</option>
              {voices?.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={updateUser.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {updateUser.isPending ? "Saving…" : "Save"}
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">
                ✓ Saved!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Account info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Account</h2>
        <div className="text-sm text-gray-600 space-y-1.5">
          <div className="flex gap-2">
            <span className="text-gray-400 w-16">Name</span>
            <span>{user?.displayName ?? "—"}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-16">Email</span>
            <span>{user?.email ?? "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});
