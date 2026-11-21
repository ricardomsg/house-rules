import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { importTypeScript } from './load-typescript.mjs';

// Exercise real request handlers against disposable SQLite, with a controlled clock.
const directory = mkdtempSync(join(tmpdir(), 'house-rules-advocate-'));
process.env.DATABASE_PATH = join(directory, 'test.sqlite');
const realNow = Date.now;
let now = realNow();
Date.now = () => now;
const { POST: create } = await importTypeScript('app/api/rooms/route.ts');
const { POST: joinRoom } = await importTypeScript('app/api/rooms/[code]/join/route.ts');
const { POST: game } = await importTypeScript('app/api/rooms/[code]/game/route.ts');
const { GET: room } = await importTypeScript('app/api/rooms/[code]/route.ts');
const { getDatabase } = await importTypeScript('db/index.ts');
const { localizeGameView } = await importTypeScript('lib/i18n.ts');
const { devilsAdvocateStatements } = await importTypeScript('lib/game-content.ts');
const { default: Board } = await importTypeScript('app/room/[code]/DevilsAdvocateBoard.tsx');
const { default: LanguageProvider } = await importTypeScript('app/LanguageProvider.tsx');

async function request(handler, body, code = '', status = 200) {
  const response = await handler(new Request('http://localhost/api/rooms', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ code }) });
  const result = await response.json();
  assert.equal(response.status, status, JSON.stringify(result));
  return result;
}
async function table(count) {
  const host = await request(create, { name: 'Honey' });
  const seats = [host];
  for (let i = 1; i < count; i++) {
    now++;
    seats.push(await request(joinRoom, { name: `Player ${i + 1}` }, host.code));
  }
  const action = (seat, action, payload = {}, status = 200) => request(game, { token: seat.token, action, ...payload }, host.code, status);
  const scoreboard = async () => (await (await room(new Request('http://localhost'), { params: Promise.resolve({ code: host.code }) })).json()).scoreboard;
  return { host, seats, action, scoreboard };
}
function sealed(view) {
  assert.ok(view.players.every(player => player.score === 0));
  assert.equal(view.nightOutcome, null);
  assert.equal(view.advocateResults, undefined);
  for (const key of ['scores', 'advocatePromptOrder', 'completedOutcome', 'ratings', 'result']) assert.equal(view[key], undefined, `Leaked ${key}`);
}
function render(view) {
  return renderToStaticMarkup(React.createElement(LanguageProvider, null,
    React.createElement(Board, { view: localizeGameView(view, 'pt-PT'), acting: false, remainingSeconds: 60, sendAction: async () => true })));
}

