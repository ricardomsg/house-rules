import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { importTypeScript } from './load-typescript.mjs';

// Real API handlers, isolated SQLite, controlled server time. No live site traffic.
const directory = mkdtempSync(join(tmpdir(), 'house-rules-identity-'));
process.env.DATABASE_PATH = join(directory, 'test.sqlite');
const realNow = Date.now;
let now = realNow();
Date.now = () => now;
const { POST: create } = await importTypeScript('app/api/rooms/route.ts');
const { POST: joinRoom } = await importTypeScript('app/api/rooms/[code]/join/route.ts');
const { POST: game } = await importTypeScript('app/api/rooms/[code]/game/route.ts');
const { getDatabase } = await importTypeScript('db/index.ts');
const { rankIdentityResults } = await importTypeScript('lib/identity-flow.ts');
const { default: Board } = await importTypeScript('app/room/[code]/IdentityBoard.tsx');
const { default: LanguageProvider } = await importTypeScript('app/LanguageProvider.tsx');

async function request(handler, body, code = '', status = 200) {
  const response = await handler(new Request('http://localhost/api/rooms', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ code }) });
  const value = await response.json();
  assert.equal(response.status, status, `${body.action ?? 'room'}: ${JSON.stringify(value)}`);
  return value;
}
async function table(count) {
  const host = await request(create, { name: 'Host' });
  const seats = [host];
  for (let index = 1; index < count; index++) {
    now++;
    seats.push(await request(joinRoom, { name: `Player ${index + 1}` }, host.code));
  }
  const action = (seat, action, payload = {}, status = 200) => request(game, { token: seat.token, action, ...payload }, host.code, status);
  return { host, seats, action };
}
function assertPrivacy(view) {
  assert.ok(!view.identities?.some(card => card.playerId === view.playerId), 'Own identity appeared in API response');
  if (view.phase !== 'results') assert.ok((view.identities ?? []).every(card => card.playerId === view.currentPlayerId), 'Unplayed identity leaked');
  for (const key of ['identityIndices', 'identityCards', 'identityAssignments']) assert.equal(view[key], undefined, `Leaked ${key}`);
}
async function viewsFor(table) {
  const views = await Promise.all(table.seats.map(seat => table.action(seat, 'view')));
  views.forEach(assertPrivacy);
  return views;
}
function render(view) {
  return renderToStaticMarkup(React.createElement(LanguageProvider, null,
    React.createElement(Board, { view, acting: false, remainingSeconds: 120, sendAction: async () => true })));
}

