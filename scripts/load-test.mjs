import assert from 'node:assert/strict';

const baseUrl = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const count = Number(process.env.TEST_PLAYERS ?? 10);
assert.ok([5, 6, 10].includes(count));
const turns = Math.ceil(count / 2) * 2;
const relaySteps = Math.min(count, 6);
const saboteurs = count <= 6 ? 2 : 4;

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`${path} (${response.status}): ${result.error ?? JSON.stringify(result)}`);
  return result;
}

const host = await post('/api/rooms', { name: 'Player 1' });
const guests = await Promise.all(
  Array.from({ length: count - 1 }, (_, index) => post(`/api/rooms/${host.code}/join`, { name: `Player ${index + 2}` })),
);
const seats = [host, ...guests];
assert.equal(seats.length, count);

async function action(seat, actionName, extra = {}) {
  return post(`/api/rooms/${host.code}/game`, { action: actionName, token: seat.token, ...extra });
}

async function exerciseOutsiderGame(slug) {
  const started = await action(host, 'start', { slug });
  assert.equal(started.game.slug, slug);
  assert.equal(started.players.length, count);

  const privateViews = await Promise.all(seats.map((seat) => action(seat, 'view')));
  const promptCounts = new Map();
  privateViews.forEach((view) => promptCounts.set(view.privatePrompt, (promptCounts.get(view.privatePrompt) ?? 0) + 1));
  assert.deepEqual([...promptCounts.values()].sort((a, b) => a - b), [1, count - 1]);
  const outsiderView = privateViews.find((view) => promptCounts.get(view.privatePrompt) === 1);
  assert.ok(outsiderView?.playerId);

  const automatic = ['alibi-club', 'house-rule', 'head-fake'].includes(slug);
  assert.equal(started.phase, slug === 'house-rule' ? 'vote' : 'briefing');
  if (slug === 'alibi-club') assert.ok(started.briefingEndsAt > Date.now());
  if (started.phase === 'briefing') {
    const next = await action(host, 'advance');
    if (slug === 'head-fake') {
      assert.equal(next.phase, 'performance');
      assert.ok(next.turnEndsAt > Date.now());
      assert.equal((await action(host, 'recover', { gameId: next.gameId, version: next.version })).phase, 'vote');
    } else assert.equal(next.phase, 'vote');
  }
  const votingSeats = seats.slice(0, -1);
  await Promise.all(votingSeats.map((seat) => action(seat, 'vote', { targetId: outsiderView.playerId })));
  const voteState = await action(host, 'view');
  assert.equal(voteState.submittedCount, votingSeats.length);
  assert.equal(voteState.ownVoteTargetId, outsiderView.playerId);
  assert.equal(voteState.voteStatus.filter((status) => status.voted).length, votingSeats.length);
  assert.equal(voteState.phase, 'vote', `${slug}: must wait for the final voter`);
  await action(seats.at(-1), 'vote', { targetId: outsiderView.playerId });
  const completedVote = await action(host, 'view');
  assert.equal(completedVote.phase, automatic ? 'results' : 'vote', `${slug}: final vote progression`);
  const result = automatic ? completedVote : await action(host, 'advance');
  assert.equal(result.phase, 'results');
  assert.equal(result.result.caught, true);
  assert.equal(result.result.outsiderId, outsiderView.playerId);
  await action(host, 'advance');
  const nextRound = await action(host, 'view');
  assert.equal(nextRound.round, 2);
  if (slug === 'alibi-club') {
    await action(host, 'advance');
    const partialVote = await action(host, 'vote', { targetId: guests[0].playerId });
    assert.equal(partialVote.phase, 'vote');
    assert.equal(partialVote.submittedCount, 1);
    const overridden = await action(host, 'advance');
    assert.equal(overridden.phase, 'results', 'host can finish despite missing votes');
  }
  await action(host, 'end');
}

for (const slug of ['scene-stealer', 'alibi-club', 'house-rule', 'head-fake']) {
  await exerciseOutsiderGame(slug);
}

await action(host, 'start', { slug: 'same-page' });
await Promise.all(
  seats.map((seat, index) => action(seat, 'answer', { value: index < count - 2 ? 'Pizza!' : 'tacos' })),
);
const answerState = await action(host, 'view');
assert.equal(answerState.submittedCount, count);
const samePageResult = await action(host, 'advance');
assert.equal(samePageResult.result.winnerIds.length, count - 2);
assert.equal(samePageResult.result.answerGroups[0].playerIds.length, count - 2);
await action(host, 'end');

