"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/supabase-provider";

interface Props {
  registrationId: string;
  isPaid: boolean;
}

export function PaidToggle({ registrationId, isPaid }: Props) {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(isPaid);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !optimistic;
    setOptimistic(next);
    setSaving(true);
    await supabase
      .from("tournament_registrations")
      .update({ paid: next })
      .eq("id", registrationId);
    setSaving(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      title={optimistic ? "Mark as unpaid" : "Mark as paid"}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
        optimistic
          ? "bg-green-500/15 text-green-400 hover:bg-green-500/25"
          : "bg-surface-border text-surface-muted hover:bg-surface-overlay hover:text-dark-200"
      } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {optimistic ? (
        <>
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Paid
        </>
      ) : (
        "Unpaid"
      )}
    </button>
  );
}