try {
  for (const count of [3, 6, 10]) {
    const t = await table(count);
    let view = await t.action(t.host, 'start', { slug: 'who-am-i' });
    assert.equal(view.phase, 'identity-briefing');
    assert.equal(view.turnSeconds, 120, 'Default identity timer must be 120 seconds');
    await viewsFor(t);
    const elapsed = [];
    const actors = [];
    for (let turn = 0; turn < count; turn++) {
      const actor = t.seats.find(seat => seat.playerId === view.currentPlayerId);
      const judge = t.seats.find(seat => seat !== actor);
      actors.push(actor.playerId);
      await t.action(actor, 'identity-replace', {}, 403);
      const before = await t.action(judge, 'view');
      const oldName = before.identities.find(card => card.playerId === actor.playerId).name;
      const replaced = await t.action(judge, 'identity-replace');
      assert.notEqual(replaced.identities.find(card => card.playerId === actor.playerId).name, oldName, 'Ready replacement must draw a fresh identity');
      assert.equal(replaced.phase, 'identity-briefing');
      const nonStarting = t.seats.find(seat => seat !== actor && seat !== t.host);
      if (nonStarting) await t.action(nonStarting, 'identity-start', {}, 403);
      // Test current player and host start authority on alternating turns.
      view = await t.action(turn % 2 ? t.host : actor, 'identity-start');
      assert.equal(view.phase, 'identity-playing');
      assert.equal(view.turnEndsAt, now + 120000);
      const deadline = view.turnEndsAt;
      await t.action(actor, 'identity-guessed', {}, 403);
      await t.action(actor, 'identity-pass', {}, 403);
      await t.action(actor, 'identity-replace', {}, 403);
      const elapsedThisTurn = 5000 + (count - turn) * 1000;
      now += 1000;
      const liveCard = (await t.action(judge, 'view')).identities[0].name;
      view = await t.action(judge, 'identity-replace');
      assert.notEqual(view.identities[0].name, liveCard);
      assert.equal(view.turnEndsAt, deadline, 'Replacement must not restart the timer');
      await viewsFor(t);
      now += elapsedThisTurn - 1000;
      const passed = turn === count - 1;
      view = await t.action(judge, passed ? 'identity-pass' : 'identity-guessed');
      elapsed.push({ playerId: actor.playerId, elapsedMs: elapsedThisTurn, solved: !passed });
      assert.equal(view.phase, turn === count - 1 ? 'results' : 'identity-briefing');
      await viewsFor(t);
    }
    assert.equal(new Set(actors).size, count, 'Each person must receive exactly one turn');
    for (const expected of elapsed) {
      const actual = view.identityResults.find(result => result.playerId === expected.playerId);
      assert.equal(actual.solved, expected.solved);
      if (expected.solved) assert.equal(actual.elapsedMs, expected.elapsedMs);
    }
    const ranking = rankIdentityResults(view.identityResults);
    assert.equal(ranking[0].playerId, actors[count - 2], 'Fastest solved turn must win');
    assert.equal(ranking.at(-1).rank, null, 'Passing gets no rank');
    // A defensive UI must also refuse own identity from a malformed server response.
    const ownSecret = 'SECRET_IDENTITY_MUST_NOT_RENDER';
    const actorView = { ...view, phase: 'identity-playing', playerId: actors[0], currentPlayerId: actors[0], identities: [{ playerId: actors[0], name: ownSecret, category: 'SECRET', solved: false }] };
    assert.ok(!render(actorView).includes(ownSecret));
    assert.ok(!render({ ...actorView, phase: 'results' }).includes(ownSecret));
    assert.ok(!render(actorView).includes('<input'), 'No typed guessing');
  }

  const t = await table(3);
  for (const turnSeconds of [0, 14, 301, 30.5, '30']) await t.action(t.host, 'start', { slug: 'who-am-i', settings: { turnSeconds } }, 400);
  let view = await t.action(t.host, 'start', { slug: 'who-am-i', settings: { turnSeconds: 30 } });
  const actor = t.seats.find(seat => seat.playerId === view.currentPlayerId);
  view = await t.action(actor, 'identity-start');
  const deadline = view.turnEndsAt;
  now = deadline - 1;
  assert.equal((await t.action(actor, 'view')).phase, 'identity-playing');
  now++;
  const expiry = await viewsFor(t);
  assert.ok(expiry.every(v => v.phase === 'identity-briefing'));
  assert.ok(expiry.every(v => v.currentPlayerId !== actor.playerId));
  const failed = expiry[0].identityResults.find(result => result.playerId === actor.playerId);
  assert.equal(failed.solved, false);
  assert.equal(expiry[0].identityResults.length, 1, 'Concurrent expiry polls must settle exactly once');
  const next = t.seats.find(seat => seat.playerId === expiry[0].currentPlayerId);
  view = await t.action(next, 'identity-start');
  assert.equal(view.turnEndsAt, now + 30000, 'Next turn starts with full configured time');

  console.log('PASS: identity 3/6/10-player full games, 120-second default, configurable limits, actor/host start, other-player judging, fresh replacements preserving clock, expiry once, privacy every phase, and fastest-time ranking.');
} finally {
  Date.now = realNow;
  getDatabase().close();
  delete globalThis.houseRulesDatabase;
  rmSync(directory, { recursive: true, force: true });
}