const scaleStarted = await action(host, 'start', { slug: 'human-scale' });
assert.equal(scaleStarted.phase, 'lineup');
const scaleViews = await Promise.all(seats.map((seat) => action(seat, 'view')));
assert.equal(new Set(scaleViews.map((view) => view.targetPosition)).size, count);
const perfectOrder = [...scaleViews].sort((a, b) => a.targetPosition - b.targetPosition).map((view) => view.playerId);
await Promise.all(seats.slice(0, -1).map(seat => action(seat, 'order', { value: perfectOrder })));
const pendingScale = await action(seats.at(-1), 'view');
assert.equal(pendingScale.phase, 'lineup');
assert.equal(pendingScale.ownOrder, undefined);
assert.equal(pendingScale.result, undefined, 'Other orders stay private until reveal');
const scaleResult = await action(seats.at(-1), 'order', { value: perfectOrder });
assert.equal(scaleResult.phase, 'results');
assert.equal(scaleResult.result.lineupResults.length, count);
assert.ok(scaleResult.result.lineupResults.every(result => result.correctPairs === count * (count - 1) / 2));
assert.ok(scaleResult.players.every((player) => player.score === count * (count - 1) / 2));
await action(host, 'end');

const charadesReady = await action(host, 'start', { slug: 'charades' });
assert.equal(charadesReady.phase, 'charades-ready');
assert.equal(charadesReady.teams.blue.length, Math.ceil(count / 2));
assert.equal(charadesReady.teams.red.length, Math.floor(count / 2));
for (let turn = 0; turn < turns; turn += 1) {
  const activeTurn = await action(host, 'advance');
  assert.equal(activeTurn.phase, 'charades-turn');
  assert.ok(activeTurn.turnEndsAt > Date.now());
  const turnViews = await Promise.all(seats.map((seat) => action(seat, 'view')));
  for (const view of turnViews) {
    const shouldSee = view.playerId === activeTurn.actorId || view.ownTeam !== activeTurn.actorTeam;
    assert.equal(Boolean(view.prompt), shouldSee, 'Only the actor and opposing teams can see the prompt');
  }
  const actorSeat = seats.find((seat) => seat.playerId === activeTurn.actorId);
  assert.ok(actorSeat);
  await action(actorSeat, 'charades-correct');
  if (turn === 0) {
    await action(actorSeat, 'charades-pass');
    await action(actorSeat, 'charades-correct');
  }
  const recap = await action(actorSeat, 'charades-finish');
  assert.equal(recap.phase, 'charades-recap');
  assert.equal(recap.turnScore, turn === 0 ? 2 : 1);
  const afterRecap = await action(host, 'advance');
  assert.equal(afterRecap.phase, turn === turns - 1 ? 'results' : 'charades-ready');
}
const charadesResult = await action(host, 'view');
assert.equal(charadesResult.teamScores.blue + charadesResult.teamScores.red, turns + 1);
assert.ok(['blue', 'red', 'tie'].includes(charadesResult.result.charadesWinner));
await action(host, 'end');

