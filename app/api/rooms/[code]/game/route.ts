import { outsiderCard } from '@/lib/card-catalog';
import { identityElapsedMs, rankIdentityResults, type IdentityResult } from '@/lib/identity-flow';
import { validateHumanScaleOrder, scoreHumanScaleOrders, type HumanScaleOrderResult } from '@/lib/human-scale-flow';
import { charadesActor, charadesRoster, charadesTurns, charadesWinner, charadesTeamIds } from '@/lib/charades-flow';
import { unseenCards, deckSize, cardHistoryStatement } from '@/lib/room-card-history';
import { RELAY_MAX_STROKES, RELAY_MAX_POINTS } from '@/lib/relay-drawing';
import { ensureSchema, getDatabase } from '@/db';
import { getGame } from '@/lib/games';
import { devilsAdvocateStatements, categoryLetters, categorySets, charadesPrompts, doodleRelayPrompts, humanScales, identityDeck, outsiderDecks, samePageQuestions, settlerMissions, signalDeck, writersRoomDeck } from '@/lib/game-content';
import { completeOutcome, teamActor, advocateAverage, type NightOutcome } from '@/lib/room-standings';
import { translateCopy } from '@/lib/i18n';
import { recoveryOptions, HOST_TAKEOVER_DELAY } from '@/lib/game-recovery';
import { NextResponse } from 'next/server';

type Actor = { playerId: string; name: string; isHost: number; roomId: string };
type RoomPlayer = { id: string; name: string; avatarColor: string; isHost: number };
type RelayStroke = { color: string; width: number; points: Array<[number, number]> };
type RelayEntry = { playerId: string; kind: 'draw'; value: RelayStroke[] } | { playerId: string; kind: 'guess'; value: string };
type RelayChain = { prompt: string; entries: RelayEntry[] };
type NightRole = 'crew' | 'saboteur';
type NightVote = 'approve' | 'reject';
type NightAction = 'stabilize' | 'jam';
type GameState = {
  slug: string;
  seriesNumber?: number;
  completedOutcome?: NightOutcome;
  phase: 'advocate-ready' | 'advocate-challenge' | 'advocate-defense' | 'advocate-rating' | 'advocate-final' | 'briefing' | 'performance' | 'vote' | 'answering' | 'missions' | 'lineup' | 'charades-ready' | 'charades-turn' | 'charades-recap' | 'fishbowl-setup' | 'fishbowl-ready' | 'fishbowl-turn' | 'fishbowl-turn-recap' | 'fishbowl-round-recap' | 'identity-briefing' | 'identity-playing' | 'categories-ready' | 'categories-answering' | 'truths-writing' | 'truths-discussion' | 'truths-vote' | 'truths-final' | 'signal-clue' | 'signal-guess' | 'signal-final' | 'writers-writing' | 'writers-judging' | 'writers-final' | 'relay-drawing' | 'relay-guessing' | 'relay-reveal' | 'relay-final' | 'night-role' | 'night-proposing' | 'night-voting' | 'night-mission' | 'night-debrief' | 'night-final' | 'results';
  round: number;
  playerIds: string[];
  settings?: { defenseSeconds: number; challengeSeconds: number; turnSeconds: number };
  briefingEndsAt?: number;
  performanceEndsAt?: number;
  usedCardIndices?: number[];
  advocateIndex?: number;
  advocatePromptOrder?: number[];
  advocateEndsAt?: number;
  advocateRatingCounts?: Record<string, number>;
  outsiderId?: string;
  contentIndex: number;
  scores: Record<string, number>;
  missionIndices?: Record<string, number>;
  lineupRanks?: Record<string, number>;
  charadesTeams?: Record<string, string>;
  charadesTeamScores?: Record<string, number>;
  charadesActorIndex?: number;
  charadesPromptOrder?: number[];
  charadesPromptCursor?: number;
  charadesTurnScore?: number;
  charadesTurnEndsAt?: number;
  fishbowlTeams?: Record<string, 'blue' | 'red'>;
  fishbowlTeamScores?: { blue: number; red: number };
  fishbowlActorIndex?: number;
  fishbowlPrompts?: string[];
  fishbowlRemaining?: number[];
  fishbowlRoundMode?: 0 | 1 | 2;
  fishbowlTurnScore?: number;
  fishbowlTurnEndsAt?: number;
  identityStartedAt?: number;
  identityEndsAt?: number;
  identityResults?: IdentityResult[];
  identityIndices?: Record<string, number>;
  identitySolved?: Record<string, boolean>;
  identityQuestionCounts?: Record<string, number>;
  identityCurrentIndex?: number;
  identityLastEvent?: { playerId: string; kind: 'yes' | 'no' | 'not-sure' | 'correct' | 'wrong' };
  categoryLetterIndex?: number;
  categorySetIndex?: number;
  categoriesEndsAt?: number;
  truthStorytellerIndex?: number;
  truthStatements?: string[];
  truthLieIndex?: number;
  signalReceiverIndex?: number;
  signalPromptOrder?: number[];
  signalClues?: Array<{ playerId: string; clue: string; cancelled: boolean }>;
  signalGuess?: string;
  signalCorrectCount?: number;
  writersDirectorIndex?: number;
  writersPromptOrder?: number[];
  writersPitches?: Array<{ playerId: string; pitch: string }>;
  relayStep?: number;
  relayTotalSteps?: number;
  relayChains?: RelayChain[];
  relayRevealIndex?: number;
  nightRoles?: Record<string, NightRole>;
  nightLeaderIndex?: number;
  nightMissionIndex?: number;
  nightProposalAttempt?: number;
  nightProposedIds?: string[];
  nightCrewWins?: number;
  nightSaboteurWins?: number;
  nightHistory?: boolean[];
  nightVotes?: Array<{ playerId: string; vote: NightVote }>;
  nightLastVote?: { approve: number; reject: number };
  nightDebrief?: {
    success: boolean;
    jamCount: number;
    teamIds: string[];
    shielded: boolean;
    audit?: { playerId: string; action: NightAction };
  };
  result?: {
    outsiderId?: string;
    caught?: boolean;
    tally?: Record<string, number>;
    answerGroups?: Array<{ answer: string; playerIds: string[] }>;
    winnerIds?: string[];
    missionResults?: Array<{ playerId: string; mission: string; title: string; completed: boolean }>;
    lineupResults?: HumanScaleOrderResult[];
    actualOrder?: string[];
    guessedOrder?: string[];
    accuracy?: number;
    charadesWinner?: string;
    fishbowlWinner?: 'blue' | 'red' | 'tie';
    identityRevealed?: boolean;
    categoryResults?: Array<{ category: string; entries: Array<{ playerId: string; answer: string; scored: boolean }> }>;
    roundScores?: Record<string, number>;
    truthTally?: number[];
    truthLieIndex?: number;
    fooledCount?: number;
    signalTarget?: string;
    signalGuess?: string;
    signalCorrect?: boolean;
    writersWinningPitch?: string;
    writersWinnerId?: string;
    nightWinner?: 'crew' | 'saboteur';
  };
};

type GameRow = { roomId: string; id: string; slug: string; stateJson: string; version: number };
type Submission = { playerId: string; valueJson: string };

function randomIndex(length: number, previous = -1) {
  if (length <= 1) return 0;
  let index = Math.floor(Math.random() * length);
  if (index === previous) index = (index + 1) % length;
  return index;
}

function shuffledIndices(length: number) {
  const indices = Array.from({ length }, (_, index) => index);
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [indices[index], indices[swap]] = [indices[swap], indices[index]];
  }
  return indices;
}

function nightSaboteurCount(playerCount: number) {
  if (playerCount <= 6) return 2;
  if (playerCount <= 9) return 3;
  return 4;
}

function nightTeamSize(playerCount: number, missionIndex: number) {
  const sizes = playerCount === 5 ? [2, 3, 2, 3, 3]
    : playerCount === 6 ? [2, 3, 4, 3, 4]
      : playerCount === 7 ? [2, 3, 3, 4, 4]
        : [3, 4, 4, 5, 5];
  return sizes[Math.max(0, Math.min(4, missionIndex))];
}

function nightRoles(players: RoomPlayer[]): Record<string, NightRole> {
  const saboteurIndices = new Set(shuffledIndices(players.length).slice(0, nightSaboteurCount(players.length)));
  return Object.fromEntries(players.map((player, index) => [player.id, saboteurIndices.has(index) ? 'saboteur' : 'crew']));
}

function resolvedNightVote(state: GameState, voteEntries: Submission[]): GameState {
  const parsedVotes = voteEntries.map((entry) => ({
    playerId: entry.playerId,
    vote: (JSON.parse(entry.valueJson) as { vote: NightVote }).vote,
  }));
  const approve = parsedVotes.filter((entry) => entry.vote === 'approve').length;
  const reject = parsedVotes.length - approve;
  const approved = approve > reject;
  return approved ? {
    ...state,
    phase: 'night-mission',
    nightVotes: parsedVotes,
    nightLastVote: { approve, reject },
  } : {
    ...state,
    phase: 'night-proposing',
    nightLeaderIndex: ((state.nightLeaderIndex ?? 0) + 1) % state.playerIds.length,
    nightProposalAttempt: (state.nightProposalAttempt ?? 1) + 1,
    nightProposedIds: undefined,
    nightVotes: parsedVotes,
    nightLastVote: { approve, reject },
  };
}

async function actorFor(code: string, token: unknown): Promise<Actor | null> {
  if (typeof token !== 'string') return null;
  return getDatabase().prepare(`SELECT p.id AS playerId, p.name, p.is_host AS isHost, r.id AS roomId
    FROM players p JOIN rooms r ON r.id = p.room_id
    WHERE r.code = ? AND p.session_token = ?`).bind(code, token).first<Actor>();
}

async function roomPlayers(roomId: string): Promise<RoomPlayer[]> {
  const result = await getDatabase().prepare(`SELECT id, name, avatar_color AS avatarColor, is_host AS isHost
    FROM players WHERE room_id = ? ORDER BY is_host DESC, joined_at ASC`).bind(roomId).all<RoomPlayer>();
  return result.results;
}

async function loadGame(roomId: string) {
  return getDatabase().prepare('SELECT id, room_id AS roomId, slug, state_json AS stateJson, version FROM game_sessions WHERE room_id = ?').bind(roomId).first<GameRow>();
}

async function submissions(gameId: string, round: number, kind: string) {
  const result = await getDatabase().prepare(`SELECT player_id AS playerId, value_json AS valueJson
    FROM game_submissions WHERE session_id = ? AND round = ? AND kind = ?`).bind(gameId, round, kind).all<Submission>();
  return result.results;
}

async function newRound(roomId: string, slug: string, players: RoomPlayer[], round: number, scores: Record<string, number>, previous?: GameState): Promise<GameState> {
  if (previous) players = [...players].sort((a, b) => previous.playerIds.indexOf(a.id) - previous.playerIds.indexOf(b.id));
  const continuing = Boolean(previous && round > 1);
  const available = await unseenCards(roomId, slug, previous);
  const required = ['who-am-i', 'secret-settlers', 'devils-advocate', 'signal-lost', 'writers-room', 'doodle-relay'].includes(slug) ? players.length : 1;
  if (deckSize(slug) && available.length < required) throw new Error('DECK_EXHAUSTED');
  return {
    ...createRound(slug, players, round, continuing ? scores : Object.fromEntries(players.map(p => [p.id, 0])), available, previous),
    settings: previous?.settings,
    seriesNumber: continuing ? previous?.seriesNumber ?? 0 : (previous?.seriesNumber ?? -1) + 1,
    completedOutcome: continuing ? previous?.completedOutcome : undefined,
  };
}

