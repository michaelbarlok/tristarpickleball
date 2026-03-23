"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Member {
  player_id: string;
  current_step: number;
  win_pct: number;
  player: {
    display_name: string;
    avatar_url: string | null;
  } | null;
}

export function CollapsibleMembers({
  members,
  currentPlayerId,
  isFreePlay,
}: {
  members: Member[];
  currentPlayerId: string | null;
  isFreePlay: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between mb-4"
      >
        <h2 className="text-lg font-semibold text-dark-100">
          Members ({members.length})
        </h2>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={cn(
            "h-5 w-5 text-surface-muted transition-transform",
            open && "rotate-180"
          )}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <>
          {/* Mobile: card list */}
          <div className="space-y-2 sm:hidden max-h-[24rem] overflow-y-auto">
            {members.map((member, index) => (
              <div
                key={member.player_id}
                className={cn(
                  "card flex items-center gap-3",
                  member.player_id === currentPlayerId &&
                    "ring-2 ring-brand-500/40"
                )}
              >
                <span className="text-sm font-medium text-surface-muted w-5 text-center shrink-0">
                  {index + 1}
                </span>
                {member.player?.avatar_url ? (
                  <img
                    src={member.player.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-overlay text-xs font-medium text-surface-muted shrink-0">
                    {member.player?.display_name?.charAt(0) ?? "?"}
                  </div>
                )}
                <span className="text-sm font-medium text-dark-100 truncate flex-1 min-w-0">
                  {member.player?.display_name}
                </span>
                {!isFreePlay && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-dark-200">
                      Step {member.current_step}
                    </span>
                    <span className="text-xs font-semibold text-brand-400">
                      {member.win_pct}%
                    </span>
                  </div>
                )}
              </div>
            ))}
            {members.length === 0 && (
              <div className="card py-8 text-center text-sm text-surface-muted">
                No members yet.
              </div>
            )}
          </div>

          {/* Desktop: table */}
          <div className="card overflow-hidden p-0 hidden sm:block">
            <div className="max-h-[32rem] overflow-y-auto">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-surface-overlay sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-muted">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-muted">
                      Player
                    </th>
                    {!isFreePlay && (
                      <>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-surface-muted">
                          Step
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-surface-muted">
                          Pt %
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface-raised">
                  {members.map((member, index) => (
                    <tr
                      key={member.player_id}
                      className={cn(
                        member.player_id === currentPlayerId &&
                          "bg-brand-900/40"
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-surface-muted">
                        {index + 1}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-3">
                          {member.player?.avatar_url ? (
                            <img
                              src={member.player.avatar_url}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-overlay text-xs font-medium text-surface-muted">
                              {member.player?.display_name?.charAt(0) ?? "?"}
                            </div>
                          )}
                          <span className="text-sm font-medium text-dark-100">
                            {member.player?.display_name}
                          </span>
                        </div>
                      </td>
                      {!isFreePlay && (
                        <>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-dark-100">
                            {member.current_step}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-dark-100">
                            {member.win_pct}%
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-sm text-surface-muted"
                      >
                        No members yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
