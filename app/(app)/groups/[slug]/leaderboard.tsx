import { cn } from "@/lib/utils";

interface PlayerStat {
  player_id: string;
  wins: number;
  losses: number;
  total_point_diff: number;
  player: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export function FreePlayLeaderboard({
  stats,
  currentPlayerId,
}: {
  stats: PlayerStat[];
  currentPlayerId?: string;
}) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-surface-border">
          <thead className="bg-surface-overlay">
            <tr>
              <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-muted">
                #
              </th>
              <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-muted">
                Player
              </th>
              <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-surface-muted">
                W
              </th>
              <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-surface-muted">
                L
              </th>
              <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-surface-muted">
                Win %
              </th>
              <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-surface-muted">
                Pt Diff
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border bg-surface-raised">
            {stats.map((stat, index) => {
              const total = stat.wins + stat.losses;
              const winPct = total > 0 ? ((stat.wins / total) * 100).toFixed(1) : "0.0";

              return (
                <tr
                  key={stat.player_id}
                  className={cn(
                    stat.player_id === currentPlayerId && "bg-brand-900/40"
                  )}
                >
                  <td className="whitespace-nowrap px-2 sm:px-4 py-3 text-sm text-surface-muted">
                    {index + 1}
                  </td>
                  <td className="whitespace-nowrap px-2 sm:px-4 py-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      {stat.player?.avatar_url ? (
                        <img
                          src={stat.player.avatar_url}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-overlay text-xs font-medium text-surface-muted">
                          {stat.player?.display_name?.charAt(0) ?? "?"}
                        </div>
                      )}
                      <span className="text-sm font-medium text-dark-100">
                        {stat.player?.display_name}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 sm:px-4 py-3 text-right text-sm text-teal-300 font-medium">
                    {stat.wins}
                  </td>
                  <td className="whitespace-nowrap px-2 sm:px-4 py-3 text-right text-sm text-red-400 font-medium">
                    {stat.losses}
                  </td>
                  <td className="whitespace-nowrap px-2 sm:px-4 py-3 text-right text-sm text-dark-100">
                    {winPct}%
                  </td>
                  <td className="whitespace-nowrap px-2 sm:px-4 py-3 text-right text-sm text-dark-100">
                    <span className={stat.total_point_diff > 0 ? "text-teal-300" : stat.total_point_diff < 0 ? "text-red-400" : ""}>
                      {stat.total_point_diff > 0 ? "+" : ""}
                      {stat.total_point_diff}
                    </span>
                  </td>
                </tr>
              );
            })}
            {stats.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-2 sm:px-4 py-8 text-center text-sm text-surface-muted"
                >
                  No matches played yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
