import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importTypeScript } from './load-typescript.mjs';

const directory = mkdtempSync(join(tmpdir(), 'house-rules-charades-'));
process.env.DATABASE_PATH = join(directory, 'test.sqlite');
const realNow = Date.now;
let now = realNow();
Date.now = () => now;
const { POST: create } = await importTypeScript('app/api/rooms/route.ts');
const { POST: joinRoom } = await importTypeScript('app/api/rooms/[code]/join/route.ts');
const { POST: game } = await importTypeScript('app/api/rooms/[code]/game/route.ts');
const { getDatabase } = await importTypeScript('db/index.ts');
async function send(handler, body, code = '', status = 200) {
  const response = await handler(new Request('http://localhost/api/rooms', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ code }) });
  const value = await response.json();
  assert.equal(response.status, status, JSON.stringify(value));
  return value;
}
try {
  const host = await send(create, { name: 'Host' });
  const seats = [host];
  for (let i = 1; i < 4; i++) { now++; seats.push(await send(joinRoom, { name: `Guest ${i}` }, host.code)); }
  const action = (seat, action, payload = {}, status = 200) => send(game, { token: seat.token, action, ...payload }, host.code, status);
  for (const finish of ['manual', 'expiry', 'recovery']) {
    await action(host, 'start', { slug: 'charades' });
    const prompts = new Set();
    for (let index = 0; index < 4; index++) {
      const turn = await action(host, 'advance');
      const actor = seats.find(seat => seat.playerId === turn.actorId);
      const view = await action(actor, 'view');
      assert.ok(view.prompt);
      assert.ok(!prompts.has(view.prompt.prompt), `${finish}: the next team got the previous team's card`);
      prompts.add(view.prompt.prompt);
      const teammateId = view.teams[view.actorTeam].find(id => id !== actor.playerId);
      assert.equal((await action(seats.find(seat => seat.playerId === teammateId), 'view')).prompt, undefined);
      const opponent = seats.find(seat => !view.teams[view.actorTeam].includes(seat.playerId));
      assert.equal((await action(opponent, 'view')).prompt.prompt, view.prompt.prompt);
      if (finish === 'expiry') {
        now = turn.turnEndsAt + 1;
        const recaps = await Promise.all(seats.map(seat => action(seat, 'view')));
        assert.ok(recaps.every(recap => recap.phase === 'charades-recap'));
        assert.ok(recaps.every(recap => recap.version === recaps[0].version), 'concurrent expiry skipped extra cards');
      } else if (finish === 'recovery') {
        await action(host, 'recover', { gameId: turn.gameId, version: turn.version });
      } else {
        await action(actor, 'charades-finish', { gameId: turn.gameId, version: turn.version });
        // Retrying an already finished turn must not consume another card.
        await action(actor, 'charades-finish');
      }
      const after = await action(host, 'advance');
      assert.equal(after.phase, index === 3 ? 'results' : 'charades-ready');
    }
    assert.equal((await action(host, 'view')).teamScores.blue, 0, 'discarding the final card must not award points');
    await action(host, 'end');
  }
  // Skipping an actor before the clock starts must not discard an unseen card.
  await action(host, 'start', { slug: 'charades' });
  const ready = await action(host, 'view');
  const before = await getDatabase().prepare('SELECT state_json AS state FROM game_sessions WHERE id = ?').bind(ready.gameId).first();
  await action(host, 'recover', { gameId: ready.gameId, version: ready.version });
  const after = await getDatabase().prepare('SELECT state_json AS state FROM game_sessions WHERE id = ?').bind(ready.gameId).first();
  assert.equal(JSON.parse(after.state).charadesPromptCursor, JSON.parse(before.state).charadesPromptCursor);
  console.log('PASS: every Mímica team gets a fresh card after manual finish, timer expiry or host recovery; concurrent expiry, retries, scoring and hidden cards remain safe.');
} finally {
  Date.now = realNow;
  getDatabase().close();
  rmSync(directory, { recursive: true, force: true });
}