function createRound(slug: string, players: RoomPlayer[], round: number, scores: Record<string, number>, available: number[], previous?: GameState): GameState {
  const game = getGame(slug);
  if (!game) throw new Error('Unknown game.');
  if (game.mode === 'advocate') {
    return {
      slug, phase: 'advocate-ready', round: 1, playerIds: players.map(player => player.id), scores,
      contentIndex: 0, advocateIndex: 0, advocatePromptOrder: available,
    };
  }
  if (game.mode === 'answers') {
    return {
      slug, phase: 'answering', round, playerIds: players.map((player) => player.id), scores,
      contentIndex: available[0],
    };
  }
  if (game.mode === 'missions') {
    return {
      slug, phase: 'missions', round, playerIds: players.map((player) => player.id), scores,
      contentIndex: 0,
      missionIndices: Object.fromEntries(players.map((player, index) => [player.id, available[index]])),
    };
  }
  if (game.mode === 'lineup') {
    const ranks = players.map((_, index) => index + 1);
    for (let index = ranks.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [ranks[index], ranks[swap]] = [ranks[swap], ranks[index]];
    }
    return {
      slug, phase: 'lineup', round, playerIds: players.map((player) => player.id), scores,
      contentIndex: available[0],
      lineupRanks: Object.fromEntries(players.map((player, index) => [player.id, ranks[index]])),
    };
  }
  if (game.mode === 'charades') {
    const playerIds = players.map(player => player.id);
    const savedTeams = previous?.charadesTeams;
    const sameRoster = previous?.slug === slug && previous.playerIds.length === playerIds.length
      && playerIds.every(id => previous.playerIds.includes(id));
    const savedRoster = savedTeams ? charadesRoster(playerIds, savedTeams) : [];
    const keepTeams = sameRoster && savedTeams && savedRoster.length >= 2
      && playerIds.every(id => charadesTeamIds.includes(savedTeams[id] as typeof charadesTeamIds[number]))
      && savedRoster.every(team => playerIds.filter(id => savedTeams[id] === team).length >= 2);
    const teams = keepTeams
      ? Object.fromEntries(playerIds.map(id => [id, savedTeams[id]]))
      : Object.fromEntries(playerIds.map((id, index) => [id, index % 2 === 0 ? 'blue' : 'red']));
    return {
      slug, phase: 'charades-ready', round: 1, playerIds, scores,
      contentIndex: 0,
      charadesTeams: teams,
      charadesTeamScores: Object.fromEntries(charadesRoster(playerIds, teams).map(team => [team, 0])),
      charadesActorIndex: 0,
      charadesPromptOrder: available,
      charadesPromptCursor: 0,
      charadesTurnScore: 0,
    };
  }
  if (game.mode === 'fishbowl') {
    return {
      slug, phase: 'fishbowl-setup', round: 1, playerIds: players.map((player) => player.id), scores,
      contentIndex: 0,
      fishbowlTeams: Object.fromEntries(players.map((player, index) => [player.id, index % 2 === 0 ? 'blue' : 'red'])),
      fishbowlTeamScores: { blue: 0, red: 0 },
      fishbowlActorIndex: 0,
      fishbowlRoundMode: 0,
      fishbowlTurnScore: 0,
    };
  }
  if (game.mode === 'identity') {
    return {
      slug, phase: 'identity-briefing', round, playerIds: players.map((player) => player.id), scores,
      contentIndex: 0,
      identityIndices: Object.fromEntries(players.map((player, index) => [player.id, available[index]])),
      identitySolved: Object.fromEntries(players.map((player) => [player.id, false])),
      identityQuestionCounts: Object.fromEntries(players.map((player) => [player.id, 0])),
      identityCurrentIndex: 0,
    };
  }
  if (game.mode === 'categories') {
    return {
      slug, phase: 'categories-ready', round, playerIds: players.map((player) => player.id), scores,
      contentIndex: 0,
      categoryLetterIndex: available[0] % categoryLetters.length,
      categorySetIndex: Math.floor(available[0] / categoryLetters.length),
    };
  }
  if (game.mode === 'truths') {
    return {
      slug, phase: 'truths-writing', round: 1, playerIds: players.map((player) => player.id), scores,
      contentIndex: 0,
      truthStorytellerIndex: 0,
    };
  }
  if (game.mode === 'signal') {
    return {
      slug, phase: 'signal-clue', round: 1, playerIds: players.map((player) => player.id), scores,
      contentIndex: 0,
      signalReceiverIndex: 0,
      signalPromptOrder: available,
      signalCorrectCount: 0,
    };
  }
  if (game.mode === 'writers') {
    return {
      slug, phase: 'writers-writing', round: 1, playerIds: players.map((player) => player.id), scores,
      contentIndex: 0,
      writersDirectorIndex: 0,
      writersPromptOrder: available,
    };
  }
  if (game.mode === 'relay') {
    const promptOrder = available.slice(0, players.length);
    return {
      slug, phase: 'relay-drawing', round: 1, playerIds: players.map((player) => player.id), scores,
      contentIndex: 0,
      relayStep: 0,
      relayTotalSteps: Math.min(players.length, 6),
      relayChains: promptOrder.map((promptIndex) => ({ prompt: doodleRelayPrompts[promptIndex], entries: [] })),
      relayRevealIndex: 0,
    };
  }
  if (game.mode === 'night') {
    return {
      slug,
      phase: 'night-role',
      round: 1,
      playerIds: players.map((player) => player.id),
      scores,
      contentIndex: 0,
      nightRoles: nightRoles(players),
      nightLeaderIndex: Math.floor(Math.random() * players.length),
      nightMissionIndex: 0,
      nightProposalAttempt: 1,
      nightCrewWins: 0,
      nightSaboteurWins: 0,
      nightHistory: [],
    };
  }
  const previousOutsider = previous?.outsiderId ? players.findIndex((player) => player.id === previous.outsiderId) : -1;
  const outsiderIndex = randomIndex(players.length, previousOutsider);
  const used = previous?.usedCardIndices ?? [];
  const contentIndex = available[0];
  return {
    slug, phase: slug === 'house-rule' ? 'vote' : 'briefing', round, playerIds: players.map(player => player.id),
    outsiderId: players[outsiderIndex].id, scores, contentIndex,
    usedCardIndices: [...used, contentIndex],
    briefingEndsAt: slug === 'alibi-club' ? Date.now() + 10_000 : undefined,
  };
}

async function gameView(actor: Actor, row: GameRow | null) {
  if (!row) return { active: false };
  const state = JSON.parse(row.stateJson) as GameState;
  if (!state.playerIds.includes(actor.playerId)) return { active: false, watching: true };
  const definition = getGame(state.slug);
  const players = (await roomPlayers(actor.roomId)).filter((player) => state.playerIds.includes(player.id))
    .sort((a, b) => state.playerIds.indexOf(a.id) - state.playerIds.indexOf(b.id));
  const kind = state.phase === 'lineup' ? 'order' : state.phase === 'advocate-rating' ? 'advocate-rating' : state.phase === 'vote' ? 'vote' : state.phase === 'answering' ? 'answer' : state.phase === 'missions' ? 'complete' : state.phase === 'fishbowl-setup' ? 'fishbowl-prompt' : state.phase === 'categories-answering' ? 'categories' : state.phase === 'truths-vote' ? 'truth-vote' : state.phase === 'signal-clue' ? 'signal-clue' : state.phase === 'writers-writing' ? 'writers-pitch' : state.phase === 'relay-drawing' ? 'relay-draw' : state.phase === 'relay-guessing' ? 'relay-guess' : state.phase === 'night-voting' ? `night-vote-${state.nightProposalAttempt ?? 1}` : state.phase === 'night-mission' ? 'night-action' : null;
  const entries = kind ? await submissions(row.id, state.round, kind) : [];
  const ownEntry = entries.find((entry) => entry.playerId === actor.playerId);
  const savedOutcome = automaticResult(state) ? await getDatabase().prepare('SELECT id FROM room_results WHERE id = ?').bind(`${row.id}:${state.seriesNumber ?? 0}`).first() : null;
  let expectedIds = state.playerIds;
  if (state.phase === 'advocate-rating') expectedIds = expectedIds.filter(id => id !== state.playerIds[state.advocateIndex ?? 0]);
  if (state.phase === 'truths-vote') expectedIds = expectedIds.filter(id => id !== state.playerIds[state.truthStorytellerIndex ?? 0]);
  if (state.phase === 'signal-clue') expectedIds = expectedIds.filter(id => id !== state.playerIds[state.signalReceiverIndex ?? 0]);
  if (state.phase === 'writers-writing') expectedIds = expectedIds.filter(id => id !== state.playerIds[state.writersDirectorIndex ?? 0]);
  if (state.phase === 'night-mission') expectedIds = state.nightProposedIds ?? [];
  const waitingFor = kind ? expectedIds.filter(id => !entries.some(entry => entry.playerId === id)) : [];
  const base = {
    active: true,
    gameId: row.id,
    version: row.version,
    turnSeconds: state.settings?.turnSeconds ?? (state.slug === 'fishbowl' ? 45 : state.slug === 'categories' ? 90 : state.slug === 'who-am-i' ? 120 : state.slug === 'head-fake' ? 20 : 60),
    waitingFor,
    recovery: recoveryOptions[state.phase],
    nightOutcome: completeOutcome(state),
    nightOutcomeSaved: Boolean(savedOutcome),
    game: definition,
    phase: state.phase,
    round: state.round,
    isHost: Boolean(actor.isHost),
    playerId: actor.playerId,
    players: players.map((player) => ({
      id: player.id, name: player.name, avatarColor: player.avatarColor,
      isHost: Boolean(player.isHost), score: definition?.mode === 'advocate' && state.phase !== 'advocate-final' ? 0 : state.scores[player.id] ?? 0,
    })),
    submittedCount: entries.length,
    expectedCount: state.playerIds.length,
    hasSubmitted: Boolean(ownEntry),
    ownVoteTargetId: state.phase === 'vote' && ownEntry ? (JSON.parse(ownEntry.valueJson) as { targetId: string }).targetId : undefined,
    voteStatus: state.phase === 'vote' || state.phase === 'night-voting' ? players.map((player) => ({ playerId: player.id, voted: entries.some((entry) => entry.playerId === player.id) })) : undefined,
  };

  if (definition?.mode === 'advocate') {
    const speakerId = state.playerIds[state.advocateIndex ?? 0];
    const final = state.phase === 'advocate-final';
    const ratedIds = state.playerIds.filter(id => (state.advocateRatingCounts?.[id] ?? state.playerIds.length - 1) > 0);
    const high = Math.max(0, ...ratedIds.map(id => advocateAverage(state, id)));
    const low = Math.min(...ratedIds.map(id => advocateAverage(state, id)));
    return {
      ...base,
      players: base.players.map(player => ({ ...player, score: final ? advocateAverage(state, player.id) : 0 })),
      currentPlayerId: speakerId,
      currentPlayerName: players.find(player => player.id === speakerId)?.name,
      expectedCount: state.playerIds.length - 1,
      turnEndsAt: state.advocateEndsAt,
      defenseSeconds: state.settings?.defenseSeconds ?? 60,
      challengeSeconds: state.settings?.challengeSeconds ?? 0,
      // The next statement is kept server-side until the clock starts.
      advocateStatement: state.phase === 'advocate-defense' || state.phase === 'advocate-challenge' || state.phase === 'advocate-rating'
        ? devilsAdvocateStatements[state.advocatePromptOrder?.[state.advocateIndex ?? 0] ?? 0] : undefined,
      ownRating: ownEntry ? (JSON.parse(ownEntry.valueJson) as { rating: number }).rating : undefined,
      advocateResults: final ? state.playerIds.map((playerId, index) => ({
        playerId, statement: devilsAdvocateStatements[state.advocatePromptOrder?.[index] ?? 0],
        average: advocateAverage(state, playerId),
        ratingCount: state.advocateRatingCounts?.[playerId] ?? state.playerIds.length - 1,
        rank: 1 + state.playerIds.filter(id => advocateAverage(state, id) > advocateAverage(state, playerId)).length,
        winner: high > 0 && advocateAverage(state, playerId) === high,
        loser: ratedIds.includes(playerId) && high !== low && advocateAverage(state, playerId) === low,
      })).sort((a, b) => a.rank - b.rank) : undefined,
    };
  }

  if (definition?.mode === 'answers') {
    return {
      ...base,
      question: samePageQuestions[state.contentIndex],
      ownAnswer: ownEntry ? (JSON.parse(ownEntry.valueJson) as { answer: string }).answer : null,
      result: state.phase === 'results' ? state.result : undefined,
    };
  }

  if (definition?.mode === 'missions') {
    const mission = settlerMissions[state.missionIndices?.[actor.playerId] ?? 0];
    const ownComplete = ownEntry ? (JSON.parse(ownEntry.valueJson) as { completed: boolean }).completed : false;
    const completedCount = entries.filter((entry) => (JSON.parse(entry.valueJson) as { completed: boolean }).completed).length;
    return {
      ...base,
      mission,
      hasSubmitted: ownComplete,
      submittedCount: completedCount,
      result: state.phase === 'results' ? state.result : undefined,
    };
  }

  if (definition?.mode === 'lineup') {
    const scale = humanScales[state.contentIndex];
    return {
      ...base,
      scale,
      ownOrder: ownEntry ? (JSON.parse(ownEntry.valueJson) as { order: string[] }).order : undefined,
      submissionStatus: players.map(player => ({ playerId: player.id, submitted: entries.some(e => e.playerId === player.id) })),
      targetPosition: state.lineupRanks?.[actor.playerId] ?? 1,
      positionCount: state.playerIds.length,
      result: state.phase === 'results' ? state.result : undefined,
    };
  }

  if (definition?.mode === 'charades') {
    const actorId = charadesActor(state.playerIds, state.charadesTeams ?? Object.fromEntries(state.playerIds.map((id, i) => [id, i % 2 ? 'red' : 'blue'])), state.charadesActorIndex ?? 0);
    const promptIndex = state.charadesPromptOrder?.[state.charadesPromptCursor ?? 0] ?? 0;
    return {
      ...base,
      actorId,
      actorName: players.find((player) => player.id === actorId)?.name ?? 'Next actor',
      actorTeam: state.charadesTeams?.[actorId] ?? 'blue',
      ownTeam: state.charadesTeams?.[actor.playerId] ?? 'blue',
      teams: Object.fromEntries(charadesRoster(state.playerIds, state.charadesTeams ?? {}).map(team => [team, state.playerIds.filter(id => state.charadesTeams?.[id] === team)])),
      canEditTeams: state.phase === 'charades-ready' && (state.charadesActorIndex ?? 0) === 0,
      canControlPrompt: actor.playerId === actorId || state.charadesTeams?.[actor.playerId] !== state.charadesTeams?.[actorId],
      deckExhausted: (state.charadesPromptCursor ?? 0) >= (state.charadesPromptOrder?.length ?? 0),
      teamScores: state.charadesTeamScores ?? { blue: 0, red: 0 },
      turnScore: state.charadesTurnScore ?? 0,
      turnEndsAt: state.charadesTurnEndsAt,
      prompt: (actor.playerId === actorId || state.charadesTeams?.[actor.playerId] !== state.charadesTeams?.[actorId]) && state.phase === 'charades-turn' ? charadesPrompts[promptIndex] : undefined,
      result: state.phase === 'results' ? state.result : undefined,
    };
  }

  if (definition?.mode === 'fishbowl') {
    const actorId = teamActor(state.playerIds, state.fishbowlActorIndex ?? 0);
    const roundMode = state.fishbowlRoundMode ?? 0;
    const rules = [
      { title: 'Describe it', rule: 'Speak freely, but do not say any part of the answer, spell it, or use “sounds like”.' },
      { title: 'One word', rule: 'Say exactly one clue word for each prompt. You may repeat that same word, but may not add another.' },
      { title: 'Act it', rule: 'No speech, sounds, mouthing, spelling, or pointing at real objects. Movement only.' },
    ];
    const promptIndex = state.fishbowlRemaining?.[0];
    const ownPrompts = ownEntry ? (JSON.parse(ownEntry.valueJson) as { prompts: string[] }).prompts : null;
    return {
      ...base,
      actorId,
      actorName: players.find((player) => player.id === actorId)?.name ?? 'Next clue-giver',
      actorTeam: state.fishbowlTeams?.[actorId] ?? 'blue',
      ownTeam: state.fishbowlTeams?.[actor.playerId] ?? 'blue',
      teams: {
        blue: players.filter((player) => state.fishbowlTeams?.[player.id] === 'blue').map((player) => player.id),
        red: players.filter((player) => state.fishbowlTeams?.[player.id] === 'red').map((player) => player.id),
      },
      teamScores: state.fishbowlTeamScores ?? { blue: 0, red: 0 },
      turnScore: state.fishbowlTurnScore ?? 0,
      turnEndsAt: state.fishbowlTurnEndsAt,
      roundTitle: rules[roundMode].title,
      roundRule: rules[roundMode].rule,
      roundMode,
      ownPrompts,
      bowlSize: state.fishbowlPrompts?.length ?? 0,
      remainingCount: state.fishbowlRemaining?.length ?? 0,
      fishbowlPrompt: actor.playerId === actorId && state.phase === 'fishbowl-turn' && promptIndex !== undefined ? state.fishbowlPrompts?.[promptIndex] : undefined,
      result: state.phase === 'results' ? state.result : undefined,
    };
  }

  if (definition?.mode === 'identity') {
    const currentPlayerId = state.playerIds[state.identityCurrentIndex ?? 0];
    return {
      ...base,
      currentPlayerId,
      currentPlayerName: players.find((player) => player.id === currentPlayerId)?.name ?? 'Current player',
      turnEndsAt: state.identityEndsAt,
      identityResults: state.identityResults ?? [],
      ownSolved: Boolean(state.identitySolved?.[actor.playerId]),
      identitySolved: state.identitySolved ?? {},
      questionCounts: state.identityQuestionCounts ?? {},
      identities: players
        .filter(player => player.id === currentPlayerId && player.id !== actor.playerId && state.phase !== 'results')
        .map((player) => {
          const card = identityDeck[state.identityIndices?.[player.id] ?? 0];
          return { playerId: player.id, name: card.name, category: card.category, solved: Boolean(state.identitySolved?.[player.id]) };
        }),
      lastEvent: state.identityLastEvent,
      result: state.phase === 'results' ? state.result : undefined,
    };
  }

  if (definition?.mode === 'categories') {
    const ownAnswers = ownEntry ? (JSON.parse(ownEntry.valueJson) as { answers: string[] }).answers : null;
    return {
      ...base,
      letter: state.phase === 'categories-ready' ? undefined : categoryLetters[state.categoryLetterIndex ?? 0],
      categories: state.phase === 'categories-ready' ? undefined : categorySets[state.categorySetIndex ?? 0],
      categoriesEndsAt: state.categoriesEndsAt,
      ownCategoryAnswers: ownAnswers,
      result: state.phase === 'results' ? state.result : undefined,
    };
  }

  if (definition?.mode === 'truths') {
    const storytellerId = state.playerIds[state.truthStorytellerIndex ?? 0];
    return {
      ...base,
      expectedCount: state.playerIds.length - 1,
      storytellerId,
      storytellerName: players.find((player) => player.id === storytellerId)?.name ?? 'The storyteller',
      isStoryteller: actor.playerId === storytellerId,
      storyNumber: (state.truthStorytellerIndex ?? 0) + 1,
      storyTotal: state.playerIds.length,
      truthStatements: state.phase === 'truths-writing' ? undefined : state.truthStatements,
      result: state.phase === 'results' ? state.result : undefined,
    };
  }

  if (definition?.mode === 'signal') {
    const receiverId = state.playerIds[state.signalReceiverIndex ?? 0];
    const promptIndex = state.signalPromptOrder?.[state.signalReceiverIndex ?? 0] ?? 0;
    const card = signalDeck[promptIndex];
    const isReceiver = actor.playerId === receiverId;
    const clueEntries = state.signalClues ?? [];
    return {
      ...base,
      expectedCount: state.playerIds.length - 1,
      submittedCount: state.phase === 'signal-clue' ? entries.length : state.playerIds.length - 1,
      receiverId,
      receiverName: players.find((player) => player.id === receiverId)?.name ?? 'The receiver',
      isReceiver,
      signalTurnNumber: (state.signalReceiverIndex ?? 0) + 1,
      signalTurnTotal: state.playerIds.length,
      signalTarget: state.phase === 'results' || !isReceiver ? card.target : undefined,
      signalCategory: state.phase === 'results' || !isReceiver ? card.category : undefined,
      signalBlocked: state.phase === 'results' || !isReceiver ? card.blocked : undefined,
      ownSignalClue: ownEntry ? (JSON.parse(ownEntry.valueJson) as { clue: string }).clue : null,
      signalClues: state.phase === 'signal-clue' ? undefined : isReceiver && state.phase === 'signal-guess'
        ? clueEntries.filter((clue) => !clue.cancelled).map((clue, index) => ({ ...clue, playerId: `anonymous-signal-${index}` }))
        : clueEntries,
      signalCancelledCount: clueEntries.filter((clue) => clue.cancelled).length,
      signalCorrectCount: state.signalCorrectCount ?? 0,
      result: state.phase === 'results' ? state.result : undefined,
    };
  }

  if (definition?.mode === 'writers') {
    const directorId = state.playerIds[state.writersDirectorIndex ?? 0];
    const promptIndex = state.writersPromptOrder?.[state.writersDirectorIndex ?? 0] ?? 0;
    const prompt = writersRoomDeck[promptIndex];
    const isDirector = actor.playerId === directorId;
    const pitches = state.writersPitches ?? [];
    return {
      ...base,
      expectedCount: state.playerIds.length - 1,
      submittedCount: state.phase === 'writers-writing' ? entries.length : state.playerIds.length - 1,
      directorId,
      directorName: players.find((player) => player.id === directorId)?.name ?? 'The director',
      isDirector,
      writersTurnNumber: (state.writersDirectorIndex ?? 0) + 1,
      writersTurnTotal: state.playerIds.length,
      writersPrompt: prompt,
      ownWritersPitch: ownEntry ? (JSON.parse(ownEntry.valueJson) as { pitch: string }).pitch : null,
      writersPitches: state.phase === 'writers-judging'
        ? pitches.map((entry, index) => ({ playerId: `anonymous-writer-${index}`, pitch: entry.pitch }))
        : state.phase === 'results' ? pitches : undefined,
      result: state.phase === 'results' ? state.result : undefined,
    };
  }

  if (definition?.mode === 'relay') {
    const playerIndex = state.playerIds.indexOf(actor.playerId);
    const relayStep = state.relayStep ?? 0;
    const chainIndex = ((playerIndex - relayStep) % state.playerIds.length + state.playerIds.length) % state.playerIds.length;
    const chain = state.relayChains?.[chainIndex];
    const ownRelayValue = ownEntry ? JSON.parse(ownEntry.valueJson) as { drawing?: RelayStroke[]; guess?: string } : null;
    const revealChain = state.relayChains?.[state.relayRevealIndex ?? 0];
    return {
      ...base,
      submittedCount: state.phase === 'relay-drawing' || state.phase === 'relay-guessing' ? entries.length : state.playerIds.length,
      relayStepNumber: relayStep + 1,
      relayStepTotal: state.relayTotalSteps ?? Math.min(state.playerIds.length, 6),
      relaySourceText: state.phase === 'relay-drawing' ? (chain?.entries.at(-1)?.value as string | undefined) ?? chain?.prompt : undefined,
      relaySourceDrawing: state.phase === 'relay-guessing' ? chain?.entries.at(-1)?.value as RelayStroke[] | undefined : undefined,
      ownRelayDrawing: ownRelayValue?.drawing,
      ownRelayGuess: ownRelayValue?.guess,
      relayRevealNumber: (state.relayRevealIndex ?? 0) + 1,
      relayRevealTotal: state.relayChains?.length ?? state.playerIds.length,
      relayRevealChain: state.phase === 'relay-reveal' ? revealChain : undefined,
      relaySummaries: state.phase === 'relay-final' ? state.relayChains?.map((relayChain) => ({
        prompt: relayChain.prompt,
        finalGuess: [...relayChain.entries].reverse().find((entry) => entry.kind === 'guess')?.value,
      })) : undefined,
    };
  }

  if (definition?.mode === 'night') {
    const missionIndex = state.nightMissionIndex ?? 0;
    const proposalAttempt = state.nightProposalAttempt ?? 1;
    const leaderId = state.playerIds[state.nightLeaderIndex ?? 0];
    const role = state.nightRoles?.[actor.playerId] ?? 'crew';
    const selected = state.nightProposedIds ?? [];
    const action = ownEntry ? (JSON.parse(ownEntry.valueJson) as { action?: NightAction }).action : undefined;
    const ownVote = ownEntry ? (JSON.parse(ownEntry.valueJson) as { vote?: NightVote }).vote : undefined;
    return {
      ...base,
      expectedCount: state.phase === 'night-mission' ? selected.length : state.playerIds.length,
      nightRole: role,
      nightSaboteurIds: role === 'saboteur' ? state.playerIds.filter((id) => state.nightRoles?.[id] === 'saboteur') : undefined,
      nightLeaderId: leaderId,
      nightLeaderName: players.find((player) => player.id === leaderId)?.name ?? 'Shift lead',
      nightIsLeader: actor.playerId === leaderId,
      nightMissionNumber: missionIndex + 1,
      nightMissionTotal: 5,
      nightTeamSize: nightTeamSize(state.playerIds.length, missionIndex),
      nightProposalAttempt: proposalAttempt,
      nightEmergencyDispatch: proposalAttempt >= 3,
      nightProposedIds: selected,
      nightIsSelected: selected.includes(actor.playerId),
      nightOwnVote: ownVote,
      nightOwnAction: action,
      nightVotes: state.phase === 'night-voting' ? undefined : state.nightVotes,
      nightLastVote: state.nightLastVote,
      nightCrewWins: state.nightCrewWins ?? 0,
      nightSaboteurWins: state.nightSaboteurWins ?? 0,
      nightHistory: state.nightHistory ?? [],
      nightDebrief: state.phase === 'night-debrief' || state.phase === 'night-final' ? state.nightDebrief : undefined,
      nightRoleReveal: state.phase === 'night-final' ? state.playerIds.map((playerId) => ({ playerId, role: state.nightRoles?.[playerId] ?? 'crew' })) : undefined,
      result: state.phase === 'night-debrief' || state.phase === 'night-final' ? state.result : undefined,
    };
  }

  const card = outsiderCard(state.slug, state.contentIndex);
  return {
    ...base,
    briefingEndsAt: state.briefingEndsAt,
    turnEndsAt: state.performanceEndsAt,
    cardTitle: ['alibi-club', 'house-rule'].includes(state.slug) && state.phase !== 'results' ? undefined : card.title,
    privatePrompt: state.slug === 'alibi-club' && state.phase !== 'briefing' ? undefined : actor.playerId === state.outsiderId ? card.outsider : card.regular,
    instruction: card.instruction,
    note: state.slug === 'alibi-club' ? undefined : card.note,
    result: state.phase === 'results' ? {
      ...state.result,
      regularPrompt: card.regular,
      outsiderPrompt: card.outsider,
    } : undefined,
  };
}

