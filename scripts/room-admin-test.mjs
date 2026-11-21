import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { importTypeScript } from './load-typescript.mjs';

const { games } = await importTypeScript('lib/games.ts');
const { localizeGameView } = await importTypeScript('lib/i18n.ts');
const { default: GameBoard } = await importTypeScript('app/room/[code]/GameBoard.tsx');
const { default: LanguageProvider } = await importTypeScript('app/LanguageProvider.tsx');
const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
async function post(path, body, expected = 200) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  assert.equal(response.status, expected, `${body.action ?? path}: ${JSON.stringify(result)}`);
  return result;
}
const host = await post('/api/rooms', { name: 'Honey' });
const guests = await Promise.all(['Camera', 'Magnet', 'Piano', 'Volcano'].map((name) => post(`/api/rooms/${host.code}/join`, { name })));
const seats = [host, ...guests];
const action = (seat, action, payload = {}, status = 200) => post(`/api/rooms/${host.code}/game`, { token: seat.token, action, ...payload }, status);
const outsiderRoom = await post('/api/rooms', { name: 'Other host' });
await action(outsiderRoom, 'start', { slug: 'same-page' }, 401);
await action(host, 'transfer-host', { targetId: outsiderRoom.playerId }, 400);
await action(host, 'remove-player', { targetId: host.playerId }, 400);

