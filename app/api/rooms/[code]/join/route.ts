import { ensureSchema, getDatabase } from '@/db';
import { previousSeat, recordSeatRequest, requestKey } from '@/lib/seat-requests';
import { NextResponse } from 'next/server';

const colors = ['red', 'yellow', 'green', 'purple', 'blue'];

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    await ensureSchema();
    const { code: rawCode } = await context.params;
    const code = rawCode.toUpperCase();
    const body = (await request.json()) as { name?: unknown; requestKey?: unknown };
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ').slice(0, 24) : '';
    if (name.length < 2) return NextResponse.json({ error: 'Enter at least two characters.' }, { status: 400 });

    const key = requestKey(body.requestKey);
    if (body.requestKey !== undefined && !key) return NextResponse.json({ error: 'Invalid join request.' }, { status: 400 });
    const previous = await previousSeat(key, code, name);
    if (previous) return previous;
    const database = getDatabase();
    const room = await database.prepare('SELECT id, status FROM rooms WHERE code = ?').bind(code).first<{ id: string; status: string }>();
    if (!room) return NextResponse.json({ error: 'That room does not exist.' }, { status: 404 });
    if (room.status !== 'lobby') return NextResponse.json({ error: 'That game has already started.' }, { status: 409 });

    const activeGame = await database.prepare('SELECT id FROM game_sessions WHERE room_id = ?').bind(room.id).first();
    if (activeGame) return NextResponse.json({ error: 'A game is in progress. Wait for the host to return to the lobby.' }, { status: 409 });

    const countRow = await database.prepare('SELECT COUNT(*) AS count FROM players WHERE room_id = ?').bind(room.id).first<{ count: number }>();
    if ((countRow?.count ?? 0) >= 12) return NextResponse.json({ error: 'That room is full.' }, { status: 409 });

    const playerId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const now = Date.now();
    const color = colors[parseInt(playerId.slice(0, 4), 16) % colors.length];
    try {
      const insertion = database.prepare(`INSERT INTO players (id, room_id, name, avatar_color, session_token, is_host, joined_at, last_seen)
        SELECT ?, ?, ?, ?, ?, 0, ?, ?
        WHERE (SELECT COUNT(*) FROM players WHERE room_id = ?) < 12
        AND NOT EXISTS (SELECT 1 FROM game_sessions WHERE room_id = ?)` )
        .bind(playerId, room.id, name, color, token, now, now, room.id, room.id);
      // Both statements commit together; the FK rolls back a request if no seat was inserted.
      const [inserted] = await database.batch([insertion, ...(key ? [recordSeatRequest(key, code, name, playerId, token)] : [])]);
      if (!inserted.meta.changes) return NextResponse.json({ error: 'The room filled up or a game started. Try again after the host returns to the lobby.' }, { status: 409 });
    } catch (error) {
      const previous = await previousSeat(key, code, name);
      if (previous) return previous;
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes('foreign key')) return NextResponse.json({ error: 'The room filled up or a game started. Try again after the host returns to the lobby.' }, { status: 409 });
      if (message.toLowerCase().includes('unique')) return NextResponse.json({ error: 'Someone in the room already has that name.' }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ code, playerId, token });
  } catch (error) {
    console.error('join room failed', error);
    return NextResponse.json({ error: 'Could not join the room.' }, { status: 500 });
  }
}