function automaticResult(state: GameState) {
  return Boolean(completeOutcome(state)) && ['devils-advocate', 'charades', 'fishbowl', 'two-truths', 'signal-lost', 'writers-room', 'doodle-relay', 'night-shift'].includes(state.slug);
}

async function resultStatement(row: GameRow, state: GameState, expectedVersion = row.version, afterUpdate = false) {
  const outcome = state.completedOutcome ?? completeOutcome(state);
  if (!outcome) return null;
  const players = (await roomPlayers(row.roomId)).filter(p => outcome.awards.some(a => a.playerId === p.id))
    .map(({ id, name, avatarColor }) => ({ id, name, avatarColor }));
  return getDatabase().prepare(`INSERT INTO room_results (id, room_id, slug, outcome_json, finished_at)
    SELECT ?, ?, ?, ?, ? WHERE ${afterUpdate ? "changes() = 1 AND" : ""} EXISTS (SELECT 1 FROM game_sessions WHERE id = ? AND version = ?)
    ON CONFLICT(id) DO NOTHING`)
    .bind(`${row.id}:${state.seriesNumber ?? 0}`, row.roomId, state.slug, JSON.stringify({ ...outcome, players }), Date.now(), row.id, expectedVersion);
}

async function saveState(row: GameRow, state: GameState) {
  const previous = JSON.parse(row.stateJson) as GameState;
  const outcome = completeOutcome(state);
  if (outcome) state.completedOutcome = outcome;
  const bankPrevious = (state.seriesNumber ?? 0) !== (previous.seriesNumber ?? 0)
    ? await resultStatement(row, previous) : null;
  const bankComplete = automaticResult(state) ? await resultStatement(row, state, row.version + 1, true) : null;
  const update = getDatabase().prepare(`UPDATE game_sessions SET state_json = ?, version = version + 1, updated_at = ?
    WHERE id = ? AND version = ?`).bind(JSON.stringify(state), Date.now(), row.id, row.version);
  const cleanup = (state.seriesNumber ?? 0) !== (previous.seriesNumber ?? 0)
    ? getDatabase().prepare(`DELETE FROM game_submissions WHERE session_id = ?
        AND EXISTS (SELECT 1 FROM game_sessions WHERE id = ? AND version = ?)`).bind(row.id, row.id, row.version) : null;
  const priorHistory = cardHistoryStatement(row.roomId, previous, row.id, row.version);
  const history = cardHistoryStatement(row.roomId, state, row.id, row.version);
  const statements = [...(priorHistory ? [priorHistory] : []), ...(history ? [history] : []), ...(bankPrevious ? [bankPrevious] : []), ...(cleanup ? [cleanup] : []), update, ...(bankComplete ? [bankComplete] : [])];
  const results = await getDatabase().batch(statements);
  if (!results[Number(Boolean(priorHistory)) + Number(Boolean(history)) + Number(Boolean(bankPrevious)) + Number(Boolean(cleanup))].meta.changes) throw new Error('ROUND_CHANGED');
}

// Check the version again inside the write: a host may advance while a submission
// is in flight. Categories sheets and Advocate ratings keep the first submission on retries.
async function saveSubmission(row: GameRow, round: number, playerId: string, kind: string, valueJson: string) {
  const result = await getDatabase().prepare(`INSERT INTO game_submissions (id, session_id, round, player_id, kind, value_json, created_at)
    SELECT ?, ?, ?, ?, ?, ?, ?
    WHERE EXISTS (SELECT 1 FROM game_sessions WHERE id = ? AND version = ?)
    ON CONFLICT(session_id, round, player_id, kind) DO UPDATE SET
      value_json = CASE WHEN excluded.kind IN ('categories', 'advocate-rating', 'order') THEN game_submissions.value_json ELSE excluded.value_json END,
      created_at = CASE WHEN excluded.kind IN ('categories', 'advocate-rating', 'order') THEN game_submissions.created_at ELSE excluded.created_at END`)
    .bind(crypto.randomUUID(), row.id, round, playerId, kind, valueJson, Date.now(), row.id, row.version).run();
  if (!result.meta.changes) throw new Error('ROUND_CHANGED');
}

function charadesRecap(state: GameState): GameState {
  // The card still on screen has been seen by this team, even when time runs
  // out before they score or pass it. Do not give it to the next team.
  const promptCount = state.charadesPromptOrder?.length || charadesPrompts.length;
  const charadesPromptCursor = state.phase === 'charades-turn'
    ? Math.min((state.charadesPromptCursor ?? 0) + 1, promptCount)
    : state.charadesPromptCursor;
  return { ...state, phase: 'charades-recap', charadesTurnEndsAt: undefined, charadesPromptCursor };
}

