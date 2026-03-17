// ============================================================
// Free Play Engine — match generation with partner rotation
// ============================================================

export interface MatchAssignment {
  teamA: [string, string];
  teamB: [string, string];
}

export interface RoundResult {
  matches: MatchAssignment[];
  sitting: string[];
}

/**
 * Build a partner-pair key (order-independent).
 */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Generate a round of doubles matches.
 *
 * Guarantees:
 *  - Nobody sits twice in a row (unless unavoidable with < 5 players).
 *  - Partners rotate — minimises repeat partnerships across rounds.
 */
export function generateRound(
  players: string[],
  previousSitting: string[],
  partnerHistory: Record<string, number>
): RoundResult {
  const n = players.length;

  if (n < 4) {
    return { matches: [], sitting: [...players] };
  }

  const numCourts = Math.floor(n / 4);
  const numPlaying = numCourts * 4;
  const numSitting = n - numPlaying;

  const sitting = pickSitters(players, numSitting, new Set(previousSitting));
  const playing = players.filter((p) => !sitting.includes(p));
  const matches = formMatches(playing, partnerHistory);

  return { matches, sitting };
}

// ------------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------------

function pickSitters(
  players: string[],
  count: number,
  previouslySat: Set<string>
): string[] {
  if (count === 0) return [];

  // Prefer players who did NOT sit last round
  const eligible = players.filter((p) => !previouslySat.has(p));
  const ineligible = players.filter((p) => previouslySat.has(p));

  const sitters: string[] = [];
  const shuffledEligible = shuffle([...eligible]);
  for (const p of shuffledEligible) {
    if (sitters.length >= count) break;
    sitters.push(p);
  }

  // Only add players who sat last round if we still need more
  if (sitters.length < count) {
    const shuffledIneligible = shuffle([...ineligible]);
    for (const p of shuffledIneligible) {
      if (sitters.length >= count) break;
      sitters.push(p);
    }
  }

  return sitters;
}

/**
 * Try several random shuffles and pick the assignment with the fewest
 * repeat partnerships.
 */
function formMatches(
  players: string[],
  partnerHistory: Record<string, number>
): MatchAssignment[] {
  let bestMatches: MatchAssignment[] = [];
  let bestScore = Infinity;

  const attempts = Math.min(50, players.length * 10);

  for (let i = 0; i < attempts; i++) {
    const shuffled = shuffle([...players]);
    const matches: MatchAssignment[] = [];
    let score = 0;

    for (let j = 0; j < shuffled.length; j += 4) {
      const teamA: [string, string] = [shuffled[j], shuffled[j + 1]];
      const teamB: [string, string] = [shuffled[j + 2], shuffled[j + 3]];

      score += partnerHistory[pairKey(teamA[0], teamA[1])] ?? 0;
      score += partnerHistory[pairKey(teamB[0], teamB[1])] ?? 0;

      matches.push({ teamA, teamB });
    }

    if (score < bestScore) {
      bestScore = score;
      bestMatches = matches;
    }

    if (score === 0) break; // No repeats — can't do better
  }

  return bestMatches;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
