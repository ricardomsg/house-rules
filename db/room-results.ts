import { getDatabase } from '@/db';
import { aggregateStandings, type RecordedResult } from '@/lib/room-standings';

export async function roomStandings(roomId: string, players: RecordedResult['players']) {
  const rows = await getDatabase().prepare('SELECT id, outcome_json AS outcomeJson, finished_at AS finishedAt FROM room_results WHERE room_id = ? ORDER BY finished_at ASC, id ASC').bind(roomId).all<{ id: string; outcomeJson: string; finishedAt: number }>();
  const results = rows.results.map(row => ({ ...JSON.parse(row.outcomeJson), id: row.id, finishedAt: row.finishedAt })) as RecordedResult[];
  return aggregateStandings(results, players);
}
