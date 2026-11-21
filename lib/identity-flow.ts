export type IdentityResult = { playerId: string; elapsedMs: number; solved: boolean };
export type RankedIdentityResult = IdentityResult & { rank: number | null };

/** Unsolved turns never outrank a solve, regardless of when the player passed. */
export function rankIdentityResults(results: readonly IdentityResult[]): RankedIdentityResult[] {
  const sorted = results.map((result, index) => ({ ...result, index })).sort((a, b) =>
    Number(b.solved) - Number(a.solved) || (a.solved && b.solved ? a.elapsedMs - b.elapsedMs : a.index - b.index));
  let lastTime: number | null = null;
  let rank = 0;
  return sorted.map((item, position) => {
    const result = { playerId: item.playerId, elapsedMs: item.elapsedMs, solved: item.solved };
    if (!result.solved) return { ...result, rank: null };
    if (result.elapsedMs !== lastTime) rank = position + 1;
    lastTime = result.elapsedMs;
    return { ...result, rank };
  });
}

/** Server timestamps only: never accept an elapsed value supplied by a browser. */
export function identityElapsedMs(startedAt: number, finishedAt: number, durationSeconds = 120): number {
  const duration = Math.min(300, Math.max(15, Number.isFinite(durationSeconds) ? durationSeconds : 120));
  if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt)) return duration * 1000;
  return Math.max(0, Math.min(duration * 1000, finishedAt - startedAt));
}
