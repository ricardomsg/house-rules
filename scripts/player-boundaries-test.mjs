import assert from 'node:assert/strict';

const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`${path} (${response.status}): ${result.error ?? JSON.stringify(result)}`);
  return result;
}

async function createTable(count, prefix) {
  const host = await post('/api/rooms', { name: `${prefix} 1` });
  const guests = await Promise.all(Array.from({ length: count - 1 }, (_, index) => post(`/api/rooms/${host.code}/join`, { name: `${prefix} ${index + 2}` })));
  return { host, seats: [host, ...guests] };
}

async function addSeat(table, name) {
  const seat = await post(`/api/rooms/${table.host.code}/join`, { name });
  table.seats.push(seat);
  return seat;
}

function action(table, seat, actionName, extra = {}) {
  return post(`/api/rooms/${table.host.code}/game`, { action: actionName, token: seat.token, ...extra });
}

async function expectStartRejected(table, slug, pattern) {
  await assert.rejects(() => action(table, table.host, 'start', { slug }), pattern);
}

async function end(table) {
  await action(table, table.host, 'end');
}

const minimums = {
  'devils-advocate': 3,
  'scene-stealer': 4,
  'alibi-club': 4,
  'house-rule': 4,
  'head-fake': 4,
  'same-page': 3,
  charades: 4,
  fishbowl: 4,
  'who-am-i': 3,
  categories: 3,
  'two-truths': 3,
  'signal-lost': 3,
  'writers-room': 3,
  'doodle-relay': 4,
  'night-shift': 5,
  'human-scale': 3,
  'secret-settlers': 3,
};

const maximums = Object.fromEntries(Object.keys(minimums).map((slug) => [slug, slug === 'secret-settlers' ? 6 : 10]));

// Every game rejects a two-player room, proving the common lower guard.
const two = await createTable(2, 'Two');
for (const slug of Object.keys(minimums)) await expectStartRejected(two, slug, /needs at least/i);

// Three-player games complete a real end-to-end flow at their minimum.
const three = await createTable(3, 'Three');
for (const [slug, minimum] of Object.entries(minimums)) {
  if (minimum === 4) await expectStartRejected(three, slug, /needs at least 4/i);
  if (minimum === 5) await expectStartRejected(three, slug, /needs at least 5/i);
}

await action(three, three.host, 'start', { slug: 'same-page' });
await Promise.all(three.seats.map((seat) => action(three, seat, 'answer', { value: 'toast' })));
let state = await action(three, three.host, 'advance');
assert.equal(state.phase, 'results');
assert.equal(state.result.winnerIds.length, 3);
await end(three);

state = await action(three, three.host, 'start', { slug: 'who-am-i' });
for (let turn = 0; turn < three.seats.length; turn++) {
  const actor = three.seats.find(seat => seat.playerId === state.currentPlayerId);
  const helper = three.seats.find(seat => seat !== actor);
  const identityViews = await Promise.all(three.seats.map(seat => action(three, seat, 'view')));
  assert.ok(identityViews.every(view => !view.identities.some(identity => identity.playerId === view.playerId)));
  assert.ok(identityViews.every(view => view.identities.every(identity => identity.playerId === actor.playerId)));
  state = await action(three, actor, 'identity-start');
  assert.equal(state.phase, 'identity-playing');
  state = await action(three, helper, 'identity-guessed');
}
assert.equal(state.phase, 'results');
assert.equal(state.identityResults.length, 3);
assert.ok(state.identityResults.every(result => result.solved));
await end(three);

state = await action(three, three.host, 'start', { slug: 'categories' });
state = await action(three, three.host, 'advance');
await Promise.all(three.seats.map((seat, index) => action(three, seat, 'categories-submit', { value: Array(5).fill(`${state.letter}unique${index}`) })));
state = await action(three, three.host, 'view');
assert.equal(state.phase, 'results');
assert.equal(state.result.categoryResults.length, 5);
await end(three);

state = await action(three, three.host, 'start', { slug: 'two-truths' });
for (let story = 0; story < three.seats.length; story += 1) {
  const storyteller = three.seats.find((seat) => seat.playerId === state.storytellerId);
  assert.ok(storyteller);
  await action(three, storyteller, 'truths-submit', { value: [`True ${story} A`, `Lie ${story}`, `True ${story} B`], targetId: 1 });
  await action(three, three.host, 'advance');
  await Promise.all(three.seats.filter((seat) => seat.playerId !== storyteller.playerId).map((seat) => action(three, seat, 'truths-vote', { value: 1 })));
  state = await action(three, three.host, 'advance');
  assert.equal(state.result.truthLieIndex, 1);
  state = await action(three, three.host, 'advance');
}
assert.equal(state.phase, 'truths-final');
await end(three);