const bowlSetup = await action(host, 'start', { slug: 'fishbowl' });
assert.equal(bowlSetup.phase, 'fishbowl-setup');
assert.equal(bowlSetup.teams.blue.length, Math.ceil(count / 2));
assert.equal(bowlSetup.teams.red.length, Math.floor(count / 2));
await Promise.all(seats.map((seat, index) => action(seat, 'fishbowl-prompts', { value: [`Prompt ${index + 1} Alpha`, `Prompt ${index + 1} Beta`] })));
const fullBowl = await action(host, 'view');
assert.equal(fullBowl.submittedCount, count);
let bowlState = await action(host, 'advance');
assert.equal(bowlState.phase, 'fishbowl-ready');
assert.equal(bowlState.bowlSize, count * 2);
const expectedRoundTitles = ['Describe it', 'One word', 'Act it'];
for (let bowlRound = 0; bowlRound < 3; bowlRound += 1) {
  assert.equal(bowlState.roundTitle, expectedRoundTitles[bowlRound]);
  while (bowlState.phase === 'fishbowl-ready') {
    const activeTurn = await action(host, 'advance');
    assert.equal(activeTurn.phase, 'fishbowl-turn');
    const actorSeat = seats.find((seat) => seat.playerId === activeTurn.actorId);
    assert.ok(actorSeat);
    const privateViews = await Promise.all(seats.map((seat) => action(seat, 'view')));
    assert.equal(privateViews.filter((view) => view.fishbowlPrompt).length, 1);
    if (activeTurn.remainingCount > 1) {
      const promptBeforePass = privateViews.find((view) => view.playerId === activeTurn.actorId).fishbowlPrompt;
      const passed = await action(actorSeat, 'fishbowl-pass');
      assert.notEqual(passed.fishbowlPrompt, promptBeforePass);
    }
    const guessesThisTurn = Math.min(5, activeTurn.remainingCount);
    let turnState = activeTurn;
    for (let guess = 0; guess < guessesThisTurn; guess += 1) {
      turnState = await action(actorSeat, 'fishbowl-correct');
      if (turnState.phase === 'fishbowl-round-recap') break;
    }
    if (turnState.phase === 'fishbowl-round-recap') {
      bowlState = turnState;
      break;
    }
    const turnRecap = await action(actorSeat, 'fishbowl-finish');
    assert.equal(turnRecap.phase, 'fishbowl-turn-recap');
    bowlState = await action(host, 'advance');
  }
  assert.equal(bowlState.phase, 'fishbowl-round-recap');
  bowlState = await action(host, 'advance');
  assert.equal(bowlState.phase, bowlRound === 2 ? 'results' : 'fishbowl-ready');
}
assert.equal(bowlState.teamScores.blue + bowlState.teamScores.red, count * 6);
assert.ok(['blue', 'red', 'tie'].includes(bowlState.result.fishbowlWinner));
await action(host, 'end');

let identityState = await action(host, 'start', { slug: 'who-am-i' });
assert.equal(identityState.phase, 'identity-briefing');
assert.equal(identityState.turnSeconds, 120);
const identityByPlayer = new Map();
for (let turn = 0; turn < count; turn++) {
  const currentSeat = seats.find(seat => seat.playerId === identityState.currentPlayerId);
  const helper = seats.find(seat => seat !== currentSeat);
  const identityViews = await Promise.all(seats.map(seat => action(seat, 'view')));
  for (const view of identityViews) {
    assert.ok(!view.identities.some(identity => identity.playerId === view.playerId));
    assert.ok(view.identities.every(identity => identity.playerId === currentSeat.playerId));
    for (const identity of view.identities) identityByPlayer.set(identity.playerId, identity.name);
  }
  identityState = await action(currentSeat, 'identity-start');
  assert.equal(identityState.phase, 'identity-playing');
  assert.ok(identityState.turnEndsAt > Date.now());
  identityState = await action(helper, 'identity-guessed');
  assert.equal(identityState.phase, turn === count - 1 ? 'results' : 'identity-briefing');
}
assert.equal(identityByPlayer.size, count);
assert.equal(new Set(identityByPlayer.values()).size, count);
assert.equal(identityState.identityResults.length, count);
assert.ok(identityState.identityResults.every(result => result.solved && result.elapsedMs >= 0));
const finalIdentityViews = await Promise.all(seats.map(seat => action(seat, 'view')));
assert.ok(finalIdentityViews.every(view => !view.identities.some(identity => identity.playerId === view.playerId)));
identityState = await action(host, 'advance');
assert.equal(identityState.phase, 'identity-briefing');
assert.equal(identityState.round, 2);
for (let turn = 0; turn < count; turn++) {
  const currentSeat = seats.find(seat => seat.playerId === identityState.currentPlayerId);
  const helper = seats.find(seat => seat !== currentSeat);
  await action(currentSeat, 'identity-start');
  identityState = await action(helper, 'identity-pass');
}
assert.equal(identityState.phase, 'results');
assert.ok(identityState.identityResults.every(result => !result.solved));
await action(host, 'end');

