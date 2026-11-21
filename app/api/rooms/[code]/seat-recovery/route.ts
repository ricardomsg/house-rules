import { ensureSchema, getDatabase } from '@/db';
import { requestKey } from '@/lib/seat-requests';
import { NextResponse } from 'next/server';

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });
type Recovery = { id: string; player_id: string; verification_code: string; approved_token: string | null; rejected: number; expires_at: number };

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    await ensureSchema();
    const code = (await context.params).code.toUpperCase();
    const body = await request.json() as { action?: string; token?: string; requestKey?: string; targetId?: string };
    const db = getDatabase();
    const room = await db.prepare('SELECT id FROM rooms WHERE code = ?').bind(code).first<{ id: string }>();
    if (!room) return error('That room does not exist.', 404);
    const now = Date.now();
    const key = requestKey(body.requestKey);
    if (body.action === 'request' || body.action === 'poll') {
      if (!key) return error('Invalid recovery request.', 400);
      let recovery = await db.prepare('SELECT * FROM seat_recoveries WHERE id = ? AND room_id = ?').bind(key, room.id).first<Recovery>();
      if (!recovery && body.action === 'request') {
        const player = await db.prepare('SELECT id, session_token FROM players WHERE id = ? AND room_id = ?').bind(body.targetId ?? '', room.id).first<{ id: string; session_token: string }>();
        if (!player) return error('Choose your existing seat.', 400);
        const verification = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
        // Bound unauthenticated requests per seat; the host can dismiss unwanted ones.
        await db.prepare('DELETE FROM seat_recoveries WHERE room_id = ? AND expires_at <= ?').bind(room.id, now).run();
        await db.prepare(`INSERT OR IGNORE INTO seat_recoveries (id, room_id, player_id, original_token, verification_code, expires_at)
          SELECT ?, ?, ?, ?, ?, ? WHERE
          (SELECT COUNT(*) FROM seat_recoveries WHERE player_id = ? AND rejected = 0 AND approved_token IS NULL AND expires_at > ? AND original_token = ?) < 5`)
          .bind(key, room.id, player.id, player.session_token, verification, now + 15 * 60 * 1000, player.id, now, player.session_token).run();
        recovery = await db.prepare('SELECT * FROM seat_recoveries WHERE id = ? AND room_id = ?').bind(key, room.id).first<Recovery>();
        if (!recovery) return error('Ask the host to dismiss old recovery requests, then try again.', 429);
      }
      if (!recovery || recovery.expires_at <= now) return error('Recovery request expired. Request your seat again.', 410);
      if (body.targetId && recovery.player_id !== body.targetId) return error('Invalid recovery request.', 409);
      if (recovery.rejected) return NextResponse.json({ status: 'rejected' });
      if (recovery.approved_token) {
        const seat = await db.prepare('SELECT id AS playerId, name, session_token AS token FROM players WHERE id = ? AND room_id = ? AND session_token = ?')
          .bind(recovery.player_id, room.id, recovery.approved_token).first();
        if (!seat) return error('Recovery request expired. Request your seat again.', 410);
        return NextResponse.json({ status: 'approved', session: seat });
      }
      const current = await db.prepare('SELECT 1 FROM players p JOIN seat_recoveries q ON q.player_id = p.id WHERE q.id = ? AND p.session_token = q.original_token').bind(key).first();
      if (!current) return error('The seat or host changed. Request recovery again.', 409);
      return NextResponse.json({ status: 'pending', verificationCode: recovery.verification_code });
    }
    // Room codes and player names never authorize recovery. Only the current host can.
    const host = await db.prepare(`SELECT p.id FROM players p JOIN rooms r ON r.id = p.room_id
      WHERE r.id = ? AND r.host_player_id = p.id AND p.session_token = ?`).bind(room.id, body.token ?? '').first<{ id: string }>();
    if (!host) return error('Only the host can approve a replacement phone.', 403);
    if (body.action === 'list') {
      const rows = await db.prepare(`SELECT q.id, q.player_id AS playerId, p.name, q.verification_code AS verificationCode
        FROM seat_recoveries q JOIN players p ON p.id = q.player_id
        WHERE q.room_id = ? AND q.expires_at > ? AND q.rejected = 0 AND q.approved_token IS NULL AND q.original_token = p.session_token
        ORDER BY q.expires_at`).bind(room.id, now).all();
      return NextResponse.json({ requests: rows.results });
    }
    if (!key) return error('Invalid recovery request.', 400);
    if (body.action === 'reject') {
      await db.prepare(`UPDATE seat_recoveries SET rejected = 1 WHERE id = ? AND room_id = ? AND approved_token IS NULL
        AND EXISTS (SELECT 1 FROM rooms r JOIN players p ON p.id = r.host_player_id WHERE r.id = ? AND p.session_token = ?)`)
        .bind(key, room.id, room.id, body.token ?? '').run();
      return NextResponse.json({ ok: true });
    }
    if (body.action !== 'approve') return error('Invalid recovery request.', 400);
    const token = crypto.randomUUID();
    const results = await db.batch([
      db.prepare(`UPDATE players SET session_token = ?, last_seen = ? WHERE room_id = ? AND id =
        (SELECT player_id FROM seat_recoveries WHERE id = ? AND room_id = ? AND rejected = 0 AND approved_token IS NULL AND expires_at > ? AND original_token = players.session_token)
        AND EXISTS (SELECT 1 FROM rooms r JOIN players h ON h.id = r.host_player_id WHERE r.id = ? AND h.session_token = ?)`)
        .bind(token, now, room.id, key, room.id, now, room.id, body.token ?? ''),
      db.prepare('UPDATE seat_recoveries SET approved_token = ? WHERE id = ? AND room_id = ? AND changes() = 1').bind(token, key, room.id),
    ]);
    if (!results[0].meta.changes) return error('The seat or host changed. Request recovery again.', 409);
    return NextResponse.json({ ok: true });
  } catch (cause) {
    console.error('seat recovery failed', cause);
    return error('Could not recover the seat. Try again.', 500);
  }
}
