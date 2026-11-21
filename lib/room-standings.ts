export type NightAward = { playerId: string; score: number; points: number; won: boolean };
export type NightOutcome = { slug: string; kind: 'competitive' | 'cooperative' | 'creative'; awards: NightAward[] };
export type RecordedResult = NightOutcome & { id: string; finishedAt: number; players: Array<{ id: string; name: string; avatarColor: string }> };
export type NightStanding = { id: string; name: string; avatarColor: string; points: number; wins: number; played: number; rank: number; present: boolean };
export type RoomStandings = { standings: NightStanding[]; recent: RecordedResult[]; gamesPlayed: number };

type ScorableState = {
  slug: string; phase: string; playerIds: string[]; scores: Record<string, number>;
  advocateRatingCounts?: Record<string, number>;
  truthStorytellerIndex?: number; signalReceiverIndex?: number; writersDirectorIndex?: number;
  nightCrewWins?: number; nightSaboteurWins?: number;
  signalCorrectCount?: number; charadesTeams?: Record<string, string>; fishbowlTeams?: Record<string, string>;
  charadesTeamScores?: Record<string, number>; fishbowlTeamScores?: Record<string, number>; nightRoles?: Record<string, string>;
  result?: { nightWinner?: string; charadesWinner?: string; fishbowlWinner?: string; accuracy?: number };
};
export function advocateAverage(state: Pick<ScorableState, 'scores' | 'playerIds' | 'advocateRatingCounts'>, id: string) {
  const count = state.advocateRatingCounts?.[id] ?? state.playerIds.length - 1;
  return count > 0 ? (state.scores[id] ?? 0) / count : 0;
}

export function completeOutcome(s: ScorableState): NightOutcome | null {
  const last = s.playerIds.length - 1;
  const fullLap = s.slug === 'devils-advocate' ? s.phase === 'advocate-final'
    : s.slug === 'two-truths' ? s.phase === 'truths-final' || (s.phase === 'results' && s.truthStorytellerIndex === last)
    : s.slug === 'signal-lost' ? s.phase === 'signal-final' || (s.phase === 'results' && s.signalReceiverIndex === last)
    : s.slug === 'writers-room' ? s.phase === 'writers-final' || (s.phase === 'results' && s.writersDirectorIndex === last)
    : s.slug === 'night-shift' ? Boolean(s.result?.nightWinner)
    : s.slug === 'doodle-relay' ? s.phase === 'relay-final'
    : s.phase === 'results';
  if (!fullLap) return null;
  let kind: NightOutcome['kind'] = 'competitive';
  let scores = { ...s.scores };
  let winners: string[];
  const teamScores = s.slug === 'charades' ? s.charadesTeamScores : s.fishbowlTeamScores;
  const teams = s.slug === 'charades' ? s.charadesTeams : s.fishbowlTeams;
  if (s.slug === 'charades' || s.slug === 'fishbowl') {
    scores = Object.fromEntries(s.playerIds.map(id => [id, teamScores?.[teams?.[id] ?? ''] ?? 0]));
  }
  if (s.slug === 'devils-advocate') scores = Object.fromEntries(s.playerIds.map(id => [id, advocateAverage(s, id)]));
  const high = Math.max(0, ...Object.values(scores));
  winners = high > 0 ? s.playerIds.filter(id => scores[id] === high) : [];
  if (s.slug === 'night-shift') {
    winners = s.playerIds.filter(id => s.nightRoles?.[id] === s.result?.nightWinner);
    scores = Object.fromEntries(s.playerIds.map(id => [id, s.nightRoles?.[id] === 'crew' ? s.nightCrewWins ?? 0 : s.nightSaboteurWins ?? 0]));
  } else if (s.slug === 'signal-lost') {
    kind = 'cooperative';
    const correct = s.signalCorrectCount ?? 0;
    scores = Object.fromEntries(s.playerIds.map(id => [id, correct]));
    winners = correct >= Math.ceil(s.playerIds.length / 2) ? s.playerIds : [];
  } else if (s.slug === 'secret-settlers') {
    kind = 'cooperative';
    winners = s.playerIds.filter(id => (scores[id] ?? 0) > 0);
  } else if (s.slug === 'doodle-relay') {
    kind = 'creative'; winners = []; scores = {};
  }
  return { slug: s.slug, kind, awards: s.playerIds.map(playerId => ({ playerId, score: scores[playerId] ?? 0, won: winners.includes(playerId), points: winners.includes(playerId) ? 3 : 1 })) };
}

export function aggregateStandings(results: RecordedResult[], players: RecordedResult['players']): RoomStandings {
  const present = new Set(players.map(p => p.id));
  const entries = new Map<string, Omit<NightStanding, 'rank'>>();
  for (const player of players) entries.set(player.id, { ...player, points: 0, wins: 0, played: 0, present: true });
  for (const result of results) for (const award of result.awards) {
    const player = result.players.find(p => p.id === award.playerId);
    if (!player) continue;
    const entry = entries.get(player.id) ?? { ...player, points: 0, wins: 0, played: 0, present: present.has(player.id) };
    entry.points += award.points; entry.wins += Number(award.won); entry.played++;
    entries.set(player.id, entry);
  }
  const ordered = [...entries.values()].sort((a,b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name, 'pt-PT'));
  const standings: NightStanding[] = ordered.map((entry, index) => ({ ...entry, rank: index + 1 }));
  standings.forEach((entry,index) => { if (index && entry.points === standings[index-1].points && entry.wins === standings[index-1].wins) entry.rank = standings[index-1].rank; });
  return { standings, recent: results.slice(-8).reverse(), gamesPlayed: results.length };
}

// Alternate teams even when the roster has an odd number of players.
export function teamActor(playerIds: string[], turn: number): string {
  const team = playerIds.filter((_,index) => index % 2 === turn % 2);
  return team[Math.floor(turn / 2) % team.length];
}
export function equalTeamTurns(playerCount: number) { return 2 * Math.ceil(playerCount / 2); }