state = await action(three, three.host, 'start', { slug: 'signal-lost' });
for (let turn = 0; turn < three.seats.length; turn += 1) {
  const views = await Promise.all(three.seats.map((seat) => action(three, seat, 'view')));
  const receiver = views.find((view) => view.isReceiver);
  const helpers = views.filter((view) => !view.isReceiver);
  const receiverSeat = three.seats.find((seat) => seat.playerId === receiver.playerId);
  await Promise.all(helpers.map((view, index) => action(three, three.seats.find((seat) => seat.playerId === view.playerId), 'signal-clue', { value: `Hint${turn}${index}` })));
  state = await action(three, receiverSeat, 'signal-guess', { value: helpers[0].signalTarget });
  assert.equal(state.result.signalCorrect, true);
  state = await action(three, three.host, 'advance');
}
assert.equal(state.phase, 'signal-final');
await end(three);

state = await action(three, three.host, 'start', { slug: 'writers-room' });
for (let turn = 0; turn < three.seats.length; turn += 1) {
  const director = three.seats.find((seat) => seat.playerId === state.directorId);
  await Promise.all(three.seats.filter((seat) => seat.playerId !== director.playerId).map((seat, index) => action(three, seat, 'writers-pitch', { value: `Minimum pitch ${turn}-${index}` })));
  state = await action(three, director, 'writers-pick', { value: 0 });
  assert.equal(state.phase, 'results');
  state = await action(three, three.host, 'advance');
}
assert.equal(state.phase, 'writers-final');
await end(three);

state = await action(three, three.host, 'start', { slug: 'human-scale' });
const scaleViews = await Promise.all(three.seats.map((seat) => action(three, seat, 'view')));
assert.equal(new Set(scaleViews.map((view) => view.targetPosition)).size, 3);
assert.equal(state.phase, 'lineup');
const perfectOrder = [...scaleViews].sort((a, b) => a.targetPosition - b.targetPosition).map((view) => view.playerId);
await Promise.all(three.seats.map(seat => action(three, seat, 'order', { value: perfectOrder })));
state = await action(three, three.host, 'view');
assert.equal(state.phase, 'results');
assert.equal(state.result.lineupResults.length, 3);
assert.ok(state.result.lineupResults.every(result => result.correctPairs === 3));
await end(three);

state = await action(three, three.host, 'start', { slug: 'secret-settlers' });
const missionViews = await Promise.all(three.seats.map((seat) => action(three, seat, 'view')));
assert.equal(new Set(missionViews.map((view) => view.mission.mission)).size, 3);
await Promise.all(three.seats.map((seat) => action(three, seat, 'complete', { value: true })));
state = await action(three, three.host, 'advance');
assert.equal(state.result.missionResults.filter((result) => result.completed).length, 3);
await end(three);

// Four-player games complete their natural full loop at their minimum.
await addSeat(three, 'Four 4');
await expectStartRejected(three, 'night-shift', /needs at least 5/i);

for (const slug of ['scene-stealer', 'alibi-club', 'house-rule', 'head-fake']) {
  const started = await action(three, three.host, 'start', { slug });
  assert.equal(started.phase, slug === 'house-rule' ? 'vote' : 'briefing');
  const views = await Promise.all(three.seats.map((seat) => action(three, seat, 'view')));
  const counts = new Map();
  views.forEach((view) => counts.set(view.privatePrompt, (counts.get(view.privatePrompt) ?? 0) + 1));
  assert.deepEqual([...counts.values()].sort((a, b) => a - b), [1, 3]);
  const outsider = views.find((view) => counts.get(view.privatePrompt) === 1);
  if (started.phase === 'briefing') {
    const next = await action(three, three.host, 'advance');
    if (slug === 'head-fake') {
      assert.equal(next.phase, 'performance');
      assert.ok(next.turnEndsAt > Date.now());
      assert.equal((await action(three, three.host, 'recover', { gameId: next.gameId, version: next.version })).phase, 'vote');
    }
  }
  await Promise.all(three.seats.map((seat) => action(three, seat, 'vote', { targetId: outsider.playerId })));
  state = await action(three, three.host, 'view');
  const automatic = ['alibi-club', 'house-rule', 'head-fake'].includes(slug);
  assert.equal(state.phase, automatic ? 'results' : 'vote', `${slug}: final vote progression`);
  if (!automatic) state = await action(three, three.host, 'advance');
  assert.equal(state.phase, 'results');
  assert.equal(state.result.caught, true);
  await end(three);
}

