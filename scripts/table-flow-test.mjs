import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importTypeScript } from './load-typescript.mjs';

// Real handlers + isolated SQLite exercise privacy, stale requests and automatic flow.
const directory = mkdtempSync(join(tmpdir(), 'house-rules-table-flow-'));
process.env.DATABASE_PATH = join(directory, 'test.sqlite');
const realNow = Date.now;
const realError = console.error;
console.error = (...args) => {
  if (args.some(value => value instanceof Error && value.message === 'DECK_EXHAUSTED')) return;
  realError(...args.map(value => value instanceof Error ? value.message : value));
};
let now = realNow();
Date.now = () => now;
const { activeOutsiderCards } = await importTypeScript('lib/card-catalog.ts');
const { POST: create } = await importTypeScript('app/api/rooms/route.ts');
const { POST: joinRoom } = await importTypeScript('app/api/rooms/[code]/join/route.ts');
const { POST: game } = await importTypeScript('app/api/rooms/[code]/game/route.ts');
const { getDatabase } = await importTypeScript('db/index.ts');
const { outsiderDecks } = await importTypeScript('lib/game-content.ts');

async function send(handler, body, code = '', status = 200) {
  const response = await handler(new Request('http://localhost/api/rooms', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ code }) });
  const value = await response.json();
  assert.equal(response.status, status, `${body.action ?? 'room'}: ${JSON.stringify(value)}`);
  return value;
}
async function table(count) {
  const host = await send(create, { name: 'Table host' });
  const seats = [host];
  for (let i = 1; i < count; i++) { now++; seats.push(await send(joinRoom, { name: `Guest ${i}` }, host.code)); }
  const action = (seat, action, payload = {}, status = 200) => send(game, { token: seat.token, action, ...payload }, host.code, status);
  const state = async () => {
    const view = await action(host, 'view');
    const row = await getDatabase().prepare('SELECT state_json AS state FROM game_sessions WHERE id = ?').bind(view.gameId).first();
    return JSON.parse(row.state);
  };
  return { host, seats, action, state };
}
function hiddenIncident(view) {
  for (const field of ['privatePrompt', 'cardTitle', 'note']) assert.equal(view[field], undefined, `${field} leaked after briefing`);
}
async function finishVotes({ host, seats, action }) {
  let view = await action(host, 'vote', { targetId: seats[1].playerId });
  assert.equal(view.phase, 'vote');
  assert.equal(view.submittedCount, 1);
  view = await action(host, 'vote', { targetId: seats[2].playerId });
  assert.equal(view.ownVoteTargetId, seats[2].playerId, 'the player could not change their vote');
  assert.equal(view.submittedCount, 1, 'changing a vote counted twice');
  const guest = await action(seats[1], 'view');
  assert.equal(guest.ownVoteTargetId, undefined, 'another player saw the host vote target');
  assert.equal(guest.voteStatus.find(entry => entry.playerId === host.playerId).voted, true);
  for (const seat of seats.slice(1, -1)) {
    view = await action(seat, 'vote', { targetId: host.playerId });
    assert.equal(view.phase, 'vote', 'results opened before every player voted');
  }
  view = await action(seats.at(-1), 'vote', { targetId: host.playerId });
  assert.equal(view.phase, 'results', 'the final vote did not finish automatically');
  const repeated = await Promise.all(seats.map(seat => action(seat, 'view')));
  assert.ok(repeated.every(value => value.phase === 'results' && value.version === view.version));
}