const categoriesReady = await action(host, 'start', { slug: 'categories' });
assert.equal(categoriesReady.phase, 'categories-ready');
const categoriesActive = await action(host, 'advance');
assert.equal(categoriesActive.phase, 'categories-answering');
assert.equal(categoriesActive.categories.length, 5);
assert.ok(categoriesActive.categoriesEndsAt > Date.now());
const categorySheets = await Promise.all(seats.map((seat, index) => {
  const answer = index < 2 ? `${categoriesActive.letter}duplicate` : `${categoriesActive.letter}unique${index}`;
  return action(seat, 'categories-submit', { value: Array(5).fill(answer) });
}));
assert.equal(categorySheets.length, count);
const categoriesResult = await action(host, 'view');
assert.equal(categoriesResult.phase, 'results');
assert.equal(categoriesResult.result.categoryResults.length, 5);
assert.equal(categoriesResult.result.categoryResults.flatMap((category) => category.entries).filter((entry) => entry.scored).length, (count - 2) * 5);
assert.equal(categoriesResult.result.winnerIds.length, count - 2);
assert.equal(categoriesResult.players.filter((player) => player.score === 5).length, count - 2);
const nextCategories = await action(host, 'advance');
assert.equal(nextCategories.phase, 'categories-ready');
assert.equal(nextCategories.round, 2);
await action(host, 'end');

let truthState = await action(host, 'start', { slug: 'two-truths' });
assert.equal(truthState.phase, 'truths-writing');
for (let story = 0; story < seats.length; story += 1) {
  const storyteller = seats.find((seat) => seat.playerId === truthState.storytellerId);
  assert.ok(storyteller);
  truthState = await action(storyteller, 'truths-submit', { value: [`Truth ${story} Alpha`, `Lie ${story}`, `Truth ${story} Beta`], targetId: 1 });
  assert.equal(truthState.phase, 'truths-discussion');
  truthState = await action(host, 'advance');
  assert.equal(truthState.phase, 'truths-vote');
  const truthVoters = seats.filter((seat) => seat.playerId !== truthState.storytellerId);
  await Promise.all(truthVoters.map((seat, index) => action(seat, 'truths-vote', { value: index < 3 ? 0 : 1 })));
  truthState = await action(host, 'advance');
  assert.equal(truthState.phase, 'results');
  assert.equal(truthState.result.truthLieIndex, 1);
  assert.equal(truthState.result.fooledCount, 3);
  assert.equal(truthState.result.truthTally.reduce((total, votes) => total + votes, 0), count - 1);
  truthState = await action(host, 'advance');
  assert.equal(truthState.phase, story === seats.length - 1 ? 'truths-final' : 'truths-writing');
}
assert.equal(truthState.players.reduce((total, player) => total + player.score, 0), count * (count - 1));
const nextTruthLap = await action(host, 'advance');
assert.equal(nextTruthLap.phase, 'truths-writing');
assert.equal(nextTruthLap.storyNumber, 1);
let cleanTruthLap = await action(host, 'truths-submit', { value: ['Fresh truth alpha', 'Fresh lie', 'Fresh truth beta'], targetId: 1 });
cleanTruthLap = await action(host, 'advance');
assert.equal(cleanTruthLap.phase, 'truths-vote');
assert.equal(cleanTruthLap.submittedCount, 0);
await action(host, 'end');

