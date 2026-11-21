export type HumanScaleOrderResult = {
  playerId: string;
  order: string[];
  correctPairs: number;
  totalPairs: number;
};

/** Accept a complete permutation only; never repair a malformed submission. */
export function validateHumanScaleOrder(value: unknown, playerIds: readonly string[]): string[] | null {
  if (!Array.isArray(value) || value.length !== playerIds.length || new Set(playerIds).size !== playerIds.length) return null;
  if (!value.every((id): id is string => typeof id === 'string' && playerIds.includes(id)) || new Set(value).size !== value.length) return null;
  return [...value];
}

/** One point per unordered pair whose relative order matches the true scale. */
export function scoreHumanScaleOrder(order: readonly string[], actualOrder: readonly string[]): { correctPairs: number; totalPairs: number } {
  if (!validateHumanScaleOrder(order, actualOrder)) throw new Error('Human Scale requires a complete player order.');
  const positions = new Map(actualOrder.map((id, index) => [id, index]));
  let correctPairs = 0;
  for (let i = 0; i < order.length; i += 1) {
    for (let j = i + 1; j < order.length; j += 1) {
      if (positions.get(order[i])! < positions.get(order[j])!) correctPairs += 1;
    }
  }
  return { correctPairs, totalPairs: order.length * (order.length - 1) / 2 };
}

/** Missing submissions get zero points and no invented guess in the reveal. */
export function scoreHumanScaleOrders(playerIds: readonly string[], ranks: Record<string, number>, ordersByPlayer: Record<string, unknown>) {
  if (new Set(playerIds).size !== playerIds.length || playerIds.some(id => !Number.isFinite(ranks[id])) || new Set(playerIds.map(id => ranks[id])).size !== playerIds.length) {
    throw new Error('Human Scale requires distinct ranks for every player.');
  }
  const actualOrder = [...playerIds].sort((a, b) => ranks[a] - ranks[b]);
  const lineupResults: HumanScaleOrderResult[] = [];
  const roundScores: Record<string, number> = Object.fromEntries(playerIds.map(id => [id, 0]));
  for (const playerId of playerIds) {
    const order = validateHumanScaleOrder(ordersByPlayer[playerId], playerIds);
    if (!order) continue;
    const score = scoreHumanScaleOrder(order, actualOrder);
    lineupResults.push({ playerId, order, ...score });
    roundScores[playerId] = score.correctPairs;
  }
  return { actualOrder, lineupResults, roundScores };
}