for (const game of games) {
  await action(guests[0], 'start', { slug: game.slug }, 403);
  const initial = await action(host, 'start', { slug: game.slug });
  await post(`/api/rooms/${host.code}/join`, { name: 'Late player' }, 409);
  await action(guests[0], 'advance', {}, 403);
  await action(guests[0], 'end', {}, 403);
  await action(guests[0], 'restart', {}, 403);
  await action(guests[0], 'transfer-host', { targetId: guests[1].playerId }, 403);
  await action(guests[0], 'remove-player', { targetId: guests[1].playerId }, 403);
  await action(host, 'remove-player', { targetId: guests[1].playerId }, 409);
  await action(host, 'start', { slug: game.slug }, 409);
  const markup = renderToStaticMarkup(React.createElement(LanguageProvider, null, React.createElement(GameBoard, {
    code: host.code, view: localizeGameView(initial, 'pt-PT'), error: '', acting: false, sendAction: async () => true,
  })));
  assert.ok(markup.includes('Como jogar'), `${game.slug}: missing in-room guide`);
  assert.ok(markup.includes('Gerir sala'), `${game.slug}: missing host controls`);
  assert.ok(markup.includes('Camera'), `${game.slug}: translated player name`);
  assert.ok(!markup.includes('undefined'), `${game.slug}: undefined UI copy`);
  assert.ok(!markup.includes('START GAME') && !markup.includes('WAITING FOR THE HOST'));
  const guestView = await action(guests[0], 'view');
  const guestMarkup = renderToStaticMarkup(React.createElement(LanguageProvider, null, React.createElement(GameBoard, {
    code: host.code, view: localizeGameView(guestView, 'pt-PT'), error: '', acting: false, sendAction: async () => true,
  })));
  assert.ok(guestMarkup.includes('Como jogar'));
  assert.ok(!guestMarkup.includes('<summary>Gerir sala'));
  // Handing over hosting preserves the match and the player's own private view.
  await action(host, 'transfer-host', { targetId: guests[0].playerId });
  assert.equal((await action(host, 'view')).isHost, false);
  const newHostView = await action(guests[0], 'view');
  assert.equal(newHostView.isHost, true);
  assert.equal(newHostView.gameId, initial.gameId);
  for (const key of ['privatePrompt', 'signalTarget', 'nightRole', 'mission', 'targetPosition', 'identities']) assert.deepEqual(newHostView[key], guestView[key], `${game.slug}: transfer changed secrets`);
  await action(host, 'end', {}, 403);
  const restarted = await action(guests[0], 'restart', { gameId: initial.gameId });
  assert.equal(restarted.game.slug, game.slug);
  assert.equal(restarted.phase, initial.phase);
  assert.notEqual(restarted.gameId, initial.gameId);
  assert.ok(restarted.players.every((player) => player.score === 0));
  await action(guests[0], 'end', { gameId: initial.gameId }, 409);
  await action(guests[0], 'transfer-host', { targetId: host.playerId });
  assert.equal((await action(host, 'end')).active, false);
}
// Scoring disputes change both the round and cumulative score exactly once.
await action(host, 'start', { slug: 'categories' });
const round = await action(host, 'advance');
await Promise.all(seats.map((seat, i) => action(seat, 'categories-submit', { value: Array(5).fill(`${round.letter}test${i}`) })));
const scored = await action(host, 'view');
assert.equal(scored.phase, 'results');
await action(guests[0], 'category-score', { targetId: host.playerId, value: { categoryIndex: 0, scored: false } }, 403);
await action(host, 'category-score', { targetId: host.playerId, value: { categoryIndex: -1, scored: false } }, 400);
const rejected = await action(host, 'category-score', { targetId: host.playerId, value: { categoryIndex: 0, scored: false } });
assert.equal(rejected.result.roundScores[host.playerId], 4);
assert.equal(rejected.players.find((player) => player.id === host.playerId).score, 4);
const again = await action(host, 'category-score', { targetId: host.playerId, value: { categoryIndex: 0, scored: false } });
assert.equal(again.result.roundScores[host.playerId], 4);
const restored = await action(host, 'category-score', { targetId: host.playerId, value: { categoryIndex: 0, scored: true } });
assert.equal(restored.result.roundScores[host.playerId], 5);
await action(host, 'end');
// Delayed moves must never apply to a later phase or round of the same match.
const firstWriting = await action(host, 'start', { slug: 'same-page', gameId: null });
assert.ok(Number.isInteger(firstWriting.version));
await action(host, 'end', { gameId: null }, 409);
await Promise.all(seats.map((seat, i) => action(seat, 'answer', { gameId: firstWriting.gameId, version: firstWriting.version, value: `Resposta ${i}` })));
const firstResult = await action(host, 'advance', { gameId: firstWriting.gameId, version: firstWriting.version });
await action(host, 'advance', { gameId: firstWriting.gameId, version: firstWriting.version }, 409);
assert.equal((await action(host, 'view')).phase, 'results');
const secondWriting = await action(host, 'advance', { gameId: firstResult.gameId, version: firstResult.version });
assert.equal(secondWriting.phase, 'answering');
await action(guests[0], 'answer', { gameId: firstWriting.gameId, version: firstWriting.version, value: 'Resposta atrasada' }, 409);
assert.equal((await action(guests[0], 'view')).hasSubmitted, false);
await action(host, 'end');
// A submitted Categories sheet is immutable, including repeated network requests.
await action(host, 'start', { slug: 'categories' });
const lockedRound = await action(host, 'advance');
const lockedAnswers = Array(5).fill(`${lockedRound.letter}original`);
await action(host, 'categories-submit', { value: lockedAnswers });
const repeatSheet = await action(host, 'categories-submit', { value: Array(5).fill(`${lockedRound.letter}changed`) });
assert.deepEqual(repeatSheet.ownCategoryAnswers, lockedAnswers);
await Promise.all(guests.map((seat) => action(seat, 'categories-submit', { value: Array(5).fill('') })));
const blankResults = await action(host, 'view');
assert.equal(blankResults.phase, 'results');
assert.equal(blankResults.result.roundScores[host.playerId], 5);
for (const seat of guests) assert.equal(blankResults.result.roundScores[seat.playerId], 0);
await action(host, 'end');
await action(host, 'remove-player', { targetId: guests[1].playerId });
await action(guests[1], 'view', {}, 401);
await post(`/api/rooms/${host.code}/join`, { name: 'Magnet' });
console.log(`PASS: all ${games.length} games render Portuguese host/player controls and in-room guides; host transfer, restart, stale moves, private views, roster permissions and scoring disputes verified.`);