function fishbowlTurnRecap(state: GameState): GameState {
  return { ...state, phase: 'fishbowl-turn-recap', fishbowlTurnEndsAt: undefined };
}

async function categoriesResult(row: GameRow, state: GameState): Promise<GameState> {
  const entries = await submissions(row.id, state.round, 'categories');
  const letter = categoryLetters[state.categoryLetterIndex ?? 0].toLocaleLowerCase('en');
  const categories = categorySets[state.categorySetIndex ?? 0];
  const roundScores = Object.fromEntries(state.playerIds.map((id) => [id, 0]));
  const categoryResults = categories.map((category, categoryIndex) => {
    const answers = entries.map((entry) => ({
      playerId: entry.playerId,
      answer: (JSON.parse(entry.valueJson) as { answers: string[] }).answers[categoryIndex] ?? '',
    }));
    const counts = new Map<string, number>();
    answers.forEach(({ answer }) => {
      const normalized = normalizeAnswer(answer);
      if (normalized) counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    });
    return {
      category,
      entries: answers.map(({ playerId, answer }) => {
        const normalized = normalizeAnswer(answer);
        const scored = Boolean(normalized) && normalized.startsWith(letter) && counts.get(normalized) === 1;
        if (scored) roundScores[playerId] = (roundScores[playerId] ?? 0) + 1;
        return { playerId, answer, scored };
      }),
    };
  });
  const scores = { ...state.scores };
  state.playerIds.forEach((id) => { scores[id] = (scores[id] ?? 0) + (roundScores[id] ?? 0); });
  const highScore = Math.max(...Object.values(roundScores));
  const winnerIds = highScore > 0 ? state.playerIds.filter((id) => roundScores[id] === highScore) : [];
  return { ...state, phase: 'results', scores, categoriesEndsAt: undefined, result: { categoryResults, roundScores, winnerIds } };
}

function nextAdvocatePhase(state: GameState, endedAt: number): GameState {
  const challengeSeconds = state.settings?.challengeSeconds ?? 0;
  const challengeEndsAt = endedAt + challengeSeconds * 1000;
  return state.phase === 'advocate-defense' && challengeSeconds > 0 && challengeEndsAt > Date.now()
    ? { ...state, phase: 'advocate-challenge', advocateEndsAt: challengeEndsAt }
    : { ...state, phase: 'advocate-rating', advocateEndsAt: undefined };
}

function outsiderResult(state: GameState, votes: Submission[]): GameState {
        const tally: Record<string, number> = {};
        for (const vote of votes) {
          const target = (JSON.parse(vote.valueJson) as { targetId: string }).targetId;
          tally[target] = (tally[target] ?? 0) + 1;
        }
        const highest = Math.max(...Object.values(tally));
        const leaders = Object.keys(tally).filter((id) => tally[id] === highest);
        const caught = leaders.length === 1 && leaders[0] === state.outsiderId;
        const scores = { ...state.scores };
        if (caught) {
          for (const vote of votes) {
            const target = (JSON.parse(vote.valueJson) as { targetId: string }).targetId;
            if (target === state.outsiderId && vote.playerId !== state.outsiderId) scores[vote.playerId] = (scores[vote.playerId] ?? 0) + 1;
          }
        } else if (state.outsiderId && votes.length) scores[state.outsiderId] = (scores[state.outsiderId] ?? 0) + 2;
        return { ...state, phase: 'results', scores, result: { outsiderId: state.outsiderId, caught, tally } };
}

async function humanScaleResult(row: GameRow, state: GameState): Promise<GameState> {
  const entries = await submissions(row.id, state.round, 'order');
  const result = scoreHumanScaleOrders(state.playerIds, state.lineupRanks ?? {}, Object.fromEntries(entries.map(e => [e.playerId, JSON.parse(e.valueJson).order])));
  const scores = Object.fromEntries(state.playerIds.map(id => [id, (state.scores[id] ?? 0) + result.roundScores[id]]));
  return { ...state, phase: 'results', scores, result };
}
function finishIdentity(state: GameState, solved: boolean): GameState {
  const index = state.identityCurrentIndex ?? 0;
  const playerId = state.playerIds[index];
  const result = { playerId, solved, elapsedMs: identityElapsedMs(state.identityStartedAt ?? Date.now(), Date.now(), state.settings?.turnSeconds ?? 120) };
  const identityResults = [...(state.identityResults ?? []), result];
  const done = index + 1 >= state.playerIds.length;
  const scores = done ? Object.fromEntries(rankIdentityResults(identityResults).map(r => [r.playerId, r.rank === null ? 0 : state.playerIds.length - r.rank + 1])) : state.scores;
  return { ...state, identityResults, scores, identitySolved: { ...state.identitySolved, [playerId]: solved }, identityCurrentIndex: done ? index : index + 1, phase: done ? 'results' : 'identity-briefing', identityStartedAt: undefined, identityEndsAt: undefined, result: done ? { identityRevealed: false } : undefined };
}

async function settleExpiredTeamTurn(row: GameRow) {
  const state = JSON.parse(row.stateJson) as GameState;
  // A room created before timed briefings must not be stranded by the new UI.
  if (state.slug === 'alibi-club' && state.phase === 'briefing' && !state.briefingEndsAt) {
    try { await saveState(row, { ...state, briefingEndsAt: Date.now() + 10_000 }); }
    catch (error) { if (!(error instanceof Error) || error.message !== 'ROUND_CHANGED') throw error; }
    return (await loadGame(row.roomId)) ?? row;
  }
  if (state.slug === 'who-am-i' && state.phase === 'identity-playing' && !state.identityEndsAt) {
    try { await saveState(row, { ...state, identityStartedAt: Date.now(), identityEndsAt: Date.now() + (state.settings?.turnSeconds ?? 120) * 1000 }); } catch (error) { if (!(error instanceof Error) || error.message !== 'ROUND_CHANGED') throw error; }
    return (await loadGame(row.roomId)) ?? row;
  }
  const performanceExpired = state.phase === 'performance' && state.performanceEndsAt && Date.now() >= state.performanceEndsAt;
  const identityExpired = state.phase === 'identity-playing' && state.identityEndsAt && Date.now() >= state.identityEndsAt;
  const charadesExpired = state.phase === 'charades-turn' && state.charadesTurnEndsAt && Date.now() >= state.charadesTurnEndsAt;
  const fishbowlExpired = state.phase === 'fishbowl-turn' && state.fishbowlTurnEndsAt && Date.now() >= state.fishbowlTurnEndsAt;
  const categoriesExpired = state.phase === 'categories-answering' && state.categoriesEndsAt && Date.now() >= state.categoriesEndsAt;
  const advocateExpired = (state.phase === 'advocate-defense' || state.phase === 'advocate-challenge') && state.advocateEndsAt && Date.now() >= state.advocateEndsAt;
  const briefingExpired = state.slug === 'alibi-club' && state.phase === 'briefing' && state.briefingEndsAt && Date.now() >= state.briefingEndsAt;
  if (!performanceExpired && !identityExpired && !briefingExpired && !charadesExpired && !fishbowlExpired && !categoriesExpired && !advocateExpired) return row;
  const next: GameState = performanceExpired ? { ...state, phase: 'vote', performanceEndsAt: undefined } : identityExpired ? finishIdentity(state, false) : briefingExpired ? { ...state, phase: 'vote', briefingEndsAt: undefined } : advocateExpired ? nextAdvocatePhase(state, state.advocateEndsAt!) : charadesExpired ? charadesRecap(state) : fishbowlExpired ? fishbowlTurnRecap(state) : await categoriesResult(row, state);
  try { await saveState(row, next); } catch (error) { if (!(error instanceof Error) || error.message !== 'ROUND_CHANGED') throw error; }
  return (await getDatabase().prepare('SELECT id, room_id AS roomId, slug, state_json AS stateJson, version FROM game_sessions WHERE id = ?').bind(row.id).first<GameRow>()) ?? row;
}

function normalizeAnswer(answer: string) {
  return answer.toLocaleLowerCase('en').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function relayDrawing(value: unknown): RelayStroke[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > RELAY_MAX_STROKES) return null;
  const colors = new Set(['#172019', '#e54b3d', '#4767d8', '#4c9a5d', '#efb92e']);
  const widths = new Set([4, 8, 14]);
  let pointCount = 0;
  const drawing: RelayStroke[] = [];
  for (const possibleStroke of value) {
    if (!possibleStroke || typeof possibleStroke !== 'object') return null;
    const stroke = possibleStroke as { color?: unknown; width?: unknown; points?: unknown };
    if (typeof stroke.color !== 'string' || !colors.has(stroke.color) || typeof stroke.width !== 'number' || !widths.has(stroke.width) || !Array.isArray(stroke.points) || stroke.points.length < 1) return null;
    pointCount += stroke.points.length;
    if (pointCount > RELAY_MAX_POINTS) return null;
    const points: Array<[number, number]> = [];
    for (const possiblePoint of stroke.points) {
      if (!Array.isArray(possiblePoint) || possiblePoint.length !== 2 || typeof possiblePoint[0] !== 'number' || typeof possiblePoint[1] !== 'number' || !Number.isFinite(possiblePoint[0]) || !Number.isFinite(possiblePoint[1]) || possiblePoint[0] < 0 || possiblePoint[0] > 1 || possiblePoint[1] < 0 || possiblePoint[1] > 1) return null;
      points.push([Math.round(possiblePoint[0] * 10_000) / 10_000, Math.round(possiblePoint[1] * 10_000) / 10_000]);
    }
    drawing.push({ color: stroke.color, width: stroke.width, points });
  }
  return pointCount >= 2 ? drawing : null;
}

function finishAdvocateTurn(state: GameState, ratings: Submission[]): GameState {
  const index = state.advocateIndex ?? 0;
  const playerId = state.playerIds[index];
  const total = ratings.reduce((sum, entry) => sum + (JSON.parse(entry.valueJson) as { rating: number }).rating, 0);
  const next = { ...state, scores: { ...state.scores, [playerId]: total }, advocateRatingCounts: { ...state.advocateRatingCounts, [playerId]: ratings.length }, advocateEndsAt: undefined };
  return index === state.playerIds.length - 1
    ? { ...next, phase: 'advocate-final' }
    : { ...next, phase: 'advocate-ready', round: state.round + 1, advocateIndex: index + 1 };
}