try {
  let room = await table(6);
  let { host, seats, action, state } = room;
  let view = await action(host, 'start', { slug: 'alibi-club' });
  assert.equal(view.phase, 'briefing');
  assert.equal(view.briefingEndsAt, now + 10_000);
  assert.ok((await Promise.all(seats.map(seat => action(seat, 'view')))).every(value => typeof value.privatePrompt === 'string'));
  await action(host, 'vote', { targetId: seats[1].playerId }, 400);
  now = view.briefingEndsAt - 1;
  assert.equal((await action(host, 'view')).phase, 'briefing');
  now++;
  const expired = await Promise.all(seats.map(seat => action(seat, 'view')));
  assert.ok(expired.every(value => value.phase === 'vote'));
  assert.ok(expired.every(value => value.version === expired[0].version), 'simultaneous expiry advanced more than once');
  expired.forEach(hiddenIncident);
  // A fresh request, rather than merely hiding old DOM, must also omit the incident.
  hiddenIncident(await action(seats[2], 'view'));
  await finishVotes(room);
  await action(host, 'end');

  for (const slug of ['alibi-club', 'house-rule']) {
    room = await table(6);
    ({ host, seats, action, state } = room);
    view = await action(host, 'start', { slug });
    const seen = new Set([(await state()).contentIndex]);
    const stale = { gameId: view.gameId, version: view.version };
    await action(seats[1], 'skip-card', stale, 403);
    assert.equal((await action(host, 'view')).version, view.version);
    view = await action(host, 'skip-card', stale);
    assert.equal(view.round, 2);
    await action(host, 'skip-card', stale, 409);
    assert.equal((await action(host, 'view')).round, 2, 'a stale skip discarded a second card');
    let index = (await state()).contentIndex;
    assert.ok(!seen.has(index));
    seen.add(index);
    while (seen.size < activeOutsiderCards(slug).length) {
      view = await action(host, 'skip-card', { gameId: view.gameId, version: view.version });
      index = (await state()).contentIndex;
      assert.ok(!seen.has(index), `${slug}: repeated a card before exhausting the deck`);
      seen.add(index);
    }
    const last = index;
    await action(host, 'skip-card', { gameId: view.gameId, version: view.version }, 409);
    assert.equal((await state()).contentIndex, last, 'exhausted skip changed the current card');
    if (slug === 'house-rule') {
      assert.equal(view.phase, 'vote', 'House Rules should allow voting from the start');
      await finishVotes(room);
    } else {
      now = view.briefingEndsAt;
      await action(host, 'view');
      const forced = await action(host, 'advance');
      assert.equal(forced.phase, 'results', 'host could not finish without votes');
    }
    await action(host, 'end');
  }

  room = await table(6);
  ({ host, seats, action, state } = room);
  // Deployment compatibility: old sessions have stable card indices and no clock yet.
  assert.equal(outsiderDecks['alibi-club'][0].title, 'The Midnight Aquarium');
  assert.equal(outsiderDecks['house-rule'][0].regular, 'Every answer must include the name of something you could eat.');
  view = await action(host, 'start', { slug: 'alibi-club' });
  const legacy = await state();
  delete legacy.briefingEndsAt;
  legacy.contentIndex = 0;
  await getDatabase().prepare('UPDATE game_sessions SET state_json = ? WHERE id = ?').bind(JSON.stringify(legacy), view.gameId).run();
  const legacyViews = await Promise.all(seats.map(seat => action(seat, 'view')));
  assert.ok(legacyViews.every(value => value.phase === 'briefing' && value.briefingEndsAt === now + 10_000));
  assert.ok(legacyViews.every(value => value.version === legacyViews[0].version), 'legacy clocks initialized more than once');
  assert.ok(legacyViews.some(value => value.privatePrompt.includes('aquarium')));
  now += 10_000;
  hiddenIncident(await action(host, 'view'));
  await action(host, 'end');

  for (const [slug, defaultSeconds] of [['charades', 60], ['fishbowl', 45], ['categories', 90]]) {
    for (const custom of [false, true]) {
      view = await action(host, 'start', { slug, ...(custom ? { settings: { turnSeconds: 15 } } : {}) });
      if (slug === 'fishbowl') {
        for (const [index, seat] of seats.entries()) await action(seat, 'fishbowl-prompts', { value: [`Test object ${index}`, `Test person ${index}`] });
        view = await action(host, 'advance');
        assert.equal(view.phase, 'fishbowl-ready');
      }
      view = await action(host, 'advance');
      assert.equal(view.turnEndsAt ?? view.categoriesEndsAt, now + (custom ? 15 : defaultSeconds) * 1000, `${slug}: configured clock ignored`);
      await action(host, 'end');
    }
  }

  for (const settings of [null, [], { defenseSeconds: 14 }, { defenseSeconds: 301 }, { defenseSeconds: '60' }, { challengeSeconds: -1 }, { challengeSeconds: 301 }, { challengeSeconds: 1.5 }, { turnSeconds: 0 }]) {
    await action(host, 'start', { slug: 'devils-advocate', settings }, 400);
  }
  view = await action(host, 'start', { slug: 'devils-advocate', settings: { defenseSeconds: 15, challengeSeconds: 30 } });
  assert.equal(view.defenseSeconds, 15);
  assert.equal(view.challengeSeconds, 30);
  view = await action(host, 'advance');
  assert.equal(view.phase, 'advocate-defense');
  assert.equal(view.turnEndsAt, now + 15_000);
  const ratingSeat = seats.find(seat => seat.playerId !== view.currentPlayerId);
  await action(ratingSeat, 'advocate-rate', { value: 7 }, 409);
  now = view.turnEndsAt;
  const questions = await Promise.all(seats.map(seat => action(seat, 'view')));
  assert.ok(questions.every(value => value.phase === 'advocate-challenge'));
  assert.ok(questions.every(value => value.version === questions[0].version));
  assert.equal(questions[0].turnEndsAt, now + 30_000);
  await action(ratingSeat, 'advocate-rate', { value: 7 }, 409);
  now = questions[0].turnEndsAt;
  const ratings = await Promise.all(seats.map(seat => action(seat, 'view')));
  assert.ok(ratings.every(value => value.phase === 'advocate-rating'));
  assert.ok(ratings.every(value => value.version === ratings[0].version));
  assert.equal(ratings[0].turnEndsAt, undefined);
  assert.equal((await action(ratingSeat, 'advocate-rate', { value: 7 })).ownRating, 7);
  await action(host, 'end');

  await action(host, 'start', { slug: 'devils-advocate' });
  view = await action(host, 'advance');
  assert.equal(view.defenseSeconds, 60);
  assert.equal(view.challengeSeconds, 0);
  assert.equal(view.turnEndsAt, now + 60_000);
  now = view.turnEndsAt;
  assert.equal((await action(host, 'view')).phase, 'advocate-rating');
  await action(host, 'end');

  // Late polling must not grant a fresh question period after both deadlines passed.
  await action(host, 'start', { slug: 'devils-advocate', settings: { defenseSeconds: 15, challengeSeconds: 30 } });
  view = await action(host, 'advance');
  now = view.turnEndsAt + 31_000;
  assert.equal((await action(host, 'view')).phase, 'advocate-rating');
  console.log('PASS: six-player automatic voting, mutable private votes, ten-second Alibi memory privacy, host override/skip safety, nonrepeating decks, configurable defense/questions, and concurrent/late timer expiry.');
} finally {
  Date.now = realNow;
  console.error = realError;
  getDatabase().close();
  rmSync(directory, { recursive: true, force: true });
}