let signalState = await action(host, 'start', { slug: 'signal-lost' });
assert.equal(signalState.phase, 'signal-clue');
for (let signalTurn = 0; signalTurn < seats.length; signalTurn += 1) {
  const privateViews = await Promise.all(seats.map((seat) => action(seat, 'view')));
  const receiverView = privateViews.find((view) => view.isReceiver);
  assert.ok(receiverView);
  assert.equal(receiverView.signalTarget, undefined);
  const helperViews = privateViews.filter((view) => !view.isReceiver);
  assert.equal(helperViews.length, count - 1);
  assert.ok(helperViews.every((view) => view.signalTarget === helperViews[0].signalTarget));
  assert.ok(helperViews.every((view) => view.signalBlocked.length === 2));
  const receiverSeat = seats.find((seat) => seat.playerId === receiverView.playerId);
  assert.ok(receiverSeat);
  if (signalTurn === 0) {
    await assert.rejects(() => action(receiverSeat, 'signal-clue', { value: 'Sneaky' }), /receiver waits/i);
    await assert.rejects(() => action(seats.find((seat) => seat.playerId === helperViews[0].playerId), 'signal-clue', { value: helperViews[0].signalBlocked[0] }), /blocked words/i);
  }
  const helperSeats = seats.filter((seat) => seat.playerId !== receiverView.playerId);
  await Promise.all(helperSeats.map((seat, index) => action(seat, 'signal-clue', { value: index < 2 ? 'Echo' : `Unique${signalTurn}${index}` })));
  signalState = await action(host, 'view');
  assert.equal(signalState.phase, 'signal-guess');
  const guessViews = await Promise.all(seats.map((seat) => action(seat, 'view')));
  const receiverGuessView = guessViews.find((view) => view.isReceiver);
  const helperGuessView = guessViews.find((view) => !view.isReceiver);
  assert.equal(receiverGuessView.signalClues.length, count - 3);
  assert.ok(receiverGuessView.signalClues.every((clue) => !clue.cancelled));
  assert.ok(receiverGuessView.signalClues.every((clue) => !seats.some((seat) => seat.playerId === clue.playerId)));
  assert.equal(helperGuessView.signalClues.length, count - 1);
  assert.equal(helperGuessView.signalClues.filter((clue) => clue.cancelled).length, 2);
  signalState = await action(receiverSeat, 'signal-guess', { value: helperViews[0].signalTarget });
  assert.equal(signalState.phase, 'results');
  assert.equal(signalState.result.signalCorrect, true);
  assert.equal(signalState.signalCorrectCount, signalTurn + 1);
  signalState = await action(host, 'advance');
  assert.equal(signalState.phase, signalTurn === seats.length - 1 ? 'signal-final' : 'signal-clue');
}
assert.equal(signalState.signalCorrectCount, count);
assert.ok(signalState.players.every((player) => player.score === count));
const nextSignalLap = await action(host, 'advance');
assert.equal(nextSignalLap.phase, 'signal-clue');
assert.equal(nextSignalLap.signalTurnNumber, 1);
assert.equal(nextSignalLap.submittedCount, 0);
assert.equal(nextSignalLap.hasSubmitted, false);
await action(host, 'end');

let writersState = await action(host, 'start', { slug: 'writers-room' });
assert.equal(writersState.phase, 'writers-writing');
let writersPitchCount = 0;
for (let writersTurn = 0; writersTurn < seats.length; writersTurn += 1) {
  const writingViews = await Promise.all(seats.map((seat) => action(seat, 'view')));
  const directorView = writingViews.find((view) => view.isDirector);
  assert.ok(directorView);
  assert.equal(directorView.writersPitches, undefined);
  assert.ok(directorView.writersPrompt.setup);
  const directorSeat = seats.find((seat) => seat.playerId === directorView.playerId);
  assert.ok(directorSeat);
  if (writersTurn === 0) {
    await assert.rejects(() => action(directorSeat, 'writers-pitch', { value: 'I should not be allowed to pitch.' }), /director judges/i);
  }
  const writerSeats = seats.filter((seat) => seat.playerId !== directorView.playerId);
  await Promise.all(writerSeats.map((seat, index) => action(seat, 'writers-pitch', { value: `Turn ${writersTurn} pitch ${index}: the unexpected door opens.` })));
  writersPitchCount += writerSeats.length;
  writersState = await action(host, 'view');
  assert.equal(writersState.phase, 'writers-judging');
  const judgingViews = await Promise.all(seats.map((seat) => action(seat, 'view')));
  assert.ok(judgingViews.every((view) => view.writersPitches.length === count - 1));
  assert.ok(judgingViews.every((view) => view.writersPitches.every((pitch) => pitch.playerId.startsWith('anonymous-writer-'))));
  writersState = await action(directorSeat, 'writers-pick', { value: 0 });
  assert.equal(writersState.phase, 'results');
  assert.ok(writersState.result.writersWinnerId);
  assert.equal(writersState.writersPitches.length, count - 1);
  assert.ok(writersState.writersPitches.every((pitch) => seats.some((seat) => seat.playerId === pitch.playerId)));
  assert.equal(writersState.players.reduce((total, player) => total + player.score, 0), (writersTurn + 1) * 2);
  writersState = await action(host, 'advance');
  assert.equal(writersState.phase, writersTurn === seats.length - 1 ? 'writers-final' : 'writers-writing');
}
assert.equal(writersPitchCount, count * (count - 1));
assert.equal(writersState.players.reduce((total, player) => total + player.score, 0), count * 2);
const nextWritersLap = await action(host, 'advance');
assert.equal(nextWritersLap.phase, 'writers-writing');
assert.equal(nextWritersLap.writersTurnNumber, 1);
assert.equal(nextWritersLap.submittedCount, 0);
assert.equal(nextWritersLap.hasSubmitted, false);
await action(host, 'end');

