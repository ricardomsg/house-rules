import { getDatabase } from '@/db';
import { NextResponse } from 'next/server';

export function requestKey(value: unknown) {
  return typeof value === 'string' && /^[a-zA-Z0-9-]{32,80}$/.test(value) ? value : null;
}

export async function previousSeat(key: string | null, scope: string, name: string) {
  if (!key) return null;
  const row = await getDatabase().prepare(`SELECT q.scope, q.name, r.code, p.id AS playerId,
    CASE WHEN p.session_token = q.issued_token THEN p.session_token ELSE NULL END AS token
    FROM seat_requests q JOIN players p ON p.id = q.player_id JOIN rooms r ON r.id = p.room_id WHERE q.id = ?`)
    .bind(key).first<{ scope: string; name: string; code: string; playerId: string; token: string | null }>();
  if (!row) return null;
  if (row.scope !== scope || row.name !== name || !row.token) return NextResponse.json({ error: 'This join request has expired. Recover your seat through the host.' }, { status: 409 });
  return NextResponse.json({ code: row.code, playerId: row.playerId, token: row.token });
}

export function recordSeatRequest(key: string, scope: string, name: string, playerId: string, token: string) {
  return getDatabase().prepare('INSERT INTO seat_requests (id, scope, name, player_id, issued_token) VALUES (?, ?, ?, ?, ?)').bind(key, scope, name, playerId, token);
}