async function recoverTurn(row: GameRow, state: GameState): Promise<GameState | null> {
  switch (state.phase) {
    case 'performance': return { ...state, phase: 'vote', performanceEndsAt: undefined };
    case 'advocate-ready': return finishAdvocateTurn(state, []);
    case 'advocate-defense': return nextAdvocatePhase(state, Date.now());
    case 'advocate-challenge': return { ...state, phase: 'advocate-rating', advocateEndsAt: undefined };
    case 'charades-ready': return charadesRecap({ ...state, charadesTurnScore: 0 });
    case 'charades-turn': return charadesRecap(state);
    case 'fishbowl-ready': return { ...state, fishbowlActorIndex: (state.fishbowlActorIndex ?? 0) + 1, fishbowlTurnScore: 0 };
    case 'fishbowl-turn': return fishbowlTurnRecap(state);
    case 'identity-playing': return finishIdentity(state, false);
    case 'lineup': return humanScaleResult(row, state);
    case 'truths-writing': {
      const index = (state.truthStorytellerIndex ?? 0) + 1;
      return index >= state.playerIds.length ? { ...state, phase: 'truths-final', result: undefined }
        : { ...state, phase: 'truths-writing', round: state.round + 1, truthStorytellerIndex: index, truthStatements: undefined, truthLieIndex: undefined, result: undefined };
    }
    case 'signal-clue': {
      const entries = await submissions(row.id, state.round, 'signal-clue');
      const parsed = entries.map(e => ({ playerId: e.playerId, clue: (JSON.parse(e.valueJson) as { clue: string }).clue }));
      return { ...state, phase: 'signal-guess', signalClues: parsed.map(e => ({ ...e, cancelled: parsed.filter(other => normalizeAnswer(other.clue) === normalizeAnswer(e.clue)).length > 1 })) };
    }
    case 'signal-guess': return { ...state, phase: 'results', result: { signalTarget: signalDeck[state.signalPromptOrder?.[state.signalReceiverIndex ?? 0] ?? 0].target, signalGuess: '', signalCorrect: false } };
    case 'writers-writing': {
      const entries = await submissions(row.id, state.round, 'writers-pitch');
      if (entries.length) return { ...state, phase: 'writers-judging', writersPitches: shuffledIndices(entries.length).map(i => ({ playerId: entries[i].playerId, pitch: (JSON.parse(entries[i].valueJson) as { pitch: string }).pitch })) };
      // No pitches: take the same unscored route as an absent director.
    }
    // falls through
    case 'writers-judging': {
      const index = (state.writersDirectorIndex ?? 0) + 1;
      return index >= state.playerIds.length ? { ...state, phase: 'writers-final', result: undefined }
        : { ...state, phase: 'writers-writing', round: state.round + 1, writersDirectorIndex: index, writersPitches: undefined, result: undefined };
    }
    case 'relay-drawing':
    case 'relay-guessing': {
      const drawing = state.phase === 'relay-drawing';
      const entries = await submissions(row.id, state.round, drawing ? 'relay-draw' : 'relay-guess');
      const chains = (state.relayChains ?? []).map(chain => ({ ...chain, entries: [...chain.entries] }));
      for (const entry of entries) {
        const index = ((state.playerIds.indexOf(entry.playerId) - (state.relayStep ?? 0)) % state.playerIds.length + state.playerIds.length) % state.playerIds.length;
        const value = JSON.parse(entry.valueJson) as { drawing: RelayStroke[]; guess: string };
        chains[index].entries.push(drawing ? { playerId: entry.playerId, kind: 'draw', value: value.drawing } : { playerId: entry.playerId, kind: 'guess', value: value.guess });
      }
      return { ...state, phase: 'relay-reveal', relayChains: chains, relayRevealIndex: 0 };
    }
    case 'night-proposing': return { ...state, nightLeaderIndex: ((state.nightLeaderIndex ?? 0) + 1) % state.playerIds.length };
    case 'night-voting': return resolvedNightVote(state, await submissions(row.id, state.round, `night-vote-${state.nightProposalAttempt ?? 1}`));
    case 'night-mission': return {
      ...state, phase: 'night-proposing', round: state.round + 1,
      nightLeaderIndex: ((state.nightLeaderIndex ?? 0) + 1) % state.playerIds.length,
      nightProposalAttempt: 1, nightProposedIds: undefined, nightVotes: undefined,
      nightLastVote: undefined, nightDebrief: undefined,
    };
    default: return null;
  }
}

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    await ensureSchema();
    const { code: rawCode } = await context.params;
    const code = rawCode.toUpperCase();
    const body = (await request.json()) as { action?: string; token?: unknown; slug?: unknown; value?: unknown; targetId?: unknown; gameId?: unknown; version?: unknown; settings?: unknown };
    const actor = await actorFor(code, body.token);
    if (!actor) return NextResponse.json({ error: 'Your seat in this room could not be verified.' }, { status: 401 });
    let row = await loadGame(actor.roomId);

    if (body.action === 'view') {
      if (row) row = await settleExpiredTeamTurn(row);
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'claim-host') {
      if (row && !(JSON.parse(row.stateJson) as GameState).playerIds.includes(actor.playerId)) {
        return NextResponse.json({ error: 'A player in the current game must take over hosting.' }, { status: 403 });
      }
      const database = getDatabase();
      const changed = await database.batch([
        database.prepare(`UPDATE rooms SET host_player_id = ? WHERE id = ?
          AND EXISTS (SELECT 1 FROM players WHERE id = rooms.host_player_id AND room_id = rooms.id AND last_seen <= ?)`)
          .bind(actor.playerId, actor.roomId, Date.now() - HOST_TAKEOVER_DELAY),
        database.prepare(`UPDATE players SET is_host = CASE WHEN id = (SELECT host_player_id FROM rooms WHERE id = ?) THEN 1 ELSE 0 END
          WHERE room_id = ?`).bind(actor.roomId, actor.roomId),
        database.prepare('UPDATE players SET last_seen = ? WHERE id = ?').bind(Date.now(), actor.playerId),
      ]);
      if (!changed[0].meta.changes) return NextResponse.json({ error: 'The host is still connected. Ask them to transfer hosting.' }, { status: 409 });
      actor.isHost = 1;
      return NextResponse.json(await gameView(actor, await loadGame(actor.roomId)));
    }

    if (body.gameId !== undefined && body.gameId !== (row?.id ?? null)) {
      return NextResponse.json({ error: 'The match changed. Refresh before making another move.' }, { status: 409 });
    }

    // A match can revisit the same phase. Check the state the phone actually saw,
    // while allowing simultaneous submissions that do not advance that state.
    if (row) row = await settleExpiredTeamTurn(row);
    if (body.version !== undefined && body.version !== row?.version) {
      return NextResponse.json({ error: 'The round moved on. Refreshing…' }, { status: 409 });
    }

    if (body.action === 'transfer-host' || body.action === 'remove-player') {
      if (!actor.isHost) return NextResponse.json({ error: 'Only the host can manage players.' }, { status: 403 });
      const players = await roomPlayers(actor.roomId);
      const target = players.find((player) => player.id === body.targetId && player.id !== actor.playerId);
      if (!target) return NextResponse.json({ error: 'Choose another player in this room.' }, { status: 400 });
      if (row && body.action === 'transfer-host' && !(JSON.parse(row.stateJson) as GameState).playerIds.includes(target.id)) {
        return NextResponse.json({ error: 'Choose a player in the current game to host.' }, { status: 409 });
      }
      const database = getDatabase();
      if (body.action === 'transfer-host') {
        // Keep the room owner and player flags in one transaction, including concurrent requests.
        const result = await database.batch([
          database.prepare(`UPDATE rooms SET host_player_id = ? WHERE id = ? AND host_player_id = ?
            AND EXISTS (SELECT 1 FROM players WHERE id = ? AND room_id = ?)`)
            .bind(target.id, actor.roomId, actor.playerId, target.id, actor.roomId),
          database.prepare(`UPDATE players SET is_host = CASE WHEN id = (SELECT host_player_id FROM rooms WHERE id = ?) THEN 1 ELSE 0 END WHERE room_id = ?`)
            .bind(actor.roomId, actor.roomId),
        ]);
        if (!result[0].meta.changes) return NextResponse.json({ error: 'The host changed. Refresh the room.' }, { status: 409 });
        actor.isHost = 0;
      } else {
        const result = await database.prepare(`DELETE FROM players WHERE id = ? AND room_id = ? AND is_host = 0
          AND NOT EXISTS (SELECT 1 FROM game_sessions WHERE room_id = ?)`)
          .bind(target.id, actor.roomId, actor.roomId).run();
        if (!result.meta.changes) return NextResponse.json({ error: 'Return to the lobby before removing players.' }, { status: 409 });
      }
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'remove-playtesters') {
      if (!actor.isHost) return NextResponse.json({ error: 'Only the host can clear simulated players.' }, { status: 403 });
      if (row) return NextResponse.json({ error: 'End the current game before clearing simulated players.' }, { status: 409 });
      const playerIds = Array.isArray(body.value)
        ? Array.from(new Set(body.value.filter((value): value is string => typeof value === 'string'))).slice(0, 11)
        : [];
      if (playerIds.length) {
        await getDatabase().batch(playerIds.map((playerId) => getDatabase().prepare('DELETE FROM players WHERE id = ? AND room_id = ? AND is_host = 0').bind(playerId, actor.roomId)));
      }
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'start' || body.action === 'restart') {
      if (!actor.isHost) return NextResponse.json({ error: 'Only the host can choose the game.' }, { status: 403 });
      if (body.action === 'start' && row) return NextResponse.json({ error: 'End or restart the current match first.' }, { status: 409 });
      if (body.action === 'restart' && !row) return NextResponse.json({ error: 'There is no active game.' }, { status: 404 });
      const definition = body.action === 'restart' && row ? getGame(row.slug) : typeof body.slug === 'string' ? getGame(body.slug) : undefined;
      if (!definition?.available) return NextResponse.json({ error: 'That game is not ready yet.' }, { status: 400 });
      const players = await roomPlayers(actor.roomId);
      if (players.length < definition.minPlayers) return NextResponse.json({ error: `${definition.title} needs at least ${definition.minPlayers} players.` }, { status: 409 });
      if (players.length > definition.maxPlayers) return NextResponse.json({ error: `${definition.title} supports up to ${definition.maxPlayers} players.` }, { status: 409 });
      const previous = row ? JSON.parse(row.stateJson) as GameState : undefined;
      const state = await newRound(actor.roomId, definition.slug, players, 1, Object.fromEntries(players.map(player => [player.id, 0])), previous);
      const supplied = body.settings;
      if (supplied !== undefined && (!supplied || typeof supplied !== 'object' || Array.isArray(supplied))) return NextResponse.json({ error: 'Choose valid game times.' }, { status: 400 });
      const settings = { defenseSeconds: 60, challengeSeconds: 0, turnSeconds: definition.slug === 'categories' ? 90 : definition.slug === 'fishbowl' ? 45 : definition.slug === 'who-am-i' ? 120 : definition.slug === 'head-fake' ? 20 : 60, ...previous?.settings, ...(supplied as Record<string, unknown> ?? {}) };
      if (!Number.isInteger(settings.defenseSeconds) || settings.defenseSeconds < 15 || settings.defenseSeconds > 300 || !Number.isInteger(settings.challengeSeconds) || settings.challengeSeconds < 0 || settings.challengeSeconds > 300 || !Number.isInteger(settings.turnSeconds) || settings.turnSeconds < 15 || settings.turnSeconds > 300) return NextResponse.json({ error: 'Choose valid game times.' }, { status: 400 });
      state.settings = settings;
      const now = Date.now();
      const sessionId = crypto.randomUUID();
      if (row) {
        const bank = await resultStatement(row, JSON.parse(row.stateJson) as GameState);
        const priorHistory = cardHistoryStatement(row.roomId, previous!, row.id, row.version);
        const history = cardHistoryStatement(row.roomId, state, sessionId, row.version + 1);
        const changed = await getDatabase().batch([
          ...(priorHistory ? [priorHistory] : []),
          ...(bank ? [bank] : []),
          getDatabase().prepare(`DELETE FROM game_submissions WHERE session_id = ?
            AND EXISTS (SELECT 1 FROM game_sessions WHERE id = ? AND version = ?)`).bind(row.id, row.id, row.version),
          getDatabase().prepare(`UPDATE game_sessions SET id = ?, slug = ?, state_json = ?, version = version + 1, updated_at = ?
            WHERE id = ? AND version = ?`).bind(sessionId, definition.slug, JSON.stringify(state), now, row.id, row.version),
          ...(history ? [history] : []),
        ]);
        if (!changed[changed.length - 1 - Number(Boolean(history))].meta.changes) throw new Error('ROUND_CHANGED');
      } else {
        const history = cardHistoryStatement(actor.roomId, state, sessionId, 1);
        const inserted = await getDatabase().batch([getDatabase().prepare(`INSERT INTO game_sessions (id, room_id, slug, state_json, version, created_at, updated_at)
          SELECT ?, ?, ?, ?, 1, ?, ? WHERE (SELECT COUNT(*) FROM players WHERE room_id = ?) = ?
          ON CONFLICT(room_id) DO NOTHING`).bind(sessionId, actor.roomId, definition.slug, JSON.stringify(state), now, now, actor.roomId, players.length), ...(history ? [history] : [])]);
        if (!inserted[0].meta.changes) throw new Error('ROUND_CHANGED');
      }
      row = await loadGame(actor.roomId);
      return NextResponse.json(await gameView(actor, row));
    }

    if (!row) return NextResponse.json({ error: 'There is no active game.' }, { status: 404 });
    const state = JSON.parse(row.stateJson) as GameState;
    if (!state.playerIds.includes(actor.playerId)) return NextResponse.json({ error: 'You are watching this round.' }, { status: 403 });

    const recovering = body.action === 'recover';
    if (recovering) {
      if (!actor.isHost) return NextResponse.json({ error: 'Only the host can recover a stuck turn.' }, { status: 403 });
      if (body.gameId !== row.id || body.version !== row.version) return NextResponse.json({ error: 'The round moved on. Refreshing…' }, { status: 409 });
      if (!recoveryOptions[state.phase]) return NextResponse.json({ error: 'This step already has a normal continue button.' }, { status: 409 });
      const recovered = await recoverTurn(row, state);
      if (recovered) {
        await saveState(row, recovered);
        return NextResponse.json(await gameView(actor, await loadGame(actor.roomId)));
      }
      // The ordinary reveal path already knows how to score the received answers.
      body.action = 'advance';
    }

    if (body.action === 'skip-card') {
      if (!actor.isHost) return NextResponse.json({ error: 'Only the host can skip a card.' }, { status: 403 });
      if (!outsiderDecks[state.slug] || !['briefing', 'performance', 'vote'].includes(state.phase)) return NextResponse.json({ error: 'This card cannot be skipped now.' }, { status: 409 });
      if (body.gameId !== row.id || body.version !== row.version) return NextResponse.json({ error: 'The round moved on. Refreshing…' }, { status: 409 });
      const players = (await roomPlayers(actor.roomId)).filter(player => state.playerIds.includes(player.id));
      await saveState(row, await newRound(row.roomId, state.slug, players, state.round + 1, state.scores, state));
      return NextResponse.json(await gameView(actor, await loadGame(actor.roomId)));
    }

    if (body.action === 'advocate-rate') {
      if (state.phase !== 'advocate-rating') return NextResponse.json({ error: 'Ratings open after the timed phases.' }, { status: 409 });
      if (actor.playerId === state.playerIds[state.advocateIndex ?? 0]) return NextResponse.json({ error: 'You cannot rate your own defense.' }, { status: 403 });
      if (typeof body.value !== 'number' || !Number.isInteger(body.value) || body.value < 1 || body.value > 10) {
        return NextResponse.json({ error: 'Choose a whole-number rating from 1 to 10.' }, { status: 400 });
      }
      await saveSubmission(row, state.round, actor.playerId, 'advocate-rating', JSON.stringify({ rating: body.value }));
      return NextResponse.json(await gameView(actor, await loadGame(actor.roomId)));
    }

    if (body.action === 'category-score') {
      if (!actor.isHost) return NextResponse.json({ error: 'Only the host can resolve scoring disputes.' }, { status: 403 });
      if (state.slug !== 'categories' || state.phase !== 'results') return NextResponse.json({ error: 'Review scores after the answers are revealed.' }, { status: 409 });
      const review = body.value as { categoryIndex?: unknown; scored?: unknown } | null;
      if (!review || !Number.isInteger(review.categoryIndex) || typeof review.scored !== 'boolean') return NextResponse.json({ error: 'Choose an answer to review.' }, { status: 400 });
      const categoryResults = state.result?.categoryResults;
      const entry = categoryResults?.[review.categoryIndex as number]?.entries.find((entry) => entry.playerId === body.targetId);
      if (!entry || !entry.answer.trim()) return NextResponse.json({ error: 'Choose a submitted answer to review.' }, { status: 400 });
      const delta = Number(review.scored) - Number(entry.scored);
      entry.scored = review.scored;
      const roundScores = { ...state.result?.roundScores };
      roundScores[entry.playerId] = (roundScores[entry.playerId] ?? 0) + delta;
      const scores = { ...state.scores, [entry.playerId]: (state.scores[entry.playerId] ?? 0) + delta };
      const highScore = Math.max(...Object.values(roundScores));
      const winnerIds = highScore > 0 ? state.playerIds.filter((id) => roundScores[id] === highScore) : [];
      await saveState(row, { ...state, scores, result: { ...state.result, categoryResults, roundScores, winnerIds } });
      return NextResponse.json(await gameView(actor, await loadGame(actor.roomId)));
    }

    if (body.action === 'vote') {
      if (state.phase !== 'vote' || typeof body.targetId !== 'string' || !state.playerIds.includes(body.targetId)) {
        return NextResponse.json({ error: 'That vote is not valid.' }, { status: 400 });
      }
      await saveSubmission(row, state.round, actor.playerId, 'vote', JSON.stringify({ targetId: body.targetId }));
      if (['alibi-club', 'house-rule', 'head-fake'].includes(state.slug)) {
        const votes = await submissions(row.id, state.round, 'vote');
        if (votes.length === state.playerIds.length) {
          try { await saveState(row, outsiderResult(state, votes)); }
          catch (error) { if (!(error instanceof Error) || error.message !== 'ROUND_CHANGED') throw error; }
        }
      }
      return NextResponse.json(await gameView(actor, await loadGame(actor.roomId)));
    }

    if (body.action === 'answer') {
      const answer = typeof body.value === 'string' ? body.value.trim().replace(/\s+/g, ' ').slice(0, 60) : '';
      if (state.phase !== 'answering' || !answer) return NextResponse.json({ error: 'Write an answer before locking it in.' }, { status: 400 });
      await saveSubmission(row, state.round, actor.playerId, 'answer', JSON.stringify({ answer }));
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'fishbowl-prompts') {
      const prompts = Array.isArray(body.value)
        ? body.value.map((value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 50) : '').filter(Boolean)
        : [];
      if (state.phase !== 'fishbowl-setup') return NextResponse.json({ error: 'The bowl is already locked.' }, { status: 409 });
      if (prompts.length !== 2 || new Set(prompts.map((prompt) => prompt.toLocaleLowerCase('en'))).size !== 2) {
        return NextResponse.json({ error: 'Add two different names or phrases.' }, { status: 400 });
      }
      await saveSubmission(row, state.round, actor.playerId, 'fishbowl-prompt', JSON.stringify({ prompts }));
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'categories-submit') {
      const answers = Array.isArray(body.value)
        ? body.value.slice(0, 5).map((value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 40) : '')
        : [];
      if (state.phase !== 'categories-answering') return NextResponse.json({ error: 'That writing round has ended.' }, { status: 409 });
      if (answers.length !== 5) return NextResponse.json({ error: 'Submit one field for each of the five categories. Blank answers are allowed.' }, { status: 400 });
      await saveSubmission(row, state.round, actor.playerId, 'categories', JSON.stringify({ answers }));
      const categoryEntries = await submissions(row.id, state.round, 'categories');
      if (categoryEntries.length >= state.playerIds.length) {
        try {
          await saveState(row, await categoriesResult(row, state));
        } catch (error) {
          if (!(error instanceof Error) || error.message !== 'ROUND_CHANGED') throw error;
        }
        row = await loadGame(actor.roomId);
      }
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'truths-submit') {
      const statements = Array.isArray(body.value)
        ? body.value.slice(0, 3).map((value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 140) : '')
        : [];
      const lieIndex = typeof body.targetId === 'number' ? body.targetId : Number(body.targetId);
      const storytellerId = state.playerIds[state.truthStorytellerIndex ?? 0];
      if (state.phase !== 'truths-writing' || actor.playerId !== storytellerId) return NextResponse.json({ error: 'Only the current storyteller can write these claims.' }, { status: 403 });
      if (statements.length !== 3 || statements.some((statement) => statement.length < 3) || new Set(statements.map(normalizeAnswer)).size !== 3 || !Number.isInteger(lieIndex) || lieIndex < 0 || lieIndex > 2) {
        return NextResponse.json({ error: 'Write three different statements and mark exactly one lie.' }, { status: 400 });
      }
      const next = { ...state, phase: 'truths-discussion' as const, truthStatements: statements, truthLieIndex: lieIndex };
      await saveState(row, next);
      row = await loadGame(actor.roomId);
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'truths-vote') {
      const storytellerId = state.playerIds[state.truthStorytellerIndex ?? 0];
      const voteIndex = typeof body.value === 'number' ? body.value : Number(body.value);
      if (state.phase !== 'truths-vote' || !Number.isInteger(voteIndex) || voteIndex < 0 || voteIndex > 2) return NextResponse.json({ error: 'Choose one of the three statements.' }, { status: 400 });
      if (actor.playerId === storytellerId) return NextResponse.json({ error: 'The storyteller does not vote on their own lie.' }, { status: 403 });
      await saveSubmission(row, state.round, actor.playerId, 'truth-vote', JSON.stringify({ voteIndex }));
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'signal-clue') {
      const receiverId = state.playerIds[state.signalReceiverIndex ?? 0];
      if (state.phase !== 'signal-clue') return NextResponse.json({ error: 'The clue channel is already closed.' }, { status: 409 });
      if (actor.playerId === receiverId) return NextResponse.json({ error: 'The receiver waits for everyone else’s clues.' }, { status: 403 });
      const clue = typeof body.value === 'string' ? body.value.trim().slice(0, 24) : '';
      if (!clue || /\s/u.test(clue) || !/^[\p{L}\p{N}'’\-]+$/u.test(clue)) {
        return NextResponse.json({ error: 'Send exactly one word—letters, numbers, apostrophes, and hyphens are allowed.' }, { status: 400 });
      }
      const promptIndex = state.signalPromptOrder?.[state.signalReceiverIndex ?? 0] ?? 0;
      const card = signalDeck[promptIndex];
      const normalizedClue = normalizeAnswer(clue);
      const targetParts = [card.target, translateCopy(card.target, 'pt-PT')].flatMap((target) => normalizeAnswer(target).split(' '));
      const forbidden = [card.target, translateCopy(card.target, 'pt-PT'), ...(card.aliases ?? []), ...card.blocked, ...card.blocked.map((word) => translateCopy(word, 'pt-PT'))].map(normalizeAnswer);
      if (forbidden.includes(normalizedClue) || targetParts.includes(normalizedClue)) {
        return NextResponse.json({ error: 'That clue is the target, part of it, or one of the two blocked words.' }, { status: 400 });
      }
      await saveSubmission(row, state.round, actor.playerId, 'signal-clue', JSON.stringify({ clue }));
      const clueEntries = await submissions(row.id, state.round, 'signal-clue');
      if (clueEntries.length >= state.playerIds.length - 1) {
        const parsed = clueEntries.map((entry) => ({
          playerId: entry.playerId,
          clue: (JSON.parse(entry.valueJson) as { clue: string }).clue,
        }));
        const counts = new Map<string, number>();
        parsed.forEach(({ clue: entryClue }) => {
          const key = normalizeAnswer(entryClue);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        });
        const next = {
          ...state,
          phase: 'signal-guess' as const,
          signalClues: parsed.map((entry) => ({ ...entry, cancelled: (counts.get(normalizeAnswer(entry.clue)) ?? 0) > 1 })),
        };
        try {
          await saveState(row, next);
        } catch (error) {
          if (!(error instanceof Error) || error.message !== 'ROUND_CHANGED') throw error;
        }
        row = await loadGame(actor.roomId);
      }
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'signal-guess') {
      const receiverId = state.playerIds[state.signalReceiverIndex ?? 0];
      const guess = typeof body.value === 'string' ? body.value.trim().replace(/\s+/g, ' ').slice(0, 60) : '';
      if (state.phase !== 'signal-guess' || !guess) return NextResponse.json({ error: 'The receiver needs to make one guess.' }, { status: 400 });
      if (actor.playerId !== receiverId) return NextResponse.json({ error: 'Only the receiver can answer this signal.' }, { status: 403 });
      const promptIndex = state.signalPromptOrder?.[state.signalReceiverIndex ?? 0] ?? 0;
      const card = signalDeck[promptIndex];
      const accepted = [card.target, translateCopy(card.target, 'pt-PT'), ...(card.aliases ?? []), ...(card.aliases ?? []).map((alias) => translateCopy(alias, 'pt-PT'))].map(normalizeAnswer);
      const correct = accepted.includes(normalizeAnswer(guess));
      const scores = { ...state.scores };
      if (correct) state.playerIds.forEach((id) => { scores[id] = (scores[id] ?? 0) + 1; });
      const next = {
        ...state,
        phase: 'results' as const,
        scores,
        signalGuess: guess,
        signalCorrectCount: (state.signalCorrectCount ?? 0) + (correct ? 1 : 0),
        result: { signalTarget: card.target, signalGuess: guess, signalCorrect: correct },
      };
      await saveState(row, next);
      row = await loadGame(actor.roomId);
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'writers-pitch') {
      const directorId = state.playerIds[state.writersDirectorIndex ?? 0];
      const pitch = typeof body.value === 'string' ? body.value.trim().replace(/\s+/g, ' ').slice(0, 160) : '';
      if (state.phase !== 'writers-writing') return NextResponse.json({ error: 'The pitch window is already closed.' }, { status: 409 });
      if (actor.playerId === directorId) return NextResponse.json({ error: 'The director judges this scene instead of pitching.' }, { status: 403 });
      if (pitch.length < 3) return NextResponse.json({ error: 'Give the room a little more to work with.' }, { status: 400 });
      await saveSubmission(row, state.round, actor.playerId, 'writers-pitch', JSON.stringify({ pitch }));
      const pitchEntries = await submissions(row.id, state.round, 'writers-pitch');
      if (pitchEntries.length >= state.playerIds.length - 1) {
        const parsed = pitchEntries.map((entry) => ({
          playerId: entry.playerId,
          pitch: (JSON.parse(entry.valueJson) as { pitch: string }).pitch,
        }));
        for (let index = parsed.length - 1; index > 0; index -= 1) {
          const swap = Math.floor(Math.random() * (index + 1));
          [parsed[index], parsed[swap]] = [parsed[swap], parsed[index]];
        }
        try {
          await saveState(row, { ...state, phase: 'writers-judging', writersPitches: parsed });
        } catch (error) {
          if (!(error instanceof Error) || error.message !== 'ROUND_CHANGED') throw error;
        }
        row = await loadGame(actor.roomId);
      }
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'writers-pick') {
      const directorId = state.playerIds[state.writersDirectorIndex ?? 0];
      const pitchIndex = typeof body.value === 'number' ? body.value : Number(body.value);
      const pitches = state.writersPitches ?? [];
      if (state.phase !== 'writers-judging' || !Number.isInteger(pitchIndex) || pitchIndex < 0 || pitchIndex >= pitches.length) {
        return NextResponse.json({ error: 'Choose one of the pitches on the board.' }, { status: 400 });
      }
      if (actor.playerId !== directorId) return NextResponse.json({ error: 'Only the director can call the scene.' }, { status: 403 });
      const winner = pitches[pitchIndex];
      const scores = { ...state.scores, [winner.playerId]: (state.scores[winner.playerId] ?? 0) + 2 };
      await saveState(row, {
        ...state,
        phase: 'results',
        scores,
        result: { writersWinningPitch: winner.pitch, writersWinnerId: winner.playerId },
      });
      row = await loadGame(actor.roomId);
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'relay-draw' || body.action === 'relay-guess') {
      const drawingPhase = state.phase === 'relay-drawing';
      const guessingPhase = state.phase === 'relay-guessing';
      if ((body.action === 'relay-draw' && !drawingPhase) || (body.action === 'relay-guess' && !guessingPhase)) {
        return NextResponse.json({ error: 'That relay page has already moved on.' }, { status: 409 });
      }
      const kind = drawingPhase ? 'relay-draw' : 'relay-guess';
      const drawing = drawingPhase ? relayDrawing(body.value) : null;
      const guess = guessingPhase && typeof body.value === 'string' ? body.value.trim().replace(/\s+/g, ' ').slice(0, 100) : '';
      if (drawingPhase && !drawing) return NextResponse.json({ error: 'Add at least one clear line before passing the doodle.' }, { status: 400 });
      if (guessingPhase && guess.length < 2) return NextResponse.json({ error: 'Write your best guess before passing it on.' }, { status: 400 });
      const valueJson = drawingPhase ? JSON.stringify({ drawing }) : JSON.stringify({ guess });
      await saveSubmission(row, state.round, actor.playerId, kind, valueJson);
      const relayEntries = await submissions(row.id, state.round, kind);
      if (relayEntries.length >= state.playerIds.length) {
        const relayStep = state.relayStep ?? 0;
        const chains = (state.relayChains ?? []).map((chain) => ({ ...chain, entries: [...chain.entries] }));
        for (const entry of relayEntries) {
          const playerIndex = state.playerIds.indexOf(entry.playerId);
          const chainIndex = ((playerIndex - relayStep) % state.playerIds.length + state.playerIds.length) % state.playerIds.length;
          const submitted = JSON.parse(entry.valueJson) as { drawing?: RelayStroke[]; guess?: string };
          if (drawingPhase && submitted.drawing) chains[chainIndex].entries.push({ playerId: entry.playerId, kind: 'draw', value: submitted.drawing });
          if (guessingPhase && submitted.guess) chains[chainIndex].entries.push({ playerId: entry.playerId, kind: 'guess', value: submitted.guess });
        }
        const nextStep = relayStep + 1;
        const relayDone = nextStep >= (state.relayTotalSteps ?? Math.min(state.playerIds.length, 6));
        const next: GameState = {
          ...state,
          phase: relayDone ? 'relay-reveal' : nextStep % 2 === 0 ? 'relay-drawing' : 'relay-guessing',
          round: relayDone ? state.round : state.round + 1,
          relayStep: relayDone ? relayStep : nextStep,
          relayChains: chains,
          relayRevealIndex: relayDone ? 0 : state.relayRevealIndex,
        };
        try {
          await saveState(row, next);
        } catch (error) {
          if (!(error instanceof Error) || error.message !== 'ROUND_CHANGED') throw error;
        }
        row = await loadGame(actor.roomId);
      }
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'night-propose') {
      const leaderId = state.playerIds[state.nightLeaderIndex ?? 0];
      if (state.phase !== 'night-proposing') return NextResponse.json({ error: 'The station is not accepting a crew proposal now.' }, { status: 409 });
      if (actor.playerId !== leaderId) return NextResponse.json({ error: 'Only the current shift lead can propose this crew.' }, { status: 403 });
      const proposedIds = Array.isArray(body.value) ? body.value.filter((id): id is string => typeof id === 'string') : [];
      const required = nightTeamSize(state.playerIds.length, state.nightMissionIndex ?? 0);
      if (proposedIds.length !== required || new Set(proposedIds).size !== required || proposedIds.some((id) => !state.playerIds.includes(id))) {
        return NextResponse.json({ error: `Choose exactly ${required} different players for this mission.` }, { status: 400 });
      }
      const emergency = (state.nightProposalAttempt ?? 1) >= 3;
      await saveState(row, {
        ...state,
        phase: emergency ? 'night-mission' : 'night-voting',
        nightProposedIds: proposedIds,
        nightVotes: undefined,
      });
      row = await loadGame(actor.roomId);
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'night-vote') {
      const vote = body.value === 'approve' || body.value === 'reject' ? body.value : null;
      if (state.phase !== 'night-voting' || !vote) return NextResponse.json({ error: 'Choose approve or reject for the proposed crew.' }, { status: 400 });
      const voteKind = `night-vote-${state.nightProposalAttempt ?? 1}`;
      await saveSubmission(row, state.round, actor.playerId, voteKind, JSON.stringify({ vote }));
      const voteEntries = await submissions(row.id, state.round, voteKind);
      if (voteEntries.length >= state.playerIds.length) {
        const next = resolvedNightVote(state, voteEntries);
        try {
          await saveState(row, next);
        } catch (error) {
          if (!(error instanceof Error) || error.message !== 'ROUND_CHANGED') throw error;
        }
        row = await loadGame(actor.roomId);
      }
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'night-force-vote') {
      if (!actor.isHost || state.phase !== 'night-voting') return NextResponse.json({ error: 'Only the host can reveal the current crew vote.' }, { status: 403 });
      const voteKind = `night-vote-${state.nightProposalAttempt ?? 1}`;
      const voteEntries = await submissions(row.id, state.round, voteKind);
      if (voteEntries.length < Math.min(2, state.playerIds.length)) return NextResponse.json({ error: 'Wait for at least two votes.' }, { status: 409 });
      await saveState(row, resolvedNightVote(state, voteEntries));
      row = await loadGame(actor.roomId);
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'night-action') {
      const missionAction = body.value === 'stabilize' || body.value === 'jam' ? body.value : null;
      const teamIds = state.nightProposedIds ?? [];
      if (state.phase !== 'night-mission' || !missionAction) return NextResponse.json({ error: 'Choose a valid mission action.' }, { status: 400 });
      if (!teamIds.includes(actor.playerId)) return NextResponse.json({ error: 'Only the deployed crew submits a mission action.' }, { status: 403 });
      if (missionAction === 'jam' && state.nightRoles?.[actor.playerId] !== 'saboteur') return NextResponse.json({ error: 'Crew members can only stabilize the station.' }, { status: 403 });
      await saveSubmission(row, state.round, actor.playerId, 'night-action', JSON.stringify({ action: missionAction }));
      const actionEntries = await submissions(row.id, state.round, 'night-action');
      if (actionEntries.length >= teamIds.length) {
        const parsedActions = actionEntries.map((entry) => ({
          playerId: entry.playerId,
          action: (JSON.parse(entry.valueJson) as { action: NightAction }).action,
        }));
        const jamCount = parsedActions.filter((entry) => entry.action === 'jam').length;
        const missionIndex = state.nightMissionIndex ?? 0;
        const shielded = missionIndex === 3 && state.playerIds.length >= 7;
        const success = jamCount < (shielded ? 2 : 1);
        const audited = (missionIndex === 1 || missionIndex === 3) && parsedActions.length
          ? parsedActions[Math.floor(Math.random() * parsedActions.length)]
          : undefined;
        const crewWins = (state.nightCrewWins ?? 0) + (success ? 1 : 0);
        const saboteurWins = (state.nightSaboteurWins ?? 0) + (success ? 0 : 1);
        const winner = crewWins >= 3 ? 'crew' : saboteurWins >= 3 ? 'saboteur' : undefined;
        const next: GameState = {
          ...state,
          phase: 'night-debrief',
          nightCrewWins: crewWins,
          nightSaboteurWins: saboteurWins,
          nightHistory: [...(state.nightHistory ?? []), success],
          nightDebrief: { success, jamCount, teamIds, shielded, audit: audited },
          result: winner ? { nightWinner: winner } : undefined,
        };
        try {
          await saveState(row, next);
        } catch (error) {
          if (!(error instanceof Error) || error.message !== 'ROUND_CHANGED') throw error;
        }
        row = await loadGame(actor.roomId);
      }
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'complete') {
      if (state.phase !== 'missions') return NextResponse.json({ error: 'Missions are not active.' }, { status: 400 });
      const completed = body.value !== false;
      await saveSubmission(row, state.round, actor.playerId, 'complete', JSON.stringify({ completed }));
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'order') {
      if (state.phase !== 'lineup') return NextResponse.json({ error: 'The order submissions are closed.' }, { status: 409 });
      const order = validateHumanScaleOrder(body.value, state.playerIds);
      if (!order) return NextResponse.json({ error: 'Place every player in the line exactly once.' }, { status: 400 });
      await saveSubmission(row, state.round, actor.playerId, 'order', JSON.stringify({ order }));
      const entries = await submissions(row.id, state.round, 'order');
      if (entries.length === state.playerIds.length) {
        try { await saveState(row, await humanScaleResult(row, state)); }
        catch (error) { if (!(error instanceof Error) || error.message !== 'ROUND_CHANGED') throw error; }
      }
      return NextResponse.json(await gameView(actor, await loadGame(actor.roomId)));
    }

    if (body.action === 'charades-teams') {
      if (!actor.isHost) return NextResponse.json({ error: 'Only the host can change teams.' }, { status: 403 });
      if (state.slug !== 'charades' || state.phase !== 'charades-ready' || state.charadesActorIndex !== 0) return NextResponse.json({ error: 'Set teams before the first turn.' }, { status: 409 });
      const value = body.value as Record<string, string> | null;
      if (!value || typeof value !== 'object' || Array.isArray(value) || state.playerIds.some(id => !charadesTeamIds.includes(value[id] as typeof charadesTeamIds[number]))) return NextResponse.json({ error: 'Assign every player to a team.' }, { status: 400 });
      const teams = Object.fromEntries(state.playerIds.map(id => [id, value[id]]));
      const ids = charadesRoster(state.playerIds, teams);
      if (ids.length < 2 || ids.some(team => state.playerIds.filter(id => teams[id] === team).length < 2)) return NextResponse.json({ error: 'Each team needs at least two players.' }, { status: 400 });
      await saveState(row, { ...state, charadesTeams: teams, charadesTeamScores: Object.fromEntries(ids.map(id => [id, 0])) });
      return NextResponse.json(await gameView(actor, await loadGame(actor.roomId)));
    }
    if (body.action === 'charades-score') {
      if (!actor.isHost) return NextResponse.json({ error: 'Only the host can correct scores.' }, { status: 403 });
      const value = body.value as { team?: string; score?: number } | null;
      if (state.slug !== 'charades' || !value || typeof value.team !== 'string' || !(value.team in (state.charadesTeamScores ?? {})) || typeof value.score !== 'number' || !Number.isInteger(value.score) || value.score < 0 || value.score > 999) return NextResponse.json({ error: 'Choose a team score from 0 to 999.' }, { status: 400 });
      const teamScores = { ...state.charadesTeamScores, [value.team]: value.score };
      const next = { ...state, charadesTeamScores: teamScores, result: state.phase === 'results' ? { charadesWinner: charadesWinner(teamScores) } : state.result };
      await saveState(row, next);
      // Corrections to an already banked match must also update the night scoreboard.
      if (state.phase === 'results') {
        const outcome = completeOutcome(next);
        const players = (await roomPlayers(row.roomId)).filter(p => state.playerIds.includes(p.id));
        await getDatabase().prepare('UPDATE room_results SET outcome_json = ? WHERE id = ? AND EXISTS (SELECT 1 FROM game_sessions WHERE id = ? AND version = ?)').bind(JSON.stringify({ ...outcome, players }), `${row.id}:${state.seriesNumber ?? 0}`, row.id, row.version + 1).run();
      }
      return NextResponse.json(await gameView(actor, await loadGame(actor.roomId)));
    }

    if (body.action === 'charades-correct' || body.action === 'charades-pass') {
      const actorId = charadesActor(state.playerIds, state.charadesTeams ?? Object.fromEntries(state.playerIds.map((id, i) => [id, i % 2 ? 'red' : 'blue'])), state.charadesActorIndex ?? 0);
      if (state.phase !== 'charades-turn') return NextResponse.json({ error: 'That turn has already ended.' }, { status: 409 });
      if (actor.playerId !== actorId && state.charadesTeams?.[actor.playerId] === state.charadesTeams?.[actorId]) return NextResponse.json({ error: 'The actor or an opposing team controls the cards.' }, { status: 403 });
      const promptOrder = state.charadesPromptOrder ?? shuffledIndices(charadesPrompts.length);
      const promptCursor = (state.charadesPromptCursor ?? 0) + 1;
      const next = { ...state, charadesPromptOrder: promptOrder, charadesPromptCursor: promptCursor };
      if (body.action === 'charades-correct') {
        const team = state.charadesTeams?.[actorId] ?? 'blue';
        next.charadesTurnScore = (state.charadesTurnScore ?? 0) + 1;
        next.charadesTeamScores = { ...(state.charadesTeamScores ?? { blue: 0, red: 0 }) };
        next.charadesTeamScores[team] = (next.charadesTeamScores[team] ?? 0) + 1;
      }
      if (promptCursor >= promptOrder.length) { next.phase = 'charades-recap'; next.charadesTurnEndsAt = undefined; }
      await saveState(row, next);
      row = await loadGame(actor.roomId);
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'charades-finish') {
      const actorId = charadesActor(state.playerIds, state.charadesTeams ?? Object.fromEntries(state.playerIds.map((id, i) => [id, i % 2 ? 'red' : 'blue'])), state.charadesActorIndex ?? 0);
      if (state.phase !== 'charades-turn') return NextResponse.json(await gameView(actor, row));
      if (!actor.isHost && actor.playerId !== actorId && state.charadesTeams?.[actor.playerId] === state.charadesTeams?.[actorId]) return NextResponse.json({ error: 'Only the actor or host can end this turn.' }, { status: 403 });
      await saveState(row, charadesRecap(state));
      row = await loadGame(actor.roomId);
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'fishbowl-correct' || body.action === 'fishbowl-pass') {
      const actorId = teamActor(state.playerIds, state.fishbowlActorIndex ?? 0);
      if (state.phase !== 'fishbowl-turn') return NextResponse.json({ error: 'That turn has already ended.' }, { status: 409 });
      if (actor.playerId !== actorId) return NextResponse.json({ error: 'Only the clue-giver controls the bowl.' }, { status: 403 });
      const remaining = [...(state.fishbowlRemaining ?? [])];
      if (remaining.length === 0) return NextResponse.json({ error: 'The bowl is empty.' }, { status: 409 });
      let next: GameState = { ...state };
      if (body.action === 'fishbowl-pass') {
        remaining.push(remaining.shift()!);
        next = { ...state, fishbowlRemaining: remaining };
      } else {
        remaining.shift();
        const team = state.fishbowlTeams?.[actorId] ?? 'blue';
        const teamScores = { ...(state.fishbowlTeamScores ?? { blue: 0, red: 0 }) };
        teamScores[team] += 1;
        next = {
          ...state,
          phase: remaining.length === 0 ? 'fishbowl-round-recap' : 'fishbowl-turn',
          fishbowlRemaining: remaining,
          fishbowlTurnScore: (state.fishbowlTurnScore ?? 0) + 1,
          fishbowlTeamScores: teamScores,
          fishbowlTurnEndsAt: remaining.length === 0 ? undefined : state.fishbowlTurnEndsAt,
        };
      }
      await saveState(row, next);
      row = await loadGame(actor.roomId);
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'fishbowl-finish') {
      const actorId = teamActor(state.playerIds, state.fishbowlActorIndex ?? 0);
      if (state.phase !== 'fishbowl-turn') return NextResponse.json(await gameView(actor, row));
      if (!actor.isHost && actor.playerId !== actorId) return NextResponse.json({ error: 'Only the clue-giver or host can end this turn.' }, { status: 403 });
      await saveState(row, fishbowlTurnRecap(state));
      row = await loadGame(actor.roomId);
      return NextResponse.json(await gameView(actor, row));
    }

    if (body.action === 'identity-start') {
      const current = state.playerIds[state.identityCurrentIndex ?? 0];
      if (state.slug !== 'who-am-i' || state.phase !== 'identity-briefing') return NextResponse.json({ error: 'This turn is not ready.' }, { status: 409 });
      if (!actor.isHost && actor.playerId !== current) return NextResponse.json({ error: 'The current player or host starts the clock.' }, { status: 403 });
      await saveState(row, { ...state, phase: 'identity-playing', identityStartedAt: Date.now(), identityEndsAt: Date.now() + (state.settings?.turnSeconds ?? 120) * 1000 });
      return NextResponse.json(await gameView(actor, await loadGame(actor.roomId)));
    }
    if (['identity-guessed', 'identity-pass', 'identity-replace'].includes(body.action ?? '')) {
      const current = state.playerIds[state.identityCurrentIndex ?? 0];
      if (state.slug !== 'who-am-i' || !['identity-briefing', 'identity-playing'].includes(state.phase)) return NextResponse.json({ error: 'This turn has ended.' }, { status: 409 });
      if (actor.playerId === current) return NextResponse.json({ error: 'Another player must judge or replace your identity.' }, { status: 403 });
      if (body.action === 'identity-replace') {
        const available = await unseenCards(actor.roomId, state.slug, state);
        if (!available.length) throw new Error('DECK_EXHAUSTED');
        await saveState(row, { ...state, identityIndices: { ...state.identityIndices, [current]: available[0] } });
      } else {
        if (state.phase !== 'identity-playing') return NextResponse.json({ error: 'Start the timer first.' }, { status: 409 });
        await saveState(row, finishIdentity(state, body.action === 'identity-guessed'));
      }
      return NextResponse.json(await gameView(actor, await loadGame(actor.roomId)));
    }

    if (body.action === 'end') {
      if (!actor.isHost) return NextResponse.json({ error: 'Only the host can end the game.' }, { status: 403 });
      const bank = await resultStatement(row, state);
      const history = cardHistoryStatement(row.roomId, state, row.id, row.version);
      const ended = await getDatabase().batch([
        ...(history ? [history] : []),
        ...(bank ? [bank] : []),
        getDatabase().prepare('DELETE FROM game_sessions WHERE id = ? AND version = ?').bind(row.id, row.version),
      ]);
      if (!ended[ended.length - 1].meta.changes) throw new Error('ROUND_CHANGED');
      return NextResponse.json({ active: false });
    }

    if (body.action === 'advance') {
      if (!actor.isHost) return NextResponse.json({ error: 'Only the host can move the round on.' }, { status: 403 });
      const definition = getGame(state.slug);
      if (!definition) return NextResponse.json({ error: 'Unknown game.' }, { status: 400 });
      let next = { ...state };
      if (state.phase === 'advocate-ready') {
        next = { ...state, phase: 'advocate-defense', advocateEndsAt: Date.now() + (state.settings?.defenseSeconds ?? 60) * 1000 };
      } else if (state.phase === 'advocate-defense' || state.phase === 'advocate-challenge') {
        return NextResponse.json({ error: 'The timed phase is still running. Use the host override to finish early.' }, { status: 409 });
      } else if (state.phase === 'advocate-rating') {
        const ratings = await submissions(row.id, state.round, 'advocate-rating');
        if (!recovering && ratings.length !== state.playerIds.length - 1) return NextResponse.json({ error: 'Wait for everyone else to rate the defense.' }, { status: 409 });
        next = finishAdvocateTurn(state, ratings);
      } else if (state.phase === 'advocate-final') {
        const players = (await roomPlayers(actor.roomId)).filter(player => state.playerIds.includes(player.id));
        next = await newRound(row.roomId, state.slug, players, 1, state.scores, state);
      } else if (state.phase === 'night-role') {
        next = { ...state, phase: 'night-proposing' };
      } else if (state.phase === 'night-debrief') {
        if (state.result?.nightWinner) {
          next = { ...state, phase: 'night-final' };
        } else {
          next = {
            ...state,
            phase: 'night-proposing',
            round: state.round + 1,
            nightMissionIndex: (state.nightMissionIndex ?? 0) + 1,
            nightLeaderIndex: ((state.nightLeaderIndex ?? 0) + 1) % state.playerIds.length,
            nightProposalAttempt: 1,
            nightProposedIds: undefined,
            nightVotes: undefined,
            nightLastVote: undefined,
            nightDebrief: undefined,
            result: undefined,
          };
        }
      } else if (state.phase === 'night-final') {
        const players = (await roomPlayers(actor.roomId)).filter((player) => state.playerIds.includes(player.id));
        next = await newRound(row.roomId, state.slug, players, 1, Object.fromEntries(players.map((player) => [player.id, 0])), state);
      } else if (state.phase === 'night-proposing' || state.phase === 'night-voting' || state.phase === 'night-mission') {
        return NextResponse.json({ error: 'Night Shift advances after the current player decisions are complete.' }, { status: 409 });
      } else if (state.phase === 'identity-briefing') {
        next = { ...state, phase: 'identity-playing', identityStartedAt: Date.now(), identityEndsAt: Date.now() + (state.settings?.turnSeconds ?? 120) * 1000 };
      } else if (state.phase === 'truths-discussion') {
        next = { ...state, phase: 'truths-vote' };
      } else if (state.phase === 'truths-vote') {
        const storytellerId = state.playerIds[state.truthStorytellerIndex ?? 0];
        const truthVotes = await submissions(row.id, state.round, 'truth-vote');
        if (!recovering && truthVotes.length < Math.min(2, state.playerIds.length - 1)) return NextResponse.json({ error: 'Wait for at least two accusations.' }, { status: 409 });
        const truthTally = [0, 0, 0];
        const scores = { ...state.scores };
        let fooledCount = 0;
        truthVotes.forEach((entry) => {
          const voteIndex = (JSON.parse(entry.valueJson) as { voteIndex: number }).voteIndex;
          truthTally[voteIndex] += 1;
          if (voteIndex === state.truthLieIndex) scores[entry.playerId] = (scores[entry.playerId] ?? 0) + 1;
          else fooledCount += 1;
        });
        scores[storytellerId] = (scores[storytellerId] ?? 0) + fooledCount;
        next = { ...state, phase: 'results', scores, result: { truthTally, truthLieIndex: state.truthLieIndex, fooledCount } };
      } else if (state.phase === 'categories-ready') {
        next = { ...state, phase: 'categories-answering', categoriesEndsAt: Date.now() + (state.settings?.turnSeconds ?? 90) * 1000 };
      } else if (state.phase === 'categories-answering') {
        const categoryEntries = await submissions(row.id, state.round, 'categories');
        if (!recovering && categoryEntries.length < state.playerIds.length) return NextResponse.json({ error: `Waiting for ${state.playerIds.length - categoryEntries.length} more answer sheets.` }, { status: 409 });
        next = await categoriesResult(row, state);
      } else if (state.phase === 'fishbowl-setup') {
        const promptEntries = await submissions(row.id, state.round, 'fishbowl-prompt');
        if (!recovering && promptEntries.length < state.playerIds.length) return NextResponse.json({ error: `The bowl needs all ${state.playerIds.length} players’ prompts.` }, { status: 409 });
        let fishbowlPrompts = promptEntries.flatMap((entry) => (JSON.parse(entry.valueJson) as { prompts: string[] }).prompts);
        if (!fishbowlPrompts.length && recovering) fishbowlPrompts = shuffledIndices(charadesPrompts.length).slice(0, 12).map(index => translateCopy(charadesPrompts[index].prompt, 'pt-PT'));
        next = { ...state, phase: 'fishbowl-ready', fishbowlPrompts, fishbowlRemaining: shuffledIndices(fishbowlPrompts.length) };
      } else if (state.phase === 'fishbowl-ready') {
        next = { ...state, phase: 'fishbowl-turn', fishbowlTurnScore: 0, fishbowlTurnEndsAt: Date.now() + (state.settings?.turnSeconds ?? 45) * 1000 };
      } else if (state.phase === 'fishbowl-turn-recap') {
        next = { ...state, phase: 'fishbowl-ready', fishbowlActorIndex: (state.fishbowlActorIndex ?? 0) + 1, fishbowlTurnScore: 0, fishbowlTurnEndsAt: undefined };
      } else if (state.phase === 'fishbowl-round-recap') {
        const roundMode = state.fishbowlRoundMode ?? 0;
        if (roundMode >= 2) {
          const teamScores = state.fishbowlTeamScores ?? { blue: 0, red: 0 };
          const fishbowlWinner = teamScores.blue === teamScores.red ? 'tie' : teamScores.blue > teamScores.red ? 'blue' : 'red';
          next = { ...state, phase: 'results', result: { fishbowlWinner } };
        } else {
          next = {
            ...state,
            phase: 'fishbowl-ready',
            round: state.round + 1,
            fishbowlRoundMode: (roundMode + 1) as 1 | 2,
            fishbowlRemaining: shuffledIndices(state.fishbowlPrompts?.length ?? 0),
            fishbowlActorIndex: (state.fishbowlActorIndex ?? 0) + 1,
            fishbowlTurnScore: 0,
            fishbowlTurnEndsAt: undefined,
          };
        }
      } else if (state.phase === 'charades-ready') {
        if ((state.charadesPromptCursor ?? 0) >= (state.charadesPromptOrder?.length ?? 0)) throw new Error('DECK_EXHAUSTED');
        next = { ...state, phase: 'charades-turn', charadesTurnScore: 0, charadesTurnEndsAt: Date.now() + (state.settings?.turnSeconds ?? 60) * 1000 };
      } else if (state.phase === 'charades-recap') {
        const nextActorIndex = (state.charadesActorIndex ?? 0) + 1;
        if (nextActorIndex >= charadesTurns(state.playerIds, state.charadesTeams ?? {}) || (state.charadesPromptCursor ?? 0) >= (state.charadesPromptOrder?.length ?? 0)) {
          const teamScores = state.charadesTeamScores ?? { blue: 0, red: 0 };
          next = { ...state, phase: 'results', result: { charadesWinner: charadesWinner(teamScores) } };
        } else {
          next = { ...state, phase: 'charades-ready', round: state.round + 1, charadesActorIndex: nextActorIndex, charadesTurnScore: 0, charadesTurnEndsAt: undefined };
        }
      } else if (state.phase === 'briefing') {
        next.phase = definition.mode === 'lineup' ? 'lineup' : state.slug === 'head-fake' ? 'performance' : 'vote';
        if (state.slug === 'head-fake') next.performanceEndsAt = Date.now() + (state.settings?.turnSeconds ?? 20) * 1000;
        next.briefingEndsAt = undefined;
      } else if (state.phase === 'vote') {
        const votes = await submissions(row.id, state.round, 'vote');
        if (!recovering && !['alibi-club', 'house-rule', 'head-fake'].includes(state.slug) && votes.length < Math.min(2, state.playerIds.length)) return NextResponse.json({ error: 'Wait for at least two votes.' }, { status: 409 });
        next = outsiderResult(state, votes);
      } else if (state.phase === 'answering') {
        const answers = await submissions(row.id, state.round, 'answer');
        if (!recovering && answers.length < Math.min(2, state.playerIds.length)) return NextResponse.json({ error: 'Wait for at least two answers.' }, { status: 409 });
        const grouped = new Map<string, { answer: string; playerIds: string[] }>();
        for (const entry of answers) {
          const answer = (JSON.parse(entry.valueJson) as { answer: string }).answer;
          const key = normalizeAnswer(answer);
          const group = grouped.get(key) ?? { answer, playerIds: [] };
          group.playerIds.push(entry.playerId);
          grouped.set(key, group);
        }
        const answerGroups = [...grouped.values()].sort((a, b) => b.playerIds.length - a.playerIds.length);
        const winningSize = answerGroups[0]?.playerIds.length ?? 0;
        const winnerIds = winningSize > 1 ? answerGroups.filter((group) => group.playerIds.length === winningSize).flatMap((group) => group.playerIds) : [];
        const scores = { ...state.scores };
        winnerIds.forEach((id) => { scores[id] = (scores[id] ?? 0) + 1; });
        next = { ...state, phase: 'results', scores, result: { answerGroups, winnerIds } };
      } else if (state.phase === 'missions') {
        const completionEntries = await submissions(row.id, state.round, 'complete');
        const completedIds = new Set(completionEntries.filter((entry) => (JSON.parse(entry.valueJson) as { completed: boolean }).completed).map((entry) => entry.playerId));
        const scores = { ...state.scores };
        completedIds.forEach((id) => { scores[id] = (scores[id] ?? 0) + 2; });
        const missionResults = state.playerIds.map((playerId) => {
          const mission = settlerMissions[state.missionIndices?.[playerId] ?? 0];
          return { playerId, mission: mission.mission, title: mission.title, completed: completedIds.has(playerId) };
        });
        next = { ...state, phase: 'results', scores, result: { missionResults } };
      } else if (state.phase === 'results' && definition.mode === 'charades') {
        const players = (await roomPlayers(actor.roomId)).filter((player) => state.playerIds.includes(player.id));
        next = await newRound(row.roomId, state.slug, players, 1, state.scores, state);
      } else if (state.phase === 'results' && definition.mode === 'fishbowl') {
        const players = (await roomPlayers(actor.roomId)).filter((player) => state.playerIds.includes(player.id));
        next = await newRound(row.roomId, state.slug, players, 1, state.scores, state);
      } else if (state.phase === 'results' && definition.mode === 'identity') {
        const players = (await roomPlayers(actor.roomId)).filter((player) => state.playerIds.includes(player.id));
        next = await newRound(row.roomId, state.slug, players, state.round + 1, state.scores, state);
      } else if (state.phase === 'results' && definition.mode === 'categories') {
        const players = (await roomPlayers(actor.roomId)).filter((player) => state.playerIds.includes(player.id));
        next = await newRound(row.roomId, state.slug, players, state.round + 1, state.scores, state);
      } else if (state.phase === 'results' && definition.mode === 'truths') {
        const nextStorytellerIndex = (state.truthStorytellerIndex ?? 0) + 1;
        next = nextStorytellerIndex >= state.playerIds.length
          ? { ...state, phase: 'truths-final', result: undefined }
          : { ...state, phase: 'truths-writing', round: state.round + 1, truthStorytellerIndex: nextStorytellerIndex, truthStatements: undefined, truthLieIndex: undefined, result: undefined };
      } else if (state.phase === 'truths-final') {
        const players = (await roomPlayers(actor.roomId)).filter((player) => state.playerIds.includes(player.id));
        next = await newRound(row.roomId, state.slug, players, 1, state.scores, state);
      } else if (state.phase === 'results' && definition.mode === 'signal') {
        const nextReceiverIndex = (state.signalReceiverIndex ?? 0) + 1;
        next = nextReceiverIndex >= state.playerIds.length
          ? { ...state, phase: 'signal-final', result: undefined }
          : {
            ...state,
            phase: 'signal-clue',
            round: state.round + 1,
            signalReceiverIndex: nextReceiverIndex,
            signalClues: undefined,
            signalGuess: undefined,
            result: undefined,
          };
      } else if (state.phase === 'signal-final') {
        const players = (await roomPlayers(actor.roomId)).filter((player) => state.playerIds.includes(player.id));
        next = await newRound(row.roomId, state.slug, players, 1, state.scores, state);
      } else if (state.phase === 'signal-clue' || state.phase === 'signal-guess') {
        return NextResponse.json({ error: 'Signal Lost advances automatically when everyone submits.' }, { status: 409 });
      } else if (state.phase === 'results' && definition.mode === 'writers') {
        const nextDirectorIndex = (state.writersDirectorIndex ?? 0) + 1;
        next = nextDirectorIndex >= state.playerIds.length
          ? { ...state, phase: 'writers-final', result: undefined }
          : {
            ...state,
            phase: 'writers-writing',
            round: state.round + 1,
            writersDirectorIndex: nextDirectorIndex,
            writersPitches: undefined,
            result: undefined,
          };
      } else if (state.phase === 'writers-final') {
        const players = (await roomPlayers(actor.roomId)).filter((player) => state.playerIds.includes(player.id));
        next = await newRound(row.roomId, state.slug, players, 1, state.scores, state);
      } else if (state.phase === 'writers-writing' || state.phase === 'writers-judging') {
        return NextResponse.json({ error: 'Writer’s Room advances automatically after every pitch and the director’s pick.' }, { status: 409 });
      } else if (state.phase === 'relay-reveal') {
        const nextRevealIndex = (state.relayRevealIndex ?? 0) + 1;
        next = nextRevealIndex >= (state.relayChains?.length ?? state.playerIds.length)
          ? { ...state, phase: 'relay-final' }
          : { ...state, relayRevealIndex: nextRevealIndex };
      } else if (state.phase === 'relay-final') {
        const players = (await roomPlayers(actor.roomId)).filter((player) => state.playerIds.includes(player.id));
        next = await newRound(row.roomId, state.slug, players, 1, state.scores, state);
      } else if (state.phase === 'relay-drawing' || state.phase === 'relay-guessing') {
        return NextResponse.json({ error: 'Doodle Relay advances automatically when every phone passes its page.' }, { status: 409 });
      } else {
        const players = (await roomPlayers(actor.roomId)).filter((player) => state.playerIds.includes(player.id));
        next = await newRound(row.roomId, state.slug, players, state.round + 1, state.scores, state);
      }
      await saveState(row, next);
      row = await loadGame(actor.roomId);
      return NextResponse.json(await gameView(actor, row));
    }

    return NextResponse.json({ error: 'Unknown game action.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'DECK_EXHAUSTED') return NextResponse.json({ error: 'No unseen cards remain for a full round in this room. Choose another game or create a new room.' }, { status: 409 });
    if (message === 'ROUND_CHANGED') return NextResponse.json({ error: 'The round moved on. Refreshing…' }, { status: 409 });
    console.error('game action failed', error);
    return NextResponse.json({ error: 'The game hit a snag. Try that once more.' }, { status: 500 });
  }
}
