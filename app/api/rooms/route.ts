import { ensureSchema, getDatabase } from '@/db';
import { previousSeat, recordSeatRequest, requestKey } from '@/lib/seat-requests';
import { NextResponse } from 'next/server';

const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const colors = ['blue', 'red', 'yellow', 'green', 'purple'];

function roomCode() {
  return Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
}

function cleanName(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 24) : '';
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = (await request.json()) as { name?: unknown; requestKey?: unknown };
    const name = cleanName(body.name);
    if (name.length < 2) {
      return NextResponse.json({ error: 'Tell us your name first.' }, { status: 400 });
    }

    const key = requestKey(body.requestKey);
    if (body.requestKey !== undefined && !key) return NextResponse.json({ error: 'Invalid join request.' }, { status: 400 });
    const previous = await previousSeat(key, 'create', name);
    if (previous) return previous;
    const database = getDatabase();
    const roomId = crypto.randomUUID();
    const playerId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const now = Date.now();

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const code = roomCode();
      try {
        await database.batch([
          database.prepare('INSERT INTO rooms (id, code, host_player_id, status, created_at) VALUES (?, ?, ?, ?, ?)').bind(roomId, code, playerId, 'lobby', now),
          database.prepare('INSERT INTO players (id, room_id, name, avatar_color, session_token, is_host, joined_at, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(playerId, roomId, name, colors[0], token, 1, now, now),
          ...(key ? [recordSeatRequest(key, 'create', name, playerId, token)] : []),
        ]);
        return NextResponse.json({ code, playerId, token });
      } catch (error) {
        const previous = await previousSeat(key, 'create', name);
        if (previous) return previous;
        const message = error instanceof Error ? error.message : String(error);
        if (!message.toLowerCase().includes('unique')) throw error;
      }
    }

    return NextResponse.json({ error: 'Could not find a free room code. Try again.' }, { status: 503 });
  } catch (error) {
    console.error('create room failed', error);
    return NextResponse.json({ error: 'The room could not be created.' }, { status: 500 });
  }
}
