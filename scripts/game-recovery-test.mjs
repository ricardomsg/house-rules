import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importTypeScript } from './load-typescript.mjs';

const directory = mkdtempSync(join(tmpdir(), 'house-rules-recovery-'));
process.env.DATABASE_PATH = join(directory, 'test.sqlite');
const realNow = Date.now;
let now = realNow();
Date.now = () => now;
const { POST: create } = await importTypeScript('app/api/rooms/route.ts');
const { POST: joinRoom } = await importTypeScript('app/api/rooms/[code]/join/route.ts');
const { POST: game } = await importTypeScript('app/api/rooms/[code]/game/route.ts');
const { POST: presence } = await importTypeScript('app/api/rooms/[code]/presence/route.ts');
const { GET: room } = await importTypeScript('app/api/rooms/[code]/route.ts');
const { getDatabase } = await importTypeScript('db/index.ts');
const { games } = await importTypeScript('lib/games.ts');

async function request(handler, body, code = '', status = 200) {
  const response = await handler(new Request('http://localhost/api/rooms', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ code }) });
  const value = await response.json();
  assert.equal(response.status, status, JSON.stringify(value));
  return value;
}
async function table(count) {
  const host = await request(create, { name: 'Host' });
  const seats = [host];
  for (let i = 1; i < count; i++) {
    now++;
    seats.push(await request(joinRoom, { name: `Guest ${i}` }, host.code));
  }
  const action = (i, action, payload = {}, status = 200) => request(game, { token: seats[i].token, action, ...payload }, host.code, status);
  const view = () => action(0, 'view');
  const recover = async () => { const v = await view(); return action(0, 'recover', { gameId: v.gameId, version: v.version }); };
  return { host, seats, action, view, recover };
}