try {
  assert.equal(new Set(devilsAdvocateStatements).size, devilsAdvocateStatements.length);
  const two = await table(2);
  await two.action(two.host, 'start', { slug: 'devils-advocate' }, 409);

  for (const count of [3, 5, 6, 10]) {
    const { host, seats, action, scoreboard } = await table(count);
    await action(seats[1], 'start', { slug: 'devils-advocate' }, 403);
    let view = await action(host, 'start', { slug: 'devils-advocate' });
    assert.equal(view.phase, 'advocate-ready');
    assert.equal(view.advocateStatement, undefined);
    assert.ok(render(view).includes('60 SEGUNDOS'));
    const statements = new Set();
    const visited = [];
    let currentHost = host;
    for (let turn = 0; turn < count; turn++) {
      const speaker = seats.find(seat => seat.playerId === view.currentPlayerId);
      visited.push(speaker.playerId);
      await action(seats.find(seat => seat !== currentHost), 'advance', {}, 403);
      await action(currentHost, 'advocate-rate', { value: 5 }, 409);
      view = await action(currentHost, 'advance');
      assert.equal(view.phase, 'advocate-defense');
      assert.equal(view.turnEndsAt, now + 60_000);
      statements.add(view.advocateStatement);
      assert.ok(render(view).includes('DEFENDE ISTO COMO VERDADE'));
      await action(currentHost, 'advance', {}, 409);
      await action(speaker, 'advocate-rate', { value: 5 }, 409);
      now += 59_999;
      assert.equal((await action(speaker, 'view')).phase, 'advocate-defense');
      now++;
      const expiryViews = await Promise.all(seats.map(seat => action(seat, 'view')));
      assert.ok(expiryViews.every(v => v.phase === 'advocate-rating'));
      view = expiryViews[0];
      await action(currentHost, 'advance', {}, 409);
      await action(speaker, 'advocate-rate', { value: 5 }, 403);
      const voters = seats.filter(seat => seat !== speaker);
      for (const invalid of [0, 11, 5.5, '5', null]) await action(voters[0], 'advocate-rate', { value: invalid }, 400);
      const rating = turn === 0 ? 10 : turn === 1 ? 1 : 6;
      await Promise.all(voters.map(seat => action(seat, 'advocate-rate', { value: rating, gameId: view.gameId, version: view.version })));
      // A retry with a different value must preserve the original ballot.
      const ownView = await action(voters[0], 'advocate-rate', { value: rating === 10 ? 1 : 10 });
      assert.equal(ownView.ownRating, rating);
      assert.equal(ownView.submittedCount, count - 1);
      const views = await Promise.all(seats.map(seat => action(seat, 'view')));
      views.forEach(sealed);
      assert.equal(views.find(v => v.playerId === speaker.playerId).ownRating, undefined);
      assert.equal((await scoreboard()).gamesPlayed, 0);
      assert.ok(render(ownView).includes('AVALIAÇÃO SELADA'));
      if (turn === 0) {
        await action(currentHost, 'transfer-host', { targetId: seats[1].playerId });
        currentHost = seats[1];
      }
      view = await action(currentHost, 'advance', { gameId: ownView.gameId, version: ownView.version });
      await action(voters[0], 'advocate-rate', { value: 9, gameId: ownView.gameId, version: ownView.version }, 409);
      if (turn < count - 1) { sealed(view); assert.equal(view.advocateStatement, undefined); }
    }
    assert.equal(statements.size, count, 'Statements repeat within a lap');
    assert.deepEqual(visited, seats.map(seat => seat.playerId));
    assert.equal(view.phase, 'advocate-final');
    assert.equal(view.advocateResults[0].playerId, host.playerId);
    assert.equal(view.advocateResults[0].average, 10);
    assert.equal(view.advocateResults.at(-1).average, 1);
    assert.equal(view.advocateResults.filter(result => result.winner).length, 1);
    assert.equal(view.advocateResults.filter(result => result.loser).length, 1);
    assert.equal(view.nightOutcomeSaved, true);
    assert.equal((await scoreboard()).gamesPlayed, 1);
    assert.ok(view.nightOutcome.awards.find(award => award.playerId === host.playerId).won);
    const markup = render(view);
    assert.ok(markup.includes('Honey') && markup.includes('VENCEDOR') && markup.includes('DERROTADO') && !markup.includes('undefined'));
    // Replays clear ballots, keep turn order after host transfer, and bank once.
    view = await action(currentHost, 'advance');
    assert.equal(view.currentPlayerId, host.playerId);
    assert.equal(view.round, 1);
    sealed(view);
    assert.equal((await scoreboard()).gamesPlayed, 1);
    await action(currentHost, 'end');
    assert.equal((await scoreboard()).gamesPlayed, 1, 'Abandoned replay counted');
  }

  // Everyone tied: co-winners, rank 1 for all, no arbitrary loser.
  const { host, seats, action, scoreboard } = await table(3);
  let view = await action(host, 'start', { slug: 'devils-advocate' });
  for (let turn = 0; turn < seats.length; turn++) {
    view = await action(host, 'advance');
    now += 60_000;
    view = await action(host, 'view');
    await Promise.all(seats.filter(seat => seat.playerId !== view.currentPlayerId).map(seat => action(seat, 'advocate-rate', { value: 7 })));
    view = await action(host, 'advance');
  }
  assert.ok(view.advocateResults.every(result => result.rank === 1 && result.winner && !result.loser && result.average === 7));
  assert.ok(view.nightOutcome.awards.every(award => award.points === 3));
  await Promise.all(seats.map(seat => action(seat, 'view')));
  assert.equal((await scoreboard()).gamesPlayed, 1);
  assert.ok(render(view).includes('EMPATE GERAL'));
  console.log('PASS: 3/5/6/10-player full games, 60-second expiry, concurrent ratings, ballot privacy/immutability, host transfer, replay, standings, ties, and Portuguese screens.');
} finally {
  Date.now = realNow;
  getDatabase().close();
  delete globalThis.houseRulesDatabase;
  rmSync(directory, { recursive: true, force: true });
}
