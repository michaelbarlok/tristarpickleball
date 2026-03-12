"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function QuickSignUp({ sheetId }: { sheetId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch(`/api/sheets/${sheetId}/signup`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to sign up.");
      }
      router.refresh();
    } catch {
      alert("Failed to sign up.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="btn-primary text-xs px-3 py-1.5"
    >
      {loading ? "..." : "Sign Up"}
    </button>
  );
}