try {
  for (const count of [5, 6]) {
    const { seats, action, view, recover } = await table(count);
    const start = slug => action(0, 'start', { slug });
    const end = () => action(0, 'end');
    let v = await start('devils-advocate');
    await action(1, 'recover', { gameId: v.gameId, version: v.version }, 403);
    await action(0, 'recover', {}, 409);
    v = await action(0, 'advance');
    v = await recover(); // Finish early, keep ballots closed until this explicit action.
    assert.equal(v.phase, 'advocate-rating');
    await action(1, 'advocate-rate', { value: 8 });
    const before = await view();
    assert.equal(before.waitingFor.length, count - 2);
    assert.ok(!before.waitingFor.includes(seats[0].playerId));
    assert.ok(!before.waitingFor.includes(seats[1].playerId));
    assert.equal(before.ownRating, undefined);
    v = await recover();
    assert.equal(v.round, 2);
    await action(2, 'advocate-rate', { value: 1, gameId: before.gameId, version: before.version }, 409);
    // Double-click/stale confirmation cannot skip two speakers.
    await action(0, 'recover', { gameId: before.gameId, version: before.version }, 409);
    for (let i = 1; i < count; i++) v = await recover();
    assert.equal(v.phase, 'advocate-final');
    assert.equal(v.advocateResults.find(r => r.playerId === seats[0].playerId).average, 8);
    assert.equal(v.advocateResults.filter(r => r.winner).length, 1);
    assert.equal(v.advocateResults.filter(r => r.ratingCount === 0).length, count - 1);
    assert.ok(v.nightOutcomeSaved);
    await end();

    await start('devils-advocate');
    await action(0, 'advance');
    await recover();
    v = await recover(); // Zero ratings must still advance.
    assert.equal(v.phase, 'advocate-ready');
    for (let i = 1; i < count; i++) v = await recover();
    assert.ok(v.advocateResults.every(r => !r.winner && Number.isFinite(r.average)));
    await end();

    for (const slug of ['same-page', 'scene-stealer', 'alibi-club', 'house-rule', 'head-fake']) {
      await start(slug);
      if (slug !== 'same-page' && slug !== 'house-rule') await action(0, 'advance');
      if (slug === 'head-fake') await recover(); // End the timed performance before voting.
      v = await recover(); // No answers/votes: no forced wait and no invented points.
      assert.equal(v.phase, 'results');
      assert.ok(v.players.every(p => p.score === 0));
      await action(0, 'advance');
      await end();
    }

    await start('two-truths');
    v = await recover();
    assert.equal(v.storyNumber, 2);
    const storyteller = seats.findIndex(s => s.playerId === v.storytellerId);
    await action(storyteller, 'truths-submit', { value: ['I like apples', 'I own a castle', 'I like music'], targetId: 1 });
    await action(0, 'advance');
    v = await recover();
    assert.equal(v.phase, 'results');
    assert.deepEqual(v.result.truthTally, [0, 0, 0]);
    await end();

    await start('signal-lost');
    v = await view();
    const helpers = seats.map((s,i) => s.playerId !== v.receiverId ? i : -1).filter(i => i >= 0);
    await Promise.all(helpers.slice(0,2).map(i => action(i, 'signal-clue', { value: 'Echo' })));
    v = await recover();
    assert.equal(v.phase, 'signal-guess');
    const receiver = seats.findIndex(s => s.playerId === v.receiverId);
    const privateGuess = await action(receiver, 'view');
    assert.equal(privateGuess.signalTarget, undefined);
    assert.equal(privateGuess.signalClues.length, 0); // Duplicate cancellation survives recovery.
    v = await recover();
    assert.equal(v.phase, 'results');
    await action(0, 'advance');
    assert.equal((await view()).submittedCount, 0);
    await end();

    await start('writers-room');
    v = await view();
    const writer = seats.findIndex(s => s.playerId !== v.directorId);
    await action(writer, 'writers-pitch', { value: 'The waiter owns the spaceship.' });
    v = await recover();
    assert.equal(v.phase, 'writers-judging');
    assert.ok(v.writersPitches[0].playerId.startsWith('anonymous-writer-'));
    v = await recover(); // Director is absent.
    assert.equal(v.writersTurnNumber, 2);
    assert.equal(v.submittedCount, 0);
    v = await recover(); // No pitches at all.
    assert.equal(v.writersTurnNumber, 3);
    await end();

    for (const guessPhase of [false, true]) {
      await start('doodle-relay');
      const drawing = [{ color: '#172019', width: 8, points: [[.1,.1],[.6,.6]] }];
      if (guessPhase) {
        await Promise.all(seats.map((_,i) => action(i, 'relay-draw', { value: drawing })));
        await action(0, 'relay-guess', { value: 'A kite' });
      } else await action(0, 'relay-draw', { value: drawing });
      v = await recover();
      assert.equal(v.phase, 'relay-reveal');
      let pages = 0;
      for (let i=0;i<count;i++) {
        pages += v.relayRevealChain.entries.length;
        v = await action(0, 'advance');
      }
      assert.equal(v.phase, 'relay-final');
      assert.equal(pages, guessPhase ? count + 1 : 1);
      await end();
    }

    for (const custom of [false,true]) {
      await start('fishbowl');
      if (custom) await action(0, 'fishbowl-prompts', { value: ['Honey', 'Camera'] });
      v = await recover();
      assert.equal(v.phase, 'fishbowl-ready');
      assert.equal(v.bowlSize, custom ? 2 : 12);
      const previousActor = v.actorId;
      v = await recover();
      assert.notEqual(v.actorId, previousActor);
      await action(0, 'advance');
      v = await recover();
      assert.equal(v.phase, 'fishbowl-turn-recap');
      await action(0, 'advance');
      await end();
    }

    await start('charades');
    v = await recover();
    assert.equal(v.phase, 'charades-recap');
    await action(0, 'advance');
    await action(0, 'advance');
    v = await recover();
    assert.equal(v.phase, 'charades-recap');
    await end();

    await start('who-am-i');
    v = await action(0, 'advance');
    const current = v.currentPlayerId;
    v = await recover();
    assert.notEqual(v.currentPlayerId, current);
    assert.equal(v.identities.length, 1);
    await end();

    await start('categories');
    await action(0, 'advance');
    await action(1, 'categories-submit', { value: Array(5).fill('') });
    v = await recover();
    assert.equal(v.phase, 'results');
    await action(0, 'advance');
    await end();

    await start('human-scale');
    v = await recover();
    assert.equal(v.phase, 'results');
    assert.equal(v.result.lineupResults.length, 0);
    assert.ok(v.players.every(player => player.score === 0));
    await end();

    await start('night-shift');
    v = await action(0, 'advance');
    const oldLeader = v.nightLeaderId;
    v = await recover();
    assert.notEqual(v.nightLeaderId, oldLeader);
    let leader = seats.findIndex(s => s.playerId === v.nightLeaderId);
    let team = seats.slice(0, v.nightTeamSize);
    await action(leader, 'night-propose', { value: team.map(s => s.playerId) });
    v = await recover(); // Zero votes reject rather than invent approval.
    assert.equal(v.phase, 'night-proposing');
    leader = seats.findIndex(s => s.playerId === v.nightLeaderId);
    await action(leader, 'night-propose', { value: team.map(s => s.playerId) });
    await action(0, 'night-vote', { value: 'approve' });
    v = await recover();
    assert.equal(v.phase, 'night-mission');
    await action(0, 'night-action', { value: 'stabilize' });
    const stale = await view();
    v = await recover();
    assert.equal(v.phase, 'night-proposing');
    assert.equal(v.nightMissionNumber, 1);
    assert.equal(v.nightCrewWins + v.nightSaboteurWins, 0);
    assert.equal(v.nightDebrief, undefined);
    await action(1, 'night-action', { value: 'stabilize', gameId: stale.gameId, version: stale.version }, 409);
    leader = seats.findIndex(s => s.playerId === v.nightLeaderId);
    await action(leader, 'night-propose', { value: team.map(s => s.playerId) });
    await Promise.all(seats.map((_,i) => action(i, 'night-vote', { value: 'approve' })));
    assert.equal((await view()).submittedCount, 0); // Canceled mission's private action is not reused.
    await Promise.all(team.map(s => action(seats.indexOf(s), 'night-action', { value: 'stabilize' })));
    assert.equal((await view()).phase, 'night-debrief');
    await end();

    await start('secret-settlers');
    assert.equal((await action(0, 'advance')).phase, 'results');
    await end();
    // Sleeping/backgrounded phones resume safely at the exact timer deadline.
    // Concurrent refreshes settle a turn once; a late tap cannot affect the next turn.
    for (const slug of ['charades', 'fishbowl', 'categories']) {
      await start(slug);
      if (slug === 'fishbowl') {
        await Promise.all(seats.map((_, i) => action(i, 'fishbowl-prompts', { value: [`Animal ${i}`, `Person ${i}`] })));
        await action(0, 'advance');
      }
      let timed = await action(0, 'advance');
      if (slug === 'categories') await action(0, 'categories-submit', { value: Array(5).fill('') });
      else timed = await action(0, `${slug}-correct`);
      now = timed.turnEndsAt ?? timed.categoriesEndsAt;
      assert.ok(Number.isFinite(now));
      const resumed = await Promise.all(seats.map((_, i) => action(i, 'view')));
      const expectedPhase = slug === 'categories' ? 'results' : slug === 'charades' ? 'charades-recap' : 'fishbowl-turn-recap';
      assert.ok(resumed.every(view => view.phase === expectedPhase));
      assert.equal(new Set(resumed.map(view => view.version)).size, 1);
      assert.equal(resumed[0].version, timed.version + 1);
      await action(0, slug === 'categories' ? 'categories-submit' : `${slug}-correct`, {
        gameId: timed.gameId, version: timed.version, value: Array(5).fill('late'),
      }, 409);
      if (slug !== 'categories') assert.equal(resumed[0].turnScore, 1);
      await action(0, 'advance');
      await end();
    }
    assert.equal(games.length, 17);
    console.log(`PASS: ${count} players can recover missing responses, absent turns and expired timers across the catalog without disclosing secrets.`);
  }

  const { host, seats, action, view } = await table(6);
  await action(0, 'start', { slug: 'same-page' });
  await action(1, 'claim-host', {}, 409);
  await request(joinRoom, { name: 'Late guest' }, host.code, 409);
  now += 61_000;
  const offlineRoom = await (await room(new Request('http://localhost'), { params: Promise.resolve({ code: host.code }) })).json();
  assert.equal(offlineRoom.hostCanBeReplaced, true);
  const results = await Promise.all([1,2].map(i => game(new Request('http://localhost', {
    method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({token:seats[i].token, action:'claim-host'}),
  }), {params:Promise.resolve({code:host.code})})));
  assert.deepEqual(results.map(r=>r.status).sort(), [200,409]);
  const taken = await view();
  assert.equal(taken.isHost, false);
  const newHost = taken.players.find(p => p.isHost);
  assert.ok(newHost);
  await action(0, 'recover', { gameId: taken.gameId, version: taken.version }, 403);
  await request(presence, { token: host.token }, host.code);
  assert.equal((await view()).isHost, false);
  const newHostIndex = seats.findIndex(s=>s.playerId===newHost.id);
  await action(newHostIndex, 'recover', { gameId: taken.gameId, version: taken.version });
  await action(newHostIndex, 'end');
  console.log('PASS: live-host protection, absent-host takeover, simultaneous claims, late-join protection, returning host, and continued play.');
} finally {
  Date.now = realNow;
  getDatabase().close();
  rmSync(directory, { recursive: true, force: true });
}
