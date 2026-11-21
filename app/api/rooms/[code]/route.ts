import { ensureSchema, getDatabase } from '@/db';
import { roomStandings } from '@/db/room-results';
import { NextResponse } from 'next/server';
import { HOST_TAKEOVER_DELAY } from '@/lib/game-recovery';

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    await ensureSchema();
    const { code: rawCode } = await context.params;
    const code = rawCode.toUpperCase();
    const database = getDatabase();
    const room = await database.prepare('SELECT id, code, status, created_at AS createdAt FROM rooms WHERE code = ?').bind(code).first<{ id: string; code: string; status: string; createdAt: number }>();
    if (!room) return NextResponse.json({ error: 'We could not find that room.' }, { status: 404 });

    const result = await database.prepare('SELECT id, name, avatar_color AS avatarColor, is_host AS isHost, last_seen AS lastSeen FROM players WHERE room_id = ? ORDER BY is_host DESC, joined_at ASC').bind(room.id).all<{ id: string; name: string; avatarColor: string; isHost: number; lastSeen: number }>();
    const players = result.results.map((player) => ({ ...player, isHost: Boolean(player.isHost), online: Date.now() - Number(player.lastSeen) < 30000 }));
    const host = players.find(player => player.isHost);
    const hostCanBeReplaced = Boolean(host && Date.now() - host.lastSeen >= HOST_TAKEOVER_DELAY);
    return NextResponse.json({ room, players, hostCanBeReplaced, scoreboard: await roomStandings(room.id, players) });
  } catch (error) {
    console.error('get room failed', error);
    return NextResponse.json({ error: 'The room is unavailable right now.' }, { status: 500 });
  }
}