let relayState = await action(host, 'start', { slug: 'doodle-relay' });
assert.equal(relayState.phase, 'relay-drawing');
assert.equal(relayState.relayStepTotal, relaySteps);
const firstRelayViews = await Promise.all(seats.map((seat) => action(seat, 'view')));
assert.equal(new Set(firstRelayViews.map((view) => view.relaySourceText)).size, count);
const relayPlayerOrder = firstRelayViews[0].players.map((player) => player.id);
await assert.rejects(() => action(host, 'relay-draw', { value: [] }), /clear line/i);
let relaySubmissionCount = 0;
for (let relayStep = 0; relayStep < relaySteps; relayStep += 1) {
  const relayViews = await Promise.all(seats.map((seat) => action(seat, 'view')));
  assert.ok(relayViews.every((view) => view.relayRevealChain === undefined && view.relaySummaries === undefined && view.relayChains === undefined));
  if (relayStep % 2 === 0) {
    assert.equal(relayState.phase, 'relay-drawing');
    assert.ok(relayViews.every((view) => typeof view.relaySourceText === 'string' && view.relaySourceDrawing === undefined));
    if (relayStep > 0) relayViews.forEach((view) => {
      const playerIndex = relayPlayerOrder.indexOf(view.playerId);
      const previousPlayerIndex = (playerIndex - 1 + seats.length) % seats.length;
      assert.equal(view.relaySourceText, `Relay step ${relayStep - 1} guess from player ${previousPlayerIndex}`);
    });
    await Promise.all(seats.map((seat) => {
      const playerIndex = relayPlayerOrder.indexOf(seat.playerId);
      return action(seat, 'relay-draw', { value: [{ color: '#172019', width: 8, points: [[0.1, 0.1], [0.2 + playerIndex / 100, 0.25 + relayStep / 100]] }] });
    }));
  } else {
    assert.equal(relayState.phase, 'relay-guessing');
    assert.ok(relayViews.every((view) => Array.isArray(view.relaySourceDrawing) && view.relaySourceText === undefined));
    relayViews.forEach((view) => {
      const playerIndex = relayPlayerOrder.indexOf(view.playerId);
      const previousPlayerIndex = (playerIndex - 1 + seats.length) % seats.length;
      assert.equal(view.relaySourceDrawing[0].points[1][0], Math.round((0.2 + previousPlayerIndex / 100) * 10_000) / 10_000);
      assert.equal(view.relaySourceDrawing[0].points[1][1], Math.round((0.25 + (relayStep - 1) / 100) * 10_000) / 10_000);
    });
    await Promise.all(seats.map((seat) => {
      const playerIndex = relayPlayerOrder.indexOf(seat.playerId);
      return action(seat, 'relay-guess', { value: `Relay step ${relayStep} guess from player ${playerIndex}` });
    }));
  }
  relaySubmissionCount += seats.length;
  relayState = await action(host, 'view');
  const expectedPhase = relayStep === relaySteps - 1 ? 'relay-reveal' : relayStep % 2 === 0 ? 'relay-guessing' : 'relay-drawing';
  assert.equal(relayState.phase, expectedPhase);
}
assert.equal(relaySubmissionCount, count * relaySteps);
for (let chainIndex = 0; chainIndex < seats.length; chainIndex += 1) {
  assert.equal(relayState.phase, 'relay-reveal');
  assert.equal(relayState.relayRevealNumber, chainIndex + 1);
  assert.equal(relayState.relayRevealChain.entries.length, relaySteps);
  assert.deepEqual(relayState.relayRevealChain.entries.map((entry) => entry.kind), Array.from({ length: relaySteps }, (_, i) => i % 2 ? 'guess' : 'draw'));
  assert.equal(new Set(relayState.relayRevealChain.entries.map((entry) => entry.playerId)).size, relaySteps);
  relayState = await action(host, 'advance');
}
assert.equal(relayState.phase, 'relay-final');
assert.equal(relayState.relaySummaries.length, count);
assert.ok(relayState.relaySummaries.every((summary) => summary.prompt && summary.finalGuess));
const nextRelay = await action(host, 'advance');
assert.equal(nextRelay.phase, 'relay-drawing');
assert.equal(nextRelay.relayStepNumber, 1);
assert.equal(nextRelay.submittedCount, 0);
assert.equal(nextRelay.hasSubmitted, false);
await action(host, 'end');

