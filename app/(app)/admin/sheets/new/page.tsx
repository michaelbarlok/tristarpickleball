"use client";

import { useSupabase } from "@/components/providers/supabase-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ShootoutGroup } from "@/types/database";

export default function NewSheetPage() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [groups, setGroups] = useState<ShootoutGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [groupId, setGroupId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [playerLimit, setPlayerLimit] = useState(16);
  const [signupClosesAt, setSignupClosesAt] = useState("");
  const [withdrawClosesAt, setWithdrawClosesAt] = useState("");
  const [allowMemberGuests, setAllowMemberGuests] = useState(false);
  const [notifyOnCreate, setNotifyOnCreate] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("shootout_groups")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      setGroups(data ?? []);
      if (data && data.length > 0) {
        setGroupId(data[0].id);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!groupId) {
      setError("Please select a group.");
      return;
    }
    if (!eventDate || !eventTime || !location.trim()) {
      setError("Date, time, and location are required.");
      return;
    }
    if (!signupClosesAt) {
      setError("Sign-up close time is required.");
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated.");
        setSaving(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        setError("Profile not found.");
        setSaving(false);
        return;
      }

      const { data: sheet, error: insertError } = await supabase
        .from("signup_sheets")
        .insert({
          group_id: groupId,
          event_date: eventDate,
          event_time: eventTime,
          location: location.trim(),
          player_limit: playerLimit,
          signup_closes_at: new Date(signupClosesAt).toISOString(),
          withdraw_closes_at: withdrawClosesAt
            ? new Date(withdrawClosesAt).toISOString()
            : null,
          allow_member_guests: allowMemberGuests,
          notify_on_create: notifyOnCreate,
          notes: notes.trim() || null,
          status: "open",
          created_by: profile.id,
        })
        .select("id")
        .single();

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      router.push(`/admin/sheets/${sheet.id}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create sheet.";
      setError(message);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="card text-center text-gray-500">
        <p>No active groups found. Create a group first before creating a sign-up sheet.</p>
        <button
          onClick={() => router.push("/admin/groups")}
          className="btn-primary mt-4"
        >
          Go to Groups
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <button
          onClick={() => router.push("/admin/sheets")}
          className="text-sm text-brand-600 hover:text-brand-500"
        >
          &larr; All Sheets
        </button>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Create Sign-Up Sheet
        </h1>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-1">
            Group
          </label>
          <select
            id="group"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="input w-full"
            required
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-1">
              Event Date
            </label>
            <input
              id="eventDate"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="input w-full"
              required
            />
          </div>
          <div>
            <label htmlFor="eventTime" className="block text-sm font-medium text-gray-700 mb-1">
              Event Time
            </label>
            <input
              id="eventTime"
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className="input w-full"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="input w-full"
            placeholder="e.g. Athens Community Center"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="playerLimit" className="block text-sm font-medium text-gray-700 mb-1">
              Player Limit
            </label>
            <input
              id="playerLimit"
              type="number"
              min={4}
              value={playerLimit}
              onChange={(e) => setPlayerLimit(Number(e.target.value))}
              className="input w-full"
              required
            />
          </div>
          <div>
            <label htmlFor="signupClosesAt" className="block text-sm font-medium text-gray-700 mb-1">
              Sign-Up Closes At
            </label>
            <input
              id="signupClosesAt"
              type="datetime-local"
              value={signupClosesAt}
              onChange={(e) => setSignupClosesAt(e.target.value)}
              className="input w-full"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="withdrawClosesAt" className="block text-sm font-medium text-gray-700 mb-1">
            Withdraw Closes At (optional)
          </label>
          <input
            id="withdrawClosesAt"
            type="datetime-local"
            value={withdrawClosesAt}
            onChange={(e) => setWithdrawClosesAt(e.target.value)}
            className="input w-full"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input w-full"
            rows={2}
            placeholder="Any additional info for players..."
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="allowMemberGuests"
              checked={allowMemberGuests}
              onChange={(e) => setAllowMemberGuests(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="allowMemberGuests" className="text-sm font-medium text-gray-700">
              Allow member guests
            </label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="notifyOnCreate"
              checked={notifyOnCreate}
              onChange={(e) => setNotifyOnCreate(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="notifyOnCreate" className="text-sm font-medium text-gray-700">
              Notify group members on creation
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/admin/sheets")}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Creating..." : "Create Sheet"}
          </button>
        </div>
      </form>
    </div>
  );
}
