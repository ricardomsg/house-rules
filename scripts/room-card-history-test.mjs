import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importTypeScript } from './load-typescript.mjs';

const directory = mkdtempSync(join(tmpdir(), 'house-rules-card-history-'));
process.env.DATABASE_PATH = join(directory, 'test.sqlite');
const realNow = Date.now;
const realError = console.error;
let now = realNow();
Date.now = () => now;
console.error = (...args) => {
  if (args.some(value => value instanceof Error && value.message === 'DECK_EXHAUSTED')) return;
  realError(...args.map(value => value instanceof Error ? value.message : value));
};
const { activeOutsiderCards } = await importTypeScript('lib/card-catalog.ts');
const { POST: create } = await importTypeScript('app/api/rooms/route.ts');
const { POST: joinRoom } = await importTypeScript('app/api/rooms/[code]/join/route.ts');
const { POST: game } = await importTypeScript('app/api/rooms/[code]/game/route.ts');
const { getDatabase } = await importTypeScript('db/index.ts');
const content = await importTypeScript('lib/game-content.ts');
const { outsiderDecks, charadesPrompts } = content;
async function send(handler, body, code = '', status = 200) {
  const response = await handler(new Request('http://localhost/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), { params: Promise.resolve({ code }) });
  const value = await response.json();
  assert.equal(response.status, status, `${body.action ?? 'room'}: ${JSON.stringify(value)}`);
  return value;
}
async function table() {
  const host = await send(create, { name: 'History host' });
  const seats = [host];
  for (let i = 1; i < 6; i++) { now++; seats.push(await send(joinRoom, { name: `Guest ${i}` }, host.code)); }
  const action = (seat, action, payload = {}, status = 200) => send(game, { token: seat.token, action, ...payload }, host.code, status);
  const state = async view => {
    const row = await getDatabase().prepare('SELECT state_json AS state FROM game_sessions WHERE id = ?').bind(view.gameId).first();
    return JSON.parse(row.state);
  };
  const { roomId } = await getDatabase().prepare('SELECT room_id AS roomId FROM players WHERE id = ?').bind(host.playerId).first();
  return { host, seats, action, state, roomId };
}
try {
  for (const slug of ['alibi-club', 'house-rule', 'head-fake']) {
    const { host, action, state } = await table();
    const seen = new Set();
    const record = async view => {
      const index = (await state(view)).contentIndex;
      assert.ok(!seen.has(index), `${slug}: room repeated card ${index}`);
      seen.add(index);
    };
    let view = await action(host, 'start', { slug });
    await record(view);
    await action(host, 'end');
    view = await action(host, 'start', { slug });
    await record(view);
    view = await action(host, 'restart');
    await record(view);
    while (seen.size < activeOutsiderCards(slug).length) {
      view = await action(host, 'skip-card', { gameId: view.gameId, version: view.version });
      await record(view);
    }
    const lastState = await state(view);
    const exhausted = await action(host, 'skip-card', { gameId: view.gameId, version: view.version }, 409);
    assert.match(exhausted.error, /unseen cards/i);
    assert.deepEqual(await state(view), lastState, 'exhausted skip changed the round');
    await action(host, 'restart', {}, 409);
    assert.equal((await action(host, 'view')).gameId, view.gameId, 'failed restart destroyed the match');
    await action(host, 'end');
    await action(host, 'start', { slug }, 409);
    assert.equal((await action(host, 'view')).active, false);
    // Exhausting one game's cards cannot prevent a different game starting.
    await action(host, 'start', { slug: 'charades' });
    await action(host, 'end');
  }

  const { host, seats, action } = await table();
  const seen = new Set();
  const record = async view => {
    const actor = seats.find(seat => seat.playerId === view.actorId);
    assert.ok(actor);
    const own = await action(actor, 'view');
    assert.ok(own.prompt?.prompt, 'the actor did not receive a playable prompt');
    assert.ok(!seen.has(own.prompt.prompt), 'a previously exposed Mímica card reappeared');
    seen.add(own.prompt.prompt);
    const teammate = seats.find(seat => seat.playerId !== actor.playerId && view.teams?.[view.actorTeam]?.includes(seat.playerId));
    if (teammate) assert.equal((await action(teammate, 'view')).prompt, undefined);
    return actor;
  };
  let view = await action(host, 'start', { slug: 'charades' });
  view = await action(host, 'advance');
  let actor = await record(view);
  view = await action(actor, 'charades-pass');
  actor = await record(view);
  await action(host, 'end');
  await action(host, 'start', { slug: 'charades' });
  view = await action(host, 'advance');
  actor = await record(view);
  await action(host, 'restart');
  view = await action(host, 'advance');
  actor = await record(view);
  // Finishing an unguessed card consumes it before the next team's turn.
  await action(actor, 'charades-finish');
  await action(host, 'advance');
  view = await action(host, 'advance');
  actor = await record(view);
  while (view.phase === 'charades-turn') {
    view = await action(actor, seen.size % 2 ? 'charades-correct' : 'charades-pass');
    if (view.phase === 'charades-turn') actor = await record(view);
  }
  assert.equal(seen.size, charadesPrompts.length, 'not every available Mímica card was exposed once');
  assert.equal(view.phase, 'charades-recap');
  assert.equal(view.deckExhausted, true);
  assert.equal(view.prompt, undefined, 'exhaustion displayed an old card as fallback');
  view = await action(host, 'advance');
  assert.equal(view.phase, 'results');
  await action(host, 'advance', {}, 409);
  await action(host, 'restart', {}, 409);
  await action(host, 'end');
  await action(host, 'start', { slug: 'charades' }, 409);

  const otherGames = ['same-page', 'human-scale', 'who-am-i', 'secret-settlers', 'categories', 'devils-advocate', 'signal-lost', 'writers-room', 'doodle-relay'];
  const lapGames = ['who-am-i', 'secret-settlers', 'devils-advocate', 'signal-lost', 'writers-room', 'doodle-relay'];
  const sizes = { 'same-page': content.samePageQuestions.length, 'human-scale': content.humanScales.length, 'who-am-i': content.identityDeck.length, 'secret-settlers': content.settlerMissions.length, categories: content.categoryLetters.length * content.categorySets.length, 'devils-advocate': content.devilsAdvocateStatements.length, 'signal-lost': content.signalDeck.length, 'writers-room': content.writersRoomDeck.length, 'doodle-relay': content.doodleRelayPrompts.length };
  const exposed = state => {
    switch (state.slug) {
      case 'who-am-i': return Object.values(state.identityIndices);
      case 'secret-settlers': return Object.values(state.missionIndices);
      case 'categories': return [state.categorySetIndex * content.categoryLetters.length + state.categoryLetterIndex];
      case 'devils-advocate': return [state.advocatePromptOrder[state.advocateIndex]];
      case 'signal-lost': return [state.signalPromptOrder[state.signalReceiverIndex]];
      case 'writers-room': return [state.writersPromptOrder[state.writersDirectorIndex]];
      case 'doodle-relay': return state.relayChains.map(chain => content.doodleRelayPrompts.indexOf(chain.prompt));
      default: return [state.contentIndex];
    }
  };
  const reveal = async (room, slug, view) => slug === 'devils-advocate' ? room.action(room.host, 'advance') : view;
  const history = async (room, slug) => (await getDatabase().prepare('SELECT card_index AS cardIndex FROM room_card_history WHERE room_id = ? AND slug = ?').bind(room.roomId, slug).all()).results.map(row => row.cardIndex);
  for (const slug of otherGames) {
    const room = await table();
    const seen = new Set();
    for (const step of ['start', 'restart', 'end/start']) {
      if (step === 'end/start') await room.action(room.host, 'end');
      let next = await room.action(room.host, step === 'restart' ? 'restart' : 'start', { slug });
      next = await reveal(room, slug, next);
      const indices = exposed(await room.state(next));
      assert.ok(indices.every(index => Number.isInteger(index) && index >= 0));
      assert.equal(new Set(indices).size, indices.length, `${slug}: duplicate cards within the same deal`);
      for (const index of indices) { assert.ok(!seen.has(index), `${slug}: repeated across ${step}`); seen.add(index); }
      const saved = await history(room, slug);
      assert.ok([...seen].every(index => saved.includes(index)), `${slug}: exposed history not persisted`);
    }
  }

  // A complete lap must fit before dealing; partial sets leave some players stranded.
  for (const slug of lapGames) {
    const room = await table();
    const leave = room.seats.length - 1;
    await getDatabase().batch(Array.from({ length: sizes[slug] - leave }, (_, index) => getDatabase().prepare('INSERT INTO room_card_history (room_id, slug, card_index) VALUES (?, ?, ?)').bind(room.roomId, slug, index)));
    await room.action(room.host, 'start', { slug }, 409);
    assert.equal((await room.action(room.host, 'view')).active, false);
    // Exactly enough remaining is legal, and the resulting full deal/order is unique.
    await getDatabase().prepare('DELETE FROM room_card_history WHERE room_id = ? AND slug = ? AND card_index = 0').bind(room.roomId, slug).run();
    const next = await room.action(room.host, 'start', { slug });
    const saved = await room.state(next);
    const reserved = slug === 'devils-advocate' ? saved.advocatePromptOrder : slug === 'signal-lost' ? saved.signalPromptOrder : slug === 'writers-room' ? saved.writersPromptOrder : exposed(saved);
    assert.equal(reserved.length, room.seats.length, `${slug}: full lap reservation incorrect`);
    assert.equal(new Set(reserved).size, reserved.length);
  }

  // Simulate an active session created before room history existed. Both ways out
  // must atomically preserve its exposed cards before deleting/replacing the state.
  for (const mode of ['end', 'restart']) {
    for (const slug of otherGames) {
      const room = await table();
      let next = await room.action(room.host, 'start', { slug });
      next = await reveal(room, slug, next);
      const expected = exposed(await room.state(next));
      await getDatabase().prepare('DELETE FROM room_card_history WHERE room_id = ?').bind(room.roomId).run();
      await room.action(room.host, mode);
      const saved = await history(room, slug);
      assert.ok(expected.every(index => saved.includes(index)), `${slug}: ${mode} lost a pre-history session's exposed cards`);
    }
  }

  const fresh = await table();
  assert.equal((await fresh.action(fresh.host, 'start', { slug: 'alibi-club' })).active, true, 'history leaked across rooms');
  console.log('PASS: persistent per-room card history across end/start/restart/skip; Mímica passes, scores and unfinished turns never repeat; exhausted decks return409 without destroying the match or showing old cards.');
} finally {
  Date.now = realNow;
  console.error = realError;
  getDatabase().close();
  rmSync(directory, { recursive: true, force: true });
}