state = await action(three, three.host, 'start', { slug: 'charades' });
for (let turn = 0; turn < three.seats.length; turn += 1) {
  state = await action(three, three.host, 'advance');
  const actor = three.seats.find((seat) => seat.playerId === state.actorId);
  await action(three, actor, 'charades-correct');
  await action(three, actor, 'charades-finish');
  state = await action(three, three.host, 'advance');
}
assert.equal(state.phase, 'results');
assert.equal(state.teamScores.blue + state.teamScores.red, 4);
await end(three);

state = await action(three, three.host, 'start', { slug: 'fishbowl' });
await Promise.all(three.seats.map((seat, index) => action(three, seat, 'fishbowl-prompts', { value: [`Bowl ${index} A`, `Bowl ${index} B`] })));
state = await action(three, three.host, 'advance');
for (let round = 0; round < 3; round += 1) {
  state = await action(three, three.host, 'advance');
  const actor = three.seats.find((seat) => seat.playerId === state.actorId);
  while (state.phase === 'fishbowl-turn') state = await action(three, actor, 'fishbowl-correct');
  assert.equal(state.phase, 'fishbowl-round-recap');
  state = await action(three, three.host, 'advance');
}
assert.equal(state.phase, 'results');
assert.equal(state.teamScores.blue + state.teamScores.red, 24);
await end(three);

state = await action(three, three.host, 'start', { slug: 'doodle-relay' });
for (let step = 0; step < 4; step += 1) {
  if (step % 2 === 0) {
    await Promise.all(three.seats.map((seat, index) => action(three, seat, 'relay-draw', { value: [{ color: '#172019', width: 8, points: [[0.1, 0.1], [0.2 + index / 100, 0.3]] }] })));
  } else {
    await Promise.all(three.seats.map((seat, index) => action(three, seat, 'relay-guess', { value: `Four-player guess ${step}-${index}` })));
  }
  state = await action(three, three.host, 'view');
}
assert.equal(state.phase, 'relay-reveal');
for (let chain = 0; chain < 4; chain += 1) state = await action(three, three.host, 'advance');
assert.equal(state.phase, 'relay-final');
await end(three);

// Night Shift completes at five, including exact role and mission-size boundaries.
await addSeat(three, 'Five 5');
state = await action(three, three.host, 'start', { slug: 'night-shift' });
const nightViews = await Promise.all(three.seats.map((seat) => action(three, seat, 'view')));
assert.equal(nightViews.filter((view) => view.nightRole === 'saboteur').length, 2);
const crewSeats = three.seats.filter((seat) => nightViews.some((view) => view.playerId === seat.playerId && view.nightRole === 'crew'));
state = await action(three, three.host, 'advance');
for (const [missionIndex, required] of [2, 3, 2].entries()) {
  const leader = three.seats.find((seat) => seat.playerId === state.nightLeaderId);
  const team = crewSeats.slice(0, required);
  state = await action(three, leader, 'night-propose', { value: team.map((seat) => seat.playerId) });
  if (missionIndex === 0) {
    await Promise.all(three.seats.slice(0, -1).map((seat) => action(three, seat, 'night-vote', { value: 'approve' })));
    state = await action(three, three.host, 'view');
    assert.equal(state.voteStatus.filter((status) => status.voted).length, 4);
    state = await action(three, three.host, 'night-force-vote');
  } else {
    await Promise.all(three.seats.map((seat) => action(three, seat, 'night-vote', { value: 'approve' })));
    state = await action(three, three.host, 'view');
  }
  await Promise.all(team.map((seat) => action(three, seat, 'night-action', { value: 'stabilize' })));
  state = await action(three, three.host, 'view');
  assert.equal(state.nightDebrief.success, true);
  state = await action(three, three.host, 'advance');
}
assert.equal(state.phase, 'night-final');
assert.equal(state.result.nightWinner, 'crew');
await end(three);

// One above each maximum is rejected, independently of the successful max-size suite.
const eleven = await createTable(11, 'Eleven');
for (const [slug, maximum] of Object.entries(maximums)) {
  if (maximum === 10) await expectStartRejected(eleven, slug, /supports up to 10/i);
}
const seven = await createTable(7, 'Seven');
await expectStartRejected(seven, 'secret-settlers', /supports up to 6/i);

console.log(`PASS: all ${Object.keys(minimums).length} games reject undersized and oversized rooms. Original game flows complete at minimum size; Devil’s Advocate full laps are covered by test:advocate.`);
