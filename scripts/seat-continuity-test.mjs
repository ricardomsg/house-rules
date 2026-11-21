import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importTypeScript } from './load-typescript.mjs';
const directory = mkdtempSync(join(tmpdir(), 'house-rules-seats-'));
process.env.DATABASE_PATH = join(directory, 'test.sqlite');
const { POST: create } = await importTypeScript('app/api/rooms/route.ts');
const { POST: joinRoom } = await importTypeScript('app/api/rooms/[code]/join/route.ts');
const { POST: recover } = await importTypeScript('app/api/rooms/[code]/seat-recovery/route.ts');
const { POST: game } = await importTypeScript('app/api/rooms/[code]/game/route.ts');
const { getDatabase } = await importTypeScript('db/index.ts');
const base = process.env.TEST_CONTINUITY_URL;
const key = () => crypto.randomUUID();
async function send(handler, body, code = '', status = 200) {
  const options = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
  const path = handler === create ? '/api/rooms' : `/api/rooms/${code}/${handler === joinRoom ? 'join' : handler === game ? 'game' : 'seat-recovery'}`;
  const response = base ? await fetch(base + path, options) : await handler(new Request('http://localhost' + path, options), { params: Promise.resolve({ code }) });
  const value = await response.json();
  assert.equal(response.status, status, JSON.stringify(value));
  return value;
}
try {
  const hostRequest = { name: 'Host', requestKey: key() };
  const hosts = await Promise.all(Array.from({ length: 4 }, () => send(create, hostRequest)));
  assert.ok(hosts.every(host => JSON.stringify(host) === JSON.stringify(hosts[0])));
  const host = hosts[0];
  const seatRequest = { name: 'Guest', requestKey: key() };
  const seats = await Promise.all(Array.from({ length: 5 }, () => send(joinRoom, seatRequest, host.code)));
  assert.ok(seats.every(seat => JSON.stringify(seat) === JSON.stringify(seats[0])));
  const seat = seats[0];
  await send(joinRoom, { name: 'Guest', requestKey: key() }, host.code, 409);
  await send(joinRoom, { ...seatRequest, name: 'Not Guest' }, host.code, 409);
  for (let i = 2; i < 6; i++) await send(joinRoom, { name: `Guest ${i}` }, host.code);
  const action = (token, action, extra = {}, status = 200) => send(game, { token, action, ...extra }, host.code, status);
  await action(host.token, 'start', { slug: 'night-shift' });
  const oldView = await action(seat.token, 'view');
  // Retry after a lost join/create response, even though the game has since started.
  assert.deepEqual(await send(joinRoom, seatRequest, host.code), seat);
  assert.deepEqual(await send(create, hostRequest), host);
  const requestKey = key();
  const request = { action: 'request', targetId: seat.playerId, requestKey };
  const pending = await send(recover, request, host.code);
  assert.equal(pending.status, 'pending'); assert.match(pending.verificationCode, /^\d{6}$/);
  assert.equal(pending.token, undefined); assert.equal(pending.session, undefined);
  assert.deepEqual(await send(recover, request, host.code), pending);
  await send(recover, { action: 'list', token: seat.token }, host.code, 403);
  await send(recover, { action: 'approve', requestKey, token: seat.token }, host.code, 403);
  await send(recover, { action: 'approve', requestKey }, host.code, 403);
  const other = await send(create, { name: 'Other Host' });
  await send(recover, { action: 'poll', requestKey }, other.code, 410);
  await send(recover, { action: 'approve', requestKey, token: other.token }, host.code, 403);
  const competingKey = key();
  await send(recover, { ...request, requestKey: competingKey }, host.code);
  const listed = await send(recover, { action: 'list', token: host.token }, host.code);
  assert.equal(listed.requests.length, 2);
  assert.equal(listed.requests[0].verificationCode, pending.verificationCode);
  await send(recover, { action: 'approve', requestKey, token: host.token }, host.code);
  const restored = await send(recover, { action: 'poll', requestKey }, host.code);
  assert.equal(restored.status, 'approved'); assert.equal(restored.session.playerId, seat.playerId);
  assert.notEqual(restored.session.token, seat.token);
  const restoredView = await action(restored.session.token, 'view');
  assert.equal(restoredView.gameId, oldView.gameId); assert.equal(restoredView.nightRole, oldView.nightRole);
  assert.equal(restoredView.version, oldView.version); assert.equal(restoredView.round, oldView.round);
  await action(seat.token, 'view', {}, 401);
  await send(joinRoom, seatRequest, host.code, 409); // Old retry key must not reveal the rotated credential.
  await send(recover, { action: 'approve', requestKey: competingKey, token: host.token }, host.code, 409);
  await send(recover, { action: 'approve', requestKey, token: host.token }, host.code, 409);
  const rejectedKey = key();
  await send(recover, { ...request, requestKey: rejectedKey }, host.code);
  await send(recover, { action: 'reject', requestKey: rejectedKey, token: host.token }, host.code);
  assert.equal((await send(recover, { action: 'poll', requestKey: rejectedKey }, host.code)).status, 'rejected');
  await send(recover, { action: 'approve', requestKey: rejectedKey, token: host.token }, host.code, 409);
  if (!base) {
    const expiredKey = key();
    await send(recover, { ...request, requestKey: expiredKey }, host.code);
    await getDatabase().prepare('UPDATE seat_recoveries SET expires_at = 0 WHERE id = ?').bind(expiredKey).run();
    await send(recover, { action: 'poll', requestKey: expiredKey }, host.code, 410);
    await send(recover, { action: 'approve', requestKey: expiredKey, token: host.token }, host.code, 409);
  }
  const count = base ? { count: (await (await fetch(`${base}/api/rooms/${host.code}`)).json()).players.length }
    : await getDatabase().prepare('SELECT COUNT(*) AS count FROM players WHERE room_id = (SELECT id FROM rooms WHERE code = ?)').bind(host.code).first();
  assert.equal(count.count, 6);
  console.log('PASS: concurrent/lost joins recover one seat; host-approved phone replacement retains secret role and progress; old credentials, foreign rooms, expired, rejected and competing requests cannot claim it.');
} finally { getDatabase().close(); rmSync(directory, { recursive: true, force: true }); }