let nightState = await action(host, 'start', { slug: 'night-shift' });
assert.equal(nightState.phase, 'night-role');
const nightRoleViews = await Promise.all(seats.map((seat) => action(seat, 'view')));
const nightSaboteurViews = nightRoleViews.filter((view) => view.nightRole === 'saboteur');
const nightCrewViews = nightRoleViews.filter((view) => view.nightRole === 'crew');
assert.equal(nightSaboteurViews.length, saboteurs);
assert.equal(nightCrewViews.length, count - saboteurs);
assert.ok(nightSaboteurViews.every((view) => view.nightSaboteurIds.length === saboteurs));
assert.ok(nightCrewViews.every((view) => view.nightSaboteurIds === undefined));
assert.ok(nightRoleViews.every((view) => view.nightRoleReveal === undefined));
const nightSaboteurSeats = seats.filter((seat) => nightSaboteurViews.some((view) => view.playerId === seat.playerId));
const nightCrewSeats = seats.filter((seat) => nightCrewViews.some((view) => view.playerId === seat.playerId));
nightState = await action(host, 'advance');
assert.equal(nightState.phase, 'night-proposing');

const currentNightLeader = (state) => seats.find((seat) => seat.playerId === state.nightLeaderId);
const submitNightCrew = async (state, selectedSeats) => {
  const leader = currentNightLeader(state);
  assert.ok(leader);
  return action(leader, 'night-propose', { value: selectedSeats.map((seat) => seat.playerId) });
};
const voteNightCrew = async (vote) => {
  await Promise.all(seats.map((seat) => action(seat, 'night-vote', { value: vote })));
  return action(host, 'view');
};
const resolveNightMission = async (state, jamSeat) => {
  const selectedSeats = seats.filter((seat) => state.nightProposedIds.includes(seat.playerId));
  const unselectedSeat = seats.find((seat) => !state.nightProposedIds.includes(seat.playerId));
  assert.ok(unselectedSeat);
  await assert.rejects(() => action(unselectedSeat, 'night-action', { value: 'stabilize' }), /deployed crew/i);
  const selectedCrew = selectedSeats.find((seat) => nightCrewSeats.some((crew) => crew.playerId === seat.playerId));
  assert.ok(selectedCrew);
  await assert.rejects(() => action(selectedCrew, 'night-action', { value: 'jam' }), /only stabilize/i);
  await Promise.all(selectedSeats.map((seat) => action(seat, 'night-action', { value: seat.playerId === jamSeat?.playerId ? 'jam' : 'stabilize' })));
  return action(host, 'view');
};

// Mission 1 fails with one hidden jam.
let nightTeam = [nightSaboteurSeats[0], ...nightCrewSeats.slice(0, nightState.nightTeamSize - 1)];
await assert.rejects(() => submitNightCrew(nightState, nightTeam.slice(0, -1)), /exactly/i);
nightState = await submitNightCrew(nightState, nightTeam);
assert.equal(nightState.phase, 'night-voting');
await action(host, 'night-vote', { value: 'approve' });
const privateNightVote = await action(nightCrewSeats.find((seat) => seat.playerId !== host.playerId) ?? nightCrewSeats[0], 'view');
assert.equal(privateNightVote.submittedCount, 1);
assert.equal(privateNightVote.nightVotes, undefined);
await Promise.all(seats.filter((seat) => seat.playerId !== host.playerId).map((seat) => action(seat, 'night-vote', { value: 'approve' })));
nightState = await action(host, 'view');
assert.equal(nightState.phase, 'night-mission');
assert.equal(nightState.nightVotes.length, count);
nightState = await resolveNightMission(nightState, nightSaboteurSeats[0]);
assert.equal(nightState.phase, 'night-debrief');
assert.equal(nightState.nightDebrief.success, false);
assert.equal(nightState.nightDebrief.jamCount, 1);
assert.equal(nightState.nightSaboteurWins, 1);
nightState = await action(host, 'advance');

