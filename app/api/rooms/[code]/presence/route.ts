import { ensureSchema, getDatabase } from '@/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    await ensureSchema();
    const { code: rawCode } = await context.params;
    const code = rawCode.toUpperCase();
    const body = (await request.json()) as { token?: unknown };
    if (typeof body.token !== 'string') return NextResponse.json({ error: 'Missing session.' }, { status: 401 });
    const result = await getDatabase().prepare('UPDATE players SET last_seen = ? WHERE session_token = ? AND room_id = (SELECT id FROM rooms WHERE code = ?)').bind(Date.now(), body.token, code).run();
    if (!result.meta.changes) return NextResponse.json({ error: 'Session not found.' }, { status: 401 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('presence update failed', error);
    return NextResponse.json({ error: 'Could not update presence.' }, { status: 500 });
  }
}
