"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResetStatsButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function resetStats() {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/reset-stats`, {
        method: "POST",
      });
      if (res.ok) {
        setConfirming(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-surface-muted">Reset all W/L records?</span>
        <button
          onClick={resetStats}
          disabled={loading}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
        >
          {loading ? "Resetting..." : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm text-surface-muted hover:text-dark-200"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="btn-secondary"
    >
      Reset Stats
    </button>
  );
}