// Mission 2 succeeds and exposes one concrete black-box action.
nightTeam = nightCrewSeats.slice(0, nightState.nightTeamSize);
nightState = await submitNightCrew(nightState, nightTeam);
nightState = await voteNightCrew('approve');
nightState = await resolveNightMission(nightState);
assert.equal(nightState.nightDebrief.success, true);
assert.equal(nightState.nightDebrief.audit.action, 'stabilize');
assert.ok(nightTeam.some((seat) => seat.playerId === nightState.nightDebrief.audit.playerId));
assert.equal(nightState.nightCrewWins, 1);
nightState = await action(host, 'advance');

// Mission 3 exercises two rejected proposals and automatic emergency deployment.
for (let rejection = 0; rejection < 2; rejection += 1) {
  nightTeam = [...nightCrewSeats.slice(rejection), ...nightCrewSeats.slice(0, rejection)].slice(0, nightState.nightTeamSize);
  nightState = await submitNightCrew(nightState, nightTeam);
  nightState = await voteNightCrew('reject');
  assert.equal(nightState.phase, 'night-proposing');
  assert.equal(nightState.nightProposalAttempt, rejection + 2);
  assert.deepEqual(nightState.nightLastVote, { approve: 0, reject: count });
}
assert.equal(nightState.nightEmergencyDispatch, true);
nightTeam = nightCrewSeats.slice(0, nightState.nightTeamSize);
nightState = await submitNightCrew(nightState, nightTeam);
assert.equal(nightState.phase, 'night-mission');
assert.equal(nightState.nightVotes, undefined);
nightState = await resolveNightMission(nightState);
assert.equal(nightState.nightDebrief.success, true);
assert.equal(nightState.nightCrewWins, 2);
nightState = await action(host, 'advance');

// Mission 4 completes the match; large tables also exercise the two-jam shield.
nightTeam = [nightSaboteurSeats[1], ...nightCrewSeats.slice(0, nightState.nightTeamSize - 1)];
nightState = await submitNightCrew(nightState, nightTeam);
nightState = await voteNightCrew('approve');
nightState = await resolveNightMission(nightState, count >= 7 ? nightSaboteurSeats[1] : undefined);
assert.equal(nightState.nightDebrief.shielded, count >= 7);
assert.equal(nightState.nightDebrief.jamCount, count >= 7 ? 1 : 0);
assert.equal(nightState.nightDebrief.success, true);
assert.equal(nightState.result.nightWinner, 'crew');
nightState = await action(host, 'advance');
assert.equal(nightState.phase, 'night-final');
assert.equal(nightState.nightRoleReveal.length, count);
assert.equal(nightState.nightRoleReveal.filter((entry) => entry.role === 'saboteur').length, saboteurs);
const freshNight = await action(host, 'advance');
assert.equal(freshNight.phase, 'night-role');
assert.equal(freshNight.round, 1);
assert.equal(freshNight.submittedCount, 0);
assert.equal(freshNight.nightCrewWins, 0);
assert.equal(freshNight.nightSaboteurWins, 0);
await action(host, 'end');

const missionCount = Math.min(count, 6);
const missionHost = await post('/api/rooms', { name: 'Settler 1' });
const missionGuests = await Promise.all(Array.from({ length: missionCount - 1 }, (_, index) => post(`/api/rooms/${missionHost.code}/join`, { name: `Settler ${index + 2}` })));
const missionSeats = [missionHost, ...missionGuests];
const missionAction = (seat, actionName, extra = {}) => post(`/api/rooms/${missionHost.code}/game`, { action: actionName, token: seat.token, ...extra });
await missionAction(missionHost, 'start', { slug: 'secret-settlers' });
const missionViews = await Promise.all(missionSeats.map((seat) => missionAction(seat, 'view')));
assert.equal(new Set(missionViews.map((view) => view.mission.mission)).size, missionCount);
await Promise.all(missionSeats.slice(0, 3).map((seat) => missionAction(seat, 'complete', { value: true })));
const missionResult = await missionAction(missionHost, 'advance');
assert.equal(missionResult.result.missionResults.filter((result) => result.completed).length, 3);

console.log(`PASS: ${count} concurrent players completed 4 outsider games, Same Page, Human Scale, full Charades, all 3 Fishbowl rounds, Who Am I?, Categories, a full Two Truths lap, a full Signal Lost lap, a full Writer’s Room lap, all ${count * relaySteps} Doodle Relay pages, and a full Night Shift match with rejection, emergency dispatch, privacy, audits, and shield rules; ${missionCount} concurrent players completed Secret Settlers.`);
