export const charadesTeamIds = ['blue', 'red', 'green', 'yellow', 'purple'] as const;
export type CharadesTeam = typeof charadesTeamIds[number];
export function charadesRoster(playerIds: string[], teams: Record<string, string>) {
  return charadesTeamIds.filter(team => playerIds.some(id => teams[id] === team));
}
export function charadesActor(playerIds: string[], teams: Record<string, string>, turn: number) {
  const order = charadesRoster(playerIds, teams);
  const team = order[turn % order.length];
  const members = playerIds.filter(id => teams[id] === team);
  return members[Math.floor(turn / order.length) % members.length];
}
export function charadesTurns(playerIds: string[], teams: Record<string, string>) {
  const order = charadesRoster(playerIds, teams);
  return order.length * Math.max(...order.map(team => playerIds.filter(id => teams[id] === team).length));
}
export function charadesWinner(scores: Record<string, number>) {
  const max = Math.max(...Object.values(scores));
  const winners = Object.keys(scores).filter(team => scores[team] === max);
  return winners.length === 1 ? winners[0] : 'tie';
}
