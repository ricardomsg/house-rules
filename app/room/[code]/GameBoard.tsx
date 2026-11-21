'use client';

import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';

import { useGameDraft } from '@/lib/hooks/use-game-draft';
import { type RelayStroke, RELAY_MAX_POINTS, relayPointCount, relayHasRoom } from '@/lib/relay-drawing';
import GameHelp from './GameHelp';
import IdentityBoard from './IdentityBoard';
import HumanScaleBoard from './HumanScaleBoard';
import CharadesBoard from './CharadesBoard';
import GameRecovery from './GameRecovery';
import type { RecoveryOption } from '@/lib/game-recovery';
import DevilsAdvocateBoard from './DevilsAdvocateBoard';
import RoomScoreboard, { NightResult } from './RoomScoreboard';
import type { NightOutcome, RoomStandings } from '@/lib/room-standings';
import HostControls from './HostControls';
import { useLanguage } from '@/app/LanguageProvider';

export type GamePlayer = { id: string; name: string; avatarColor: string; isHost: boolean; score: number };
type RelayEntry = { playerId: string; kind: 'draw'; value: RelayStroke[] } | { playerId: string; kind: 'guess'; value: string };
export type GameView = {
  active: boolean;
  watching?: boolean;
  gameId?: string;
  version?: number;
  recovery?: RecoveryOption;
  waitingFor?: string[];
  nightOutcome?: NightOutcome | null;
  nightOutcomeSaved?: boolean;
  game?: { slug: string; title: string; eyebrow: string; description: string; color: string; mode: 'outsider' | 'answers' | 'missions' | 'lineup' | 'charades' | 'fishbowl' | 'identity' | 'categories' | 'truths' | 'signal' | 'writers' | 'relay' | 'night' | 'advocate' };
  phase?: 'advocate-ready' | 'advocate-challenge' | 'advocate-defense' | 'advocate-rating' | 'advocate-final' | 'briefing' | 'performance' | 'vote' | 'answering' | 'missions' | 'lineup' | 'charades-ready' | 'charades-turn' | 'charades-recap' | 'fishbowl-setup' | 'fishbowl-ready' | 'fishbowl-turn' | 'fishbowl-turn-recap' | 'fishbowl-round-recap' | 'identity-briefing' | 'identity-playing' | 'categories-ready' | 'categories-answering' | 'truths-writing' | 'truths-discussion' | 'truths-vote' | 'truths-final' | 'signal-clue' | 'signal-guess' | 'signal-final' | 'writers-writing' | 'writers-judging' | 'writers-final' | 'relay-drawing' | 'relay-guessing' | 'relay-reveal' | 'relay-final' | 'night-role' | 'night-proposing' | 'night-voting' | 'night-mission' | 'night-debrief' | 'night-final' | 'results';
  briefingEndsAt?: number;
  defenseSeconds?: number;
  challengeSeconds?: number;
  advocateStatement?: string;
  ownRating?: number;
  advocateResults?: Array<{ playerId: string; statement: string; average: number; ratingCount?: number; rank: number; winner: boolean; loser: boolean }>;
  round?: number;
  isHost?: boolean;
  playerId?: string;
  players?: GamePlayer[];
  submittedCount?: number;
  expectedCount?: number;
  hasSubmitted?: boolean;
  ownVoteTargetId?: string;
  voteStatus?: Array<{ playerId: string; voted: boolean }>;
  cardTitle?: string;
  privatePrompt?: string;
  instruction?: string;
  note?: string;
  question?: string;
  ownAnswer?: string | null;
  mission?: { title: string; mission: string; note: string };
  scale?: { left: string; right: string; topic: string };
  targetPosition?: number;
  positionCount?: number;
  actorId?: string;
  actorName?: string;
  actorTeam?: string;
  ownTeam?: string;
  teams?: Record<string, string[]>;
  teamScores?: Record<string, number>;
  turnScore?: number;
  turnEndsAt?: number;
  turnSeconds?: number;
  canControlPrompt?: boolean;
  canEditTeams?: boolean;
  deckExhausted?: boolean;
  ownOrder?: string[];
  submissionStatus?: Array<{ playerId: string; submitted: boolean }>;
  identityResults?: Array<{ playerId: string; elapsedMs: number; solved: boolean }>;
  prompt?: { prompt: string; category: string; difficulty: string };
  roundTitle?: string;
  roundRule?: string;
  roundMode?: number;
  ownPrompts?: string[] | null;
  bowlSize?: number;
  remainingCount?: number;
  fishbowlPrompt?: string;
  currentPlayerId?: string;
  currentPlayerName?: string;
  ownSolved?: boolean;
  identitySolved?: Record<string, boolean>;
  questionCounts?: Record<string, number>;
  identities?: Array<{ playerId: string; name: string; category: string; solved: boolean }>;
  lastEvent?: { playerId: string; kind: 'yes' | 'no' | 'not-sure' | 'correct' | 'wrong' };
  letter?: string;
  categories?: string[];
  categoriesEndsAt?: number;
  ownCategoryAnswers?: string[] | null;
  storytellerId?: string;
  storytellerName?: string;
  isStoryteller?: boolean;
  storyNumber?: number;
  storyTotal?: number;
  truthStatements?: string[];
  receiverId?: string;
  receiverName?: string;
  isReceiver?: boolean;
  signalTurnNumber?: number;
  signalTurnTotal?: number;
  signalTarget?: string;
  signalCategory?: string;
  signalBlocked?: readonly [string, string];
  ownSignalClue?: string | null;
  signalClues?: Array<{ playerId: string; clue: string; cancelled: boolean }>;
  signalCancelledCount?: number;
  signalCorrectCount?: number;
  directorId?: string;
  directorName?: string;
  isDirector?: boolean;
  writersTurnNumber?: number;
  writersTurnTotal?: number;
  writersPrompt?: { genre: string; setup: string; direction: string };
  ownWritersPitch?: string | null;
  writersPitches?: Array<{ playerId: string; pitch: string }>;
  relayStepNumber?: number;
  relayStepTotal?: number;
  relaySourceText?: string;
  relaySourceDrawing?: RelayStroke[];
  ownRelayDrawing?: RelayStroke[];
  ownRelayGuess?: string;
  relayRevealNumber?: number;
  relayRevealTotal?: number;
  relayRevealChain?: { prompt: string; entries: RelayEntry[] };
  relaySummaries?: Array<{ prompt: string; finalGuess?: string }>;
  nightRole?: 'crew' | 'saboteur';
  nightSaboteurIds?: string[];
  nightLeaderId?: string;
  nightLeaderName?: string;
  nightIsLeader?: boolean;
  nightMissionNumber?: number;
  nightMissionTotal?: number;
  nightTeamSize?: number;
  nightProposalAttempt?: number;
  nightEmergencyDispatch?: boolean;
  nightProposedIds?: string[];
  nightIsSelected?: boolean;
  nightOwnVote?: 'approve' | 'reject';
  nightOwnAction?: 'stabilize' | 'jam';
  nightVotes?: Array<{ playerId: string; vote: 'approve' | 'reject' }>;
  nightLastVote?: { approve: number; reject: number };
  nightCrewWins?: number;
  nightSaboteurWins?: number;
  nightHistory?: boolean[];
  nightDebrief?: { success: boolean; jamCount: number; teamIds: string[]; shielded: boolean; audit?: { playerId: string; action: 'stabilize' | 'jam' } };
  nightRoleReveal?: Array<{ playerId: string; role: 'crew' | 'saboteur' }>;
  result?: {
    outsiderId?: string;
    caught?: boolean;
    tally?: Record<string, number>;
    regularPrompt?: string;
    outsiderPrompt?: string;
    answerGroups?: Array<{ answer: string; playerIds: string[] }>;
    winnerIds?: string[];
    missionResults?: Array<{ playerId: string; mission: string; title: string; completed: boolean }>;
    lineupResults?: Array<{playerId: string; order: string[]; correctPairs: number; totalPairs: number}>;
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

function paintRelay(canvas: HTMLCanvasElement, drawing: RelayStroke[]) {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.fillStyle = '#fffdf6';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const scale = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
  drawing.forEach((stroke) => {
    if (!stroke.points.length) return;
    context.beginPath();
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;
    context.lineWidth = stroke.width * scale;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.moveTo(stroke.points[0][0] * canvas.width, stroke.points[0][1] * canvas.height);
    stroke.points.slice(1).forEach(([x, y]) => context.lineTo(x * canvas.width, y * canvas.height));
    context.stroke();
  });
}

function RelayPreview({ drawing, label }: { drawing: RelayStroke[]; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      paintRelay(canvas, drawing);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [drawing]);
  return <canvas className="relay-preview" ref={canvasRef} role="img" aria-label={label} />;
}

function RelayCanvas({ value, onChange }: { value: RelayStroke[]; onChange: (drawing: RelayStroke[]) => void }) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStroke = useRef<{ stroke: RelayStroke; previous: RelayStroke[]; pointerId: number } | null>(null);
  const [color, setColor] = useState('#172019');
  const [width, setWidth] = useState(8);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      paintRelay(canvas, value);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [value]);

  const pointFor = (event: ReactPointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))];
  };
  const begin = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activeStroke.current || !relayHasRoom(value)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const [x, y] = pointFor(event);
    const stroke: RelayStroke = { color, width, points: [[x, y], [Math.min(1, x + .001), y]] };
    activeStroke.current = { stroke, previous: value, pointerId: event.pointerId };
    // Persist as it is drawn: even a reload mid-stroke keeps the visible page.
    onChange([...value, stroke]);
  };
  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = activeStroke.current;
    if (!active || event.pointerId !== active.pointerId) return;
    const { stroke, previous: drawing } = active;
    if (relayPointCount(drawing) + stroke.points.length >= RELAY_MAX_POINTS) return;
    const point = pointFor(event);
    const previous = stroke.points.at(-1)!;
    if (Math.hypot(point[0] - previous[0], point[1] - previous[1]) < .004) return;
    const next = { ...stroke, points: [...stroke.points, point] };
    activeStroke.current = { ...active, stroke: next };
    onChange([...drawing, next]);
  };
  const finish = (event: ReactPointerEvent<HTMLCanvasElement>) => { if (activeStroke.current?.pointerId === event.pointerId) activeStroke.current = null; };

  const colors = ['#172019', '#e54b3d', '#4767d8', '#4c9a5d', '#efb92e'];
  return <div className="relay-canvas-wrap">
    <canvas ref={canvasRef} aria-label={t("Your drawing canvas")} onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} />
    {!relayHasRoom(value) && <p className="relay-limit" role="status">{t('Drawing limit reached. Your drawing is saved. Undo a stroke to add more, or pass this page.')}</p>}
    <div className="relay-tools"><div className="relay-colors">{colors.map((swatch) => <button aria-label={t('Use {color} ink', { color: swatch })} className={swatch === color ? 'selected' : ''} style={{ background: swatch }} type="button" onClick={() => setColor(swatch)} key={swatch} />)}</div><div className="relay-widths">{[4, 8, 14].map((size) => <button aria-label={t('Use {size}px brush', { size })} className={size === width ? 'selected' : ''} type="button" onClick={() => setWidth(size)} key={size}><i style={{ width: size, height: size }} /></button>)}</div><button className="relay-tool-text" type="button" disabled={!value.length} onClick={() => { activeStroke.current = null; onChange(value.slice(0, -1)); }}>{t("UNDO")}</button><button className="relay-tool-text" type="button" disabled={!value.length} onClick={() => { activeStroke.current = null; onChange([]); }}>{t("CLEAR")}</button></div>
  </div>;
}

type Props = {
  scoreboard?: RoomStandings;
  code: string;
  view: GameView;
  error: string;
  acting: boolean;
  sendAction: (action: string, payload?: Record<string, unknown>) => Promise<boolean>;
};

export default function GameBoard({ code, view, error, acting, sendAction, scoreboard }: Props) {
  const { t } = useLanguage();
  const draftOwner = `${code}:${view.playerId}`;
  const draftScope = `${view.gameId}:${view.round}:${view.phase}:${view.currentPlayerId ?? ''}:${view.nightProposalAttempt ?? ''}:${view.nightLeaderId ?? ''}`;
  const [briefVisible, setBriefVisible] = useState(false);
  const [answer, setAnswer] = useGameDraft(draftOwner, draftScope, 'answer', '');
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [bowlPrompts, setBowlPrompts] = useGameDraft(draftOwner, draftScope, 'bowlPrompts', ['', '']);
  const [categoryAnswers, setCategoryAnswers] = useGameDraft(draftOwner, draftScope, 'categoryAnswers', ['', '', '', '', '']);
  const [truthStatements, setTruthStatements] = useGameDraft(draftOwner, draftScope, 'truthStatements', ['', '', '']);
  const [truthLieIndex, setTruthLieIndex] = useGameDraft<number | null>(draftOwner, draftScope, 'truthLieIndex', null);
  const [signalClueDraft, setSignalClueDraft] = useGameDraft(draftOwner, draftScope, 'signalClueDraft', { round: 0, value: '' });
  const [signalGuessDraft, setSignalGuessDraft] = useGameDraft(draftOwner, draftScope, 'signalGuessDraft', { round: 0, value: '' });
  const [writersPitchDraft, setWritersPitchDraft] = useGameDraft(draftOwner, draftScope, 'writersPitchDraft', { round: 0, value: '' });
  const [relayDrawingDraft, setRelayDrawingDraft] = useGameDraft<{ round: number; value: RelayStroke[] }>(draftOwner, draftScope, 'relayDrawingDraft', { round: 0, value: [] });
  const [relayGuessDraft, setRelayGuessDraft] = useGameDraft(draftOwner, draftScope, 'relayGuessDraft', { round: 0, value: '' });
  const [nightRoleVisible, setNightRoleVisible] = useState(false);
  const earlyRevealDialog = useRef<HTMLDialogElement>(null);
  const [earlyRevealAction, setEarlyRevealAction] = useState<'advance' | 'night-force-vote' | null>(null);
  const [nightTeamDraft, setNightTeamDraft] = useGameDraft<{ key: string; value: string[] }>(draftOwner, draftScope, 'nightTeamDraft', { key: '', value: [] });
  const players = useMemo(() => view.players ?? [], [view.players]);
  const playerName = (id?: string) => players.find((player) => player.id === id)?.name ?? t('Unknown player');
  const remainingSeconds = Math.max(0, Math.ceil(((view.briefingEndsAt ?? view.turnEndsAt ?? view.categoriesEndsAt ?? clockNow) - clockNow) / 1000));
  const signalClue = signalClueDraft.round === view.round ? signalClueDraft.value : '';
  const signalGuess = signalGuessDraft.round === view.round ? signalGuessDraft.value : '';
  const writersPitch = writersPitchDraft.round === view.round ? writersPitchDraft.value : '';
  const relayDrawing = relayDrawingDraft.round === view.round ? relayDrawingDraft.value : [];
  const relayGuess = relayGuessDraft.round === view.round ? relayGuessDraft.value : '';
  const nightTeamKey = `${view.round ?? 0}:${view.nightProposalAttempt ?? 0}:${view.nightLeaderId ?? ''}`;
  const nightTeam = nightTeamDraft.key === nightTeamKey ? nightTeamDraft.value : [];

  useEffect(() => {
    const scrollToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    let secondFrame: number | undefined;
    const firstFrame = window.requestAnimationFrame(() => {
      scrollToTop();
      secondFrame = window.requestAnimationFrame(scrollToTop);
    });
    const settleTimer = window.setTimeout(scrollToTop, 150);
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
    };
  }, [view.phase, view.round]);

  useEffect(() => {
    if (view.phase !== 'charades-turn' && view.phase !== 'fishbowl-turn' && view.phase !== 'categories-answering' && view.phase !== 'advocate-defense' && view.phase !== 'advocate-challenge' && view.phase !== 'identity-playing' && view.phase !== 'performance' && !view.briefingEndsAt) return;
    const timer = window.setInterval(() => setClockNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [view.phase, view.briefingEndsAt]);

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (answer.trim()) void sendAction('answer', { value: answer });
  }

  function submitBowl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (bowlPrompts.every((prompt) => prompt.trim())) void sendAction('fishbowl-prompts', { value: bowlPrompts });
  }

  function submitCategories(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendAction('categories-submit', { value: categoryAnswers });
  }

  function submitTruths(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (truthLieIndex !== null && truthStatements.every((statement) => statement.trim())) {
      void sendAction('truths-submit', { value: truthStatements, targetId: truthLieIndex });
    }
  }

  function submitSignalClue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signalClue.trim()) void sendAction('signal-clue', { value: signalClue });
  }

  function submitSignalGuess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signalGuess.trim()) void sendAction('signal-guess', { value: signalGuess });
  }

  function submitWritersPitch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writersPitch.trim()) void sendAction('writers-pitch', { value: writersPitch });
  }

  function submitRelayDrawing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (relayDrawing.length) void sendAction('relay-draw', { value: relayDrawing });
  }

  function submitRelayGuess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (relayGuess.trim()) void sendAction('relay-guess', { value: relayGuess });
  }

  useEffect(() => { if (earlyRevealAction) earlyRevealDialog.current?.showModal(); else earlyRevealDialog.current?.close(); }, [earlyRevealAction]);

  const readyToReveal = (view.submittedCount ?? 0) >= Math.min(2, view.expectedCount ?? 2);
  const missingVotes = Math.max(0, (view.expectedCount ?? players.length) - (view.submittedCount ?? 0));
  const tableHighScore = Math.max(0, ...players.map((player) => player.score));

  function requestVoteReveal(action: 'advance' | 'night-force-vote') {
    if (missingVotes > 0) setEarlyRevealAction(action);
    else void sendAction(action);
  }

  function confirmEarlyReveal() {
    if (!earlyRevealAction) return;
    const action = earlyRevealAction;
    setEarlyRevealAction(null);
    void sendAction(action);
  }

  return (
    <main data-i18n-managed="true" className={`play-shell play-${view.game?.color ?? 'blue'}`}>
      <header className="play-nav">
        <a className="wordmark" href="/"><span className="logo-mark" aria-hidden="true"><i /><i /><i /></span> {t(" HOUSE RULES")}</a>
        <div><span>{t("ROOM ")}{code}</span>{view.game && <GameHelp slug={view.game.slug} />}</div>
      </header>


      <a className="skip-to-game" href="#current-game">{t("Go to the game ↓")}</a>



      <section className="play-heading">
        <div><p>{view.game?.eyebrow}</p><h1>{view.game?.title}</h1></div>
        <div className="round-stamp"><small>{t("ROUND")}</small><strong>{String(view.round ?? 1).padStart(2, '0')}</strong></div>
      </section>

      <section className="play-stage" id="current-game">
        {view.game?.mode === 'identity' && <IdentityBoard view={view} remainingSeconds={remainingSeconds} acting={acting} sendAction={sendAction} />}
        {view.game?.mode === 'lineup' && <HumanScaleBoard code={code} view={view} acting={acting} sendAction={sendAction} />}
        {view.game?.mode === 'charades' && <CharadesBoard view={view} remainingSeconds={remainingSeconds} acting={acting} sendAction={sendAction} />}
        {view.game?.mode === 'advocate' && <DevilsAdvocateBoard view={view} remainingSeconds={remainingSeconds} acting={acting} sendAction={sendAction} />}
        {view.phase === 'night-role' && (
          <div className="night-role-stage">
            <section className={`night-role-card ${view.nightRole === 'saboteur' ? 'saboteur' : 'crew'} ${nightRoleVisible ? 'revealed' : ''}`}>
              <p className="stage-label">{t("YOUR PRIVATE CLEARANCE")}</p>
              {!nightRoleVisible ? <button type="button" onClick={() => setNightRoleVisible(true)}><span>{t("KEEP THIS SCREEN PRIVATE")}</span>{t("REVEAL MY ROLE")}</button> : <>
                <small>{view.nightRole === 'saboteur' ? t("INFILTRATION CELL") : t("STATION CREW")}</small>
                <h2>{view.nightRole === 'saboteur' ? t("Saboteur") : t("Crew")}</h2>
                <p>{view.nightRole === 'saboteur' ? t("Help three missions fail. On a mission, you may secretly stabilize or jam.") : t("Help three missions succeed. On a mission, you can only stabilize.")}</p>
                {view.nightRole === 'saboteur' && <div className="night-allies"><small>{t("YOUR CELL")}</small><strong>{view.nightSaboteurIds?.map((id) => playerName(id)).join(' · ')}</strong></div>}
                <button className="private-hide-button" type="button" onClick={() => setNightRoleVisible(false)}>{t("HIDE MY ROLE ↑")}</button>
              </>}
            </section>
            <section className="night-role-rules">
              <p className="stage-label">{t("FIVE MISSIONS · NO ELIMINATION")}</p>
              <h2>{t("Trust is the only equipment that matters.")}</h2>
              <ol><li>{t("A rotating shift lead proposes a crew.")}</li><li>{t("The whole room secretly approves or rejects it.")}</li><li>{t("Deployed players act privately; any jam normally fails the mission.")}</li><li>{t("Win three missions for your hidden side.")}</li></ol>
              {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t("BEGIN THE FIRST SHIFT →")}</button> : <div className="waiting-block"><i /> {t(" READ YOUR ROLE, THEN WAIT")}</div>}
            </section>
          </div>
        )}

        {view.phase === 'night-proposing' && (
          <div className="night-proposal-stage">
            <section className="night-mission-panel">
              <p className="stage-label">{t("MISSION ")}{view.nightMissionNumber} {t(" OF ")}{view.nightMissionTotal}</p>
              <div className="night-track">{Array.from({ length: 5 }, (_, index) => <i className={view.nightHistory?.[index] === true ? 'crew-win' : view.nightHistory?.[index] === false ? 'sabotage-win' : index === (view.nightMissionNumber ?? 1) - 1 ? 'current' : ''} key={index}>{index + 1}</i>)}</div>
              <h2>{view.nightEmergencyDispatch ? t("Emergency dispatch.") : t('{name} has the clipboard.', { name: view.nightLeaderName })}</h2>
              <p>{view.nightEmergencyDispatch ? t('Two crews were rejected. The next {count}-person crew deploys immediately—there is no third vote.', { count: view.nightTeamSize }) : t('Choose {count} players. Everyone will vote after the proposal is locked.', { count: view.nightTeamSize })}</p>
              {view.nightLastVote && <div className="night-last-vote"><small>{t("LAST PROPOSAL REJECTED")}</small><strong>{view.nightLastVote.approve} {t(" APPROVE · ")}{view.nightLastVote.reject} {t(" REJECT")}</strong></div>}
              <span className="night-attempt">{t("PROPOSAL ")}{view.nightProposalAttempt}/3</span>
            </section>
            <section className="night-team-builder">
              {view.nightIsLeader ? <>
                <p className="stage-label">{t("BUILD THE MISSION CREW · ")}{nightTeam.length}/{view.nightTeamSize}</p>
                <div className="night-player-grid">{players.map((player) => {
                  const selected = nightTeam.includes(player.id);
                  return <button className={selected ? 'selected' : ''} type="button" key={player.id} onClick={() => setNightTeamDraft({ key: nightTeamKey, value: selected ? nightTeam.filter((id) => id !== player.id) : nightTeam.length < (view.nightTeamSize ?? 0) ? [...nightTeam, player.id] : nightTeam })}><span className={`player-avatar avatar-${player.avatarColor}`}>{player.name.slice(0, 2).toUpperCase()}</span><strong>{player.name}</strong><b>{selected ? '✓' : '+'}</b></button>;
                })}</div>
                <button className="stage-action" type="button" disabled={acting || nightTeam.length !== view.nightTeamSize} onClick={() => sendAction('night-propose', { value: nightTeam })}>{view.nightEmergencyDispatch ? t("DEPLOY THIS CREW →") : t("PUT THIS CREW TO A VOTE →")}</button>
              </> : <><p className="stage-label">{t("SHIFT LEAD")}</p><h2>{view.nightLeaderName} {t(" is choosing ")}{view.nightTeamSize} {t(" players.")}</h2><p>{t("Question the choice out loud. A trusted crew now can become suspicious evidence later.")}</p><div className="waiting-block"><i /> {t(" CREW PROPOSAL IN PROGRESS")}</div></>}
            </section>
          </div>
        )}

        {view.phase === 'night-voting' && (
          <div className="night-vote-stage">
            <section>
              <p className="stage-label">{t("PROPOSED BY ")}{view.nightLeaderName?.toUpperCase()}</p>
              <h2>{t("Would you trust this crew with the station?")}</h2>
              <div className="night-proposed-list">{view.nightProposedIds?.map((id) => <span key={id}>{playerName(id)}</span>)}</div>
              <p>{t("Discuss first, then vote privately. A tie rejects the crew.")}</p>
            </section>
            <section className="night-vote-controls">
              <button className={view.nightOwnVote === 'approve' ? 'selected approve' : 'approve'} type="button" disabled={acting} onClick={() => sendAction('night-vote', { value: 'approve' })}><small>{t("TRUST THE CREW")}</small>{t("APPROVE")}</button>
              <button className={view.nightOwnVote === 'reject' ? 'selected reject' : 'reject'} type="button" disabled={acting} onClick={() => sendAction('night-vote', { value: 'reject' })}><small>{t("SEND IT BACK")}</small>{t("REJECT")}</button>
              <p>{view.nightOwnVote ? t('Your {vote} vote is locked. You may change it.', { vote: t(view.nightOwnVote) }) : t("Choose in private.")} · {view.submittedCount}/{view.expectedCount} {t(" voted")}</p>
              <div className="vote-status-list" aria-label={t("Voting status")}>{view.voteStatus?.map((status) => <span className={status.voted ? 'voted' : 'waiting'} key={status.playerId}><i />{playerName(status.playerId)}<b>{status.voted ? t("VOTED") : t("WAITING")}</b></span>)}</div>
              {view.isHost && <button className="early-reveal-button" type="button" disabled={acting || !readyToReveal} onClick={() => requestVoteReveal('night-force-vote')}>{t("REVEAL CURRENT VOTES →")}</button>}
            </section>
          </div>
        )}

        {view.phase === 'night-mission' && (
          <div className="night-action-stage">
            <section className="night-deployed-panel">
              <p className="stage-label">{t("MISSION ")}{view.nightMissionNumber} {t(" · DEPLOYED CREW")}</p>
              <div className="night-proposed-list">{view.nightProposedIds?.map((id) => <span className={id === view.playerId ? 'you' : ''} key={id}>{playerName(id)}</span>)}</div>
              <h2>{view.nightMissionNumber === 4 && players.length >= 7 ? t("Shielded systems online.") : t("The station is waiting.")}</h2>
              <p>{view.nightMissionNumber === 4 && players.length >= 7 ? t("This shielded mission needs two jams to fail.") : t("One hidden jam is enough to fail this mission.")}</p>
              {view.nightVotes && <div className="night-public-votes">{view.nightVotes.map((entry) => <span className={entry.vote} key={entry.playerId}><b>{playerName(entry.playerId)}</b>{t(entry.vote)}</span>)}</div>}
            </section>
            <section className="night-action-controls">
              {view.nightIsSelected ? <>
                <p className="stage-label">{t("YOUR PRIVATE ACTION")}</p>
                {!view.hasSubmitted ? <><button className="stabilize" type="button" disabled={acting} onClick={() => sendAction('night-action', { value: 'stabilize' })}><small>{t("HELP THE MISSION")}</small>{t("STABILIZE")}</button>{view.nightRole === 'saboteur' && <button className="jam" type="button" disabled={acting} onClick={() => sendAction('night-action', { value: 'jam' })}><small>{t("FAIL IT SECRETLY")}</small>{t("JAM THE MISSION")}</button>}</> : <div className="night-action-locked"><small>{t("YOUR ACTION")}</small><strong>{t(view.nightOwnAction ?? '')}</strong><span>{t("TRANSMITTED ✓")}</span></div>}
              </> : <><p className="stage-label">{t("YOU ARE OFF THIS MISSION")}</p><h2>{t("Watch faces. Count claims.")}</h2><p>{t("The deployed crew is acting in private. Nobody can see who chose what.")}</p><div className="waiting-block"><i /> {view.submittedCount}/{view.expectedCount} {t(" ACTIONS IN")}</div></>}
            </section>
          </div>
        )}

        {view.phase === 'night-debrief' && (
          <div className={`night-debrief-stage ${view.nightDebrief?.success ? 'success' : 'failure'}`}>
            <p className="stage-label">{t("MISSION ")}{view.nightMissionNumber} {t(" DEBRIEF")}</p>
            <h2>{view.nightDebrief?.success ? t("Systems stable.") : t("The lights went out.")}</h2>
            <div className="night-debrief-count"><strong>{view.nightDebrief?.jamCount ?? 0}</strong><span>{view.nightDebrief?.jamCount === 1 ? t("JAM") : t("JAMS")} {t(" DETECTED")}{view.nightDebrief?.shielded ? <><br />{t("TWO REQUIRED TO FAIL")}</> : null}</span></div>
            <div className="night-debrief-team">{view.nightDebrief?.teamIds.map((id) => <span key={id}>{playerName(id)}</span>)}</div>
            {view.nightDebrief?.audit && <div className={`night-audit ${view.nightDebrief.audit.action}`}><small>{t("BLACK-BOX AUDIT")}</small><strong>{playerName(view.nightDebrief.audit.playerId)} {t(" transmitted ")}{t(view.nightDebrief.audit.action)}.</strong><p>{t("This proves the action, not the player's allegiance—a saboteur may choose to help.")}</p></div>}
            {view.nightVotes && <div className="night-public-votes">{view.nightVotes.map((entry) => <span className={entry.vote} key={entry.playerId}><b>{playerName(entry.playerId)}</b>{t(entry.vote)}</span>)}</div>}
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{view.result?.nightWinner ? t("REVEAL THE HIDDEN TEAMS →") : t("OPEN THE NEXT SHIFT →")}</button> : <div className="waiting-block"><i /> {t(" DISCUSS THE EVIDENCE")}</div>}
          </div>
        )}

        {view.phase === 'night-final' && (
          <div className={`night-final-stage ${view.result?.nightWinner}`}>
            <p className="stage-label">{t("THE NIGHT SHIFT IS OVER")}</p>
            <h2>{view.result?.nightWinner === 'crew' ? t("The crew held the station.") : t("The saboteurs took control.")}</h2>
            <div className="night-final-score"><section><small>{t("STABLE MISSIONS")}</small><strong>{view.nightCrewWins}</strong></section><section><small>{t("FAILED MISSIONS")}</small><strong>{view.nightSaboteurWins}</strong></section></div>
            <div className="night-role-reveal">{view.nightRoleReveal?.map((entry) => <article className={entry.role} key={entry.playerId}><small>{entry.role === 'saboteur' ? t("SABOTEUR") : t("CREW")}</small><strong>{playerName(entry.playerId)}</strong></article>)}</div>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => { setNightRoleVisible(false); void sendAction('advance'); }}>{t("DEAL NEW ROLES →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE NEXT SHIFT")}</div>}
          </div>
        )}

        {(view.phase === 'briefing' || view.phase === 'performance' || view.phase === 'vote') && view.game?.mode === 'outsider' && view.game.slug !== 'alibi-club' && (
          <div className="brief-column">
            <p className="stage-label">{t("YOUR PRIVATE BRIEF")}</p>
            <div className={`secret-card ${briefVisible ? 'revealed' : ''}`}>
              {briefVisible ? (
                <><small>{view.cardTitle}</small><h2>{view.privatePrompt}</h2><p>{view.instruction}</p>{view.note && <aside>{view.note}</aside>}<button className="private-hide-button" type="button" onClick={() => setBriefVisible(false)}>{t("HIDE MY BRIEF ↑")}</button></>
              ) : (
                <button type="button" onClick={() => setBriefVisible(true)}><span>{t("KEEP THIS SCREEN PRIVATE")}</span>{t("REVEAL MY BRIEF")}</button>
              )}
            </div>
          </div>
        )}

        {view.game?.slug === 'alibi-club' && (view.phase === 'briefing' || view.phase === 'vote') && <div className="brief-column">
          <p className="stage-label">{t('Read and remember')}</p>
          {view.phase === 'briefing' && remainingSeconds > 0 ? <div className="secret-card revealed"><h2>{view.privatePrompt}</h2><p>{t('You have 10 seconds. This incident disappears and cannot be reopened.')}</p></div>
            : <div className="waiting-block"><strong>{t('The incident is hidden. Trust your memory.')}</strong><p>{t('Question one another without naming the place. The outsider must bluff. Vote whenever you are ready.')}</p></div>}
        </div>}
        {view.game?.slug === 'house-rule' && view.phase === 'vote' && <div className="house-rule-explainer"><strong>{t('How this round works')}</strong><ol><li>{t('Read your private rule. One person has no rule.')}</li><li>{t('Take turns answering the starter question while following the rule. Do not explain it out loud.')}</li><li>{t('Watch the pattern, bluff if you need to, and vote for the person who does not know the rule.')}</li></ol></div>}
        {view.game?.mode === 'outsider' && ['briefing', 'performance', 'vote'].includes(view.phase ?? '') && view.isHost && <details className="skip-card-control"><summary>{t('Already played this card?')}</summary><p>{t('Skip for everyone without awarding points. All votes on this card are discarded.')}</p><button type="button" disabled={acting} onClick={() => sendAction('skip-card')}>{t('SKIP THIS CARD →')}</button></details>}

        {view.phase === 'briefing' && view.game?.mode === 'outsider' && view.game.slug !== 'alibi-club' && (
          <div className="action-column">
            <p className="stage-label">{t("AT THE TABLE")}</p>
            <h2>{t("Read it. Put your phone down. Play it out.")}</h2>
            <p>{view.game.slug === 'head-fake' ? t('Read your private movement. When everyone is ready, start the timer and perform together.') : t("When everyone has finished the performance or discussion, it's time to point fingers.")}</p>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{view.game.slug === 'head-fake' ? t('START THE PERFORMANCE →') : t("OPEN THE ACCUSATION →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE HOST")}</div>}
          </div>
        )}

        {view.phase === 'performance' && <div className="action-column"><h2>{t('Keep moving until the timer ends.')}</h2><p>{t('Voting opens automatically afterwards.')}</p></div>}

        {view.phase === 'truths-writing' && (
          <div className="truths-writing-stage">
            {view.isStoryteller ? <section>
              <p className="stage-label">{t("YOUR TURN IN THE HOT SEAT · ")}{view.storyNumber}/{view.storyTotal}</p>
              <h2>{t("Write two truths and one clean lie.")}</h2>
              <p>{t("Make all three believable and roughly equally specific. A lie should be genuinely false—not an exaggerated half-truth the room cannot judge fairly.")}</p>
              <form onSubmit={submitTruths}>{truthStatements.map((statement, index) => <label className={truthLieIndex === index ? 'selected-lie' : ''} key={index}><span>{t("STATEMENT ")}{index + 1}</span><textarea value={statement} maxLength={140} onChange={(event) => setTruthStatements(truthStatements.map((value, statementIndex) => statementIndex === index ? event.target.value : value))} placeholder={index === 0 ? t("I once…") : index === 1 ? t("I have never…") : t("When I was younger…")} /><button type="button" onClick={() => setTruthLieIndex(index)}>{truthLieIndex === index ? t("THIS IS THE LIE ✓") : t("MARK AS THE LIE")}</button></label>)}<button className="truths-lock-button" type="submit" disabled={acting || truthLieIndex === null || truthStatements.some((statement) => !statement.trim())}>{t("LOCK MY THREE STATEMENTS →")}</button></form>
            </section> : <section className="truths-waiting-writer"><p className="stage-label">{t("STORY ")}{view.storyNumber} {t(" OF ")}{view.storyTotal}</p><h2>{view.storytellerName} {t(" is preparing three claims.")}</h2><p>{t("They are writing two truths and one lie. When the statements appear, question the details before you vote.")}</p><div className="waiting-block"><i /> {t(" WRITING IN PRIVATE")}</div></section>}
            <aside className="truths-tips"><p className="stage-label">{t("A GOOD SET HAS…")}</p><span><b>01</b>{t("A surprising truth that looks invented")}</span><span><b>02</b>{t("An ordinary lie that sounds effortless")}</span><span><b>03</b>{t("Details you can defend under questions")}</span></aside>
          </div>
        )}

        {view.phase === 'truths-discussion' && (
          <div className="truths-discussion-stage">
            <p className="stage-label">{t('Question {name} · Do not vote yet', { name: view.storytellerName })}</p>
            <h2>{t("Which detail will crack first?")}</h2>
            <div className="truth-statement-grid">{view.truthStatements?.map((statement, index) => <article key={statement}><b>{index + 1}</b><p>{statement}</p></article>)}</div>
            <div className="truths-discussion-copy"><p>{t("Ask about names, timing, motives, or what happened next. The storyteller must defend every claim without revealing the lie.")}</p>{view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t("OPEN PRIVATE VOTING →")}</button> : <div className="waiting-block"><i /> {t(" QUESTION THE STORYTELLER")}</div>}</div>
          </div>
        )}

        {view.phase === 'truths-vote' && (
          <div className="truths-vote-stage">
            <p className="stage-label">{t('Find {name}’s lie', { name: view.storytellerName?.toUpperCase() })}</p>
            <h2>{t("One claim was invented.")}</h2>
            {!view.isStoryteller ? <div className="truth-statement-grid">{view.truthStatements?.map((statement, index) => <button className={view.hasSubmitted ? 'vote-locked' : ''} type="button" disabled={acting} onClick={() => sendAction('truths-vote', { value: index })} key={statement}><b>{index + 1}</b><p>{statement}</p><span>{view.hasSubmitted ? t("TAP TO CHANGE VOTE") : t("THIS IS THE LIE")}</span></button>)}</div> : <div className="truths-storyteller-wait"><strong>{t("Keep a straight face.")}</strong><p>{t("The room is voting privately. You earn 1 point for every person who chooses one of your truths.")}</p></div>}
            <p className="submission-line">{view.submittedCount}/{view.expectedCount} {t(" accusations are locked.")}</p>
            {view.isHost && <button className="stage-action" type="button" disabled={acting || !readyToReveal} onClick={() => requestVoteReveal('advance')}>{t("REVEAL THE LIE →")}</button>}
          </div>
        )}

        {view.phase === 'signal-clue' && (
          <div className="signal-clue-stage">
            <section className={view.isReceiver ? 'signal-receiver-card' : 'signal-sender-card'}>
              <p className="stage-label">{t("SIGNAL ")}{view.signalTurnNumber}/{view.signalTurnTotal}</p>
              {view.isReceiver ? <>
                <small>{t("YOU ARE THE RECEIVER")}</small>
                <h2>{t("Look away. The room is choosing clues.")}</h2>
                <p>{t("The target stays hidden until every other player sends exactly one word. Matching clues will disappear before you see the signal.")}</p>
                <div className="signal-antenna" aria-hidden="true"><i /><i /><i /></div>
              </> : <>
                <small>{view.signalCategory} {t(" · THE TARGET")}</small>
                <h2>{view.signalTarget}</h2>
                <div className="signal-blocked"><span>{t("DEAD AIR")}</span>{view.signalBlocked?.map((word) => <b key={word}>{word}</b>)}</div>
                {!view.hasSubmitted ? <form onSubmit={submitSignalClue}><label htmlFor="signal-clue">{t("ONE-WORD CLUE")}</label><div><input id="signal-clue" value={signalClue} maxLength={24} onChange={(event) => setSignalClueDraft({ round: view.round ?? 0, value: event.target.value.replace(/\s/g, '') })} placeholder={t("Useful, but unexpected…")} autoComplete="off" /><button type="submit" disabled={acting || !signalClue.trim()}>{t("SEND →")}</button></div></form> : <div className="signal-locked"><small>{t("YOUR SIGNAL")}</small><strong>{view.ownSignalClue}</strong><span>{t("TRANSMITTED ✓")}</span></div>}
              </>}
            </section>
            <aside className="signal-rules-panel">
              <p className="stage-label">{t("HOW TO STAY ON THE AIR")}</p>
              <h2>{t("Useful. Unique. One word.")}</h2>
              <ol><li><b>01</b><span>{t("Do not use the target, part of it, or either blocked word.")}</span></li><li><b>02</b><span>{t("Do not discuss clues or watch anyone type.")}</span></li><li><b>03</b><span>{t("If two people send the same clue, every copy is cancelled.")}</span></li></ol>
              <p className="submission-line">{view.submittedCount}/{view.expectedCount} {t(" signals received. The clue board opens automatically.")}</p>
            </aside>
          </div>
        )}

        {view.phase === 'signal-guess' && (
          <div className="signal-guess-stage">
            <p className="stage-label">{view.signalCancelledCount} {t(" CLUE")}{view.signalCancelledCount === 1 ? '' : t("S")} {t(" LOST TO STATIC")}</p>
            <h2>{view.receiverName}{t(", read what survived.")}</h2>
            <div className="signal-clue-grid">
              {(view.signalClues?.length ?? 0) === 0 && <p className="signal-empty">{t("DEAD AIR · TAKE YOUR BEST SHOT")}</p>}
              {view.signalClues?.map((clue) => <article className={clue.cancelled ? 'cancelled' : ''} key={clue.playerId}><small>{clue.cancelled ? t("CANCELLED ECHO") : t("LIVE SIGNAL")}</small><strong>{clue.clue}</strong>{!view.isReceiver && <span>{playerName(clue.playerId)}</span>}</article>)}
            </div>
            {view.isReceiver ? <form className="signal-guess-form" onSubmit={submitSignalGuess}><label htmlFor="signal-guess">{t("YOUR ONE GUESS")}</label><div><input id="signal-guess" value={signalGuess} maxLength={60} onChange={(event) => setSignalGuessDraft({ round: view.round ?? 0, value: event.target.value })} placeholder={t("What connects the clues?")} autoComplete="off" autoFocus /><button type="submit" disabled={acting || !signalGuess.trim()}>{t("LOCK GUESS →")}</button></div></form> : <div className="signal-wait-card"><strong>{t("Give nothing away.")}</strong><p>{view.receiverName} {t(" sees only the live clues. No reactions, hints, or strategic coughing.")}</p><div className="waiting-block"><i /> {t(" RECEIVER IS DECODING")}</div></div>}
          </div>
        )}

        {view.phase === 'signal-final' && (
          <div className="results-stage signal-final">
            <p className="stage-label">{t("EVERYONE HAS BEEN THE RECEIVER")}</p>
            <h2>{view.signalCorrectCount === view.signalTurnTotal ? t("Crystal clear.") : (view.signalCorrectCount ?? 0) >= Math.ceil((view.signalTurnTotal ?? 1) * .7) ? t("A strong connection.") : t("The static won this lap.")}</h2>
            <div className="signal-final-score"><strong>{view.signalCorrectCount}</strong><span>{t("OF ")}{view.signalTurnTotal}<br />{t("SIGNALS CONNECTED")}</span></div>
            <p>{t("Every correct connection added one shared point to every player. The next lap deals a fresh target to every receiver.")}</p>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t("START A NEW LAP →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE HOST")}</div>}
          </div>
        )}

        {view.phase === 'writers-writing' && (
          <div className="writers-writing-stage">
            <section className="writers-scene-card">
              <p className="stage-label">{t("SCENE ")}{view.writersTurnNumber}/{view.writersTurnTotal} · {view.writersPrompt?.genre}</p>
              <h2>{view.writersPrompt?.setup}</h2>
              <p>{view.writersPrompt?.direction}</p>
              <div className="writers-director-stamp"><small>{t("DIRECTOR")}</small><strong>{view.directorName}</strong></div>
            </section>
            <section className="writers-pitch-desk">
              <p className="stage-label">{t("THE NEXT BEAT")}</p>
              {view.isDirector ? <div className="writers-director-wait"><strong>{t("Hold the room.")}</strong><p>{t("Everyone else is secretly pitching the next twist. You will choose your favorite without seeing who wrote it.")}</p><div className="waiting-block"><i /> {view.submittedCount}/{view.expectedCount} {t(" PITCHES IN")}</div></div> : !view.hasSubmitted ? <form onSubmit={submitWritersPitch}><label htmlFor="writers-pitch">{t("WRITE ONE SHORT, SPECIFIC PITCH")}</label><textarea id="writers-pitch" value={writersPitch} maxLength={160} onChange={(event) => setWritersPitchDraft({ round: view.round ?? 0, value: event.target.value })} placeholder={t("The scene changes when…")} autoComplete="off" autoFocus /><div><span>{writersPitch.length}/160</span><button type="submit" disabled={acting || writersPitch.trim().length < 3}>{t("SEND TO THE ROOM →")}</button></div></form> : <div className="writers-pitch-locked"><small>{t("YOUR PITCH")}</small><strong>{view.ownWritersPitch}</strong><span>{t("ON THE BOARD ✓")}</span></div>}
              {!view.isDirector && <p className="submission-line">{view.submittedCount}/{view.expectedCount} {t(" pitches are in. The board opens automatically.")}</p>}
            </section>
          </div>
        )}

        {view.phase === 'writers-judging' && (
          <div className="writers-judging-stage">
            <header><p className="stage-label">{view.directorName?.toUpperCase()} {t(" CALLS THE SCENE")}</p><h2>{t("Which pitch belongs in the movie?")}</h2><p>{t("Read them aloud before choosing. The writers stay anonymous until the reveal.")}</p></header>
            <div className="writers-pitch-grid">{view.writersPitches?.map((pitch, index) => view.isDirector ? <button type="button" disabled={acting} onClick={() => sendAction('writers-pick', { value: index })} key={pitch.playerId}><small>{t("PITCH ")}{String(index + 1).padStart(2, '0')}</small><strong>{pitch.pitch}</strong><span>{t("CALL THIS SCENE →")}</span></button> : <article key={pitch.playerId}><small>{t("PITCH ")}{String(index + 1).padStart(2, '0')}</small><strong>{pitch.pitch}</strong></article>)}</div>
            {!view.isDirector && <div className="waiting-block"><i /> {t(" THE DIRECTOR IS CHOOSING")}</div>}
          </div>
        )}

        {view.phase === 'writers-final' && (
          <div className="results-stage writers-final">
            <p className="stage-label">{t("EVERYONE HAS DIRECTED A SCENE")}</p>
            <h2>{players.filter((player) => player.score === tableHighScore).length > 1 ? t("The credits need co-writers.") : t('{name} gets top billing.', { name: players.find((player) => player.score === tableHighScore)?.name })}</h2>
            <div className="truth-final-scores">{[...players].sort((a, b) => b.score - a.score).map((player, index) => <article className={player.score === tableHighScore ? 'winner' : ''} key={player.id}><b>{index + 1}</b><strong>{player.name}</strong><span>{player.score} {t(" PTS")}</span></article>)}</div>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t("OPEN A NEW WRITERS’ ROOM →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE HOST")}</div>}
          </div>
        )}

        {view.phase === 'relay-drawing' && (
          <div className="relay-play-stage">
            <section className="relay-source-panel">
              <p className="stage-label">{t("PAGE ")}{view.relayStepNumber}/{view.relayStepTotal} {t(" · DRAW WHAT YOU READ")}</p>
              <div className="relay-phrase-card"><small>{t("PRIVATE PHRASE")}</small><h2>{view.relaySourceText}</h2><p>{t("No letters, numbers, speech, or showing your screen. Bad art is useful evidence.")}</p></div>
            </section>
            <section className="relay-work-panel">
              <p className="stage-label">{t("YOUR DOODLE")}</p>
              {!view.hasSubmitted ? <form onSubmit={submitRelayDrawing}><RelayCanvas value={relayDrawing} onChange={(value) => setRelayDrawingDraft({ round: view.round ?? 0, value })} /><button className="relay-pass-button" type="submit" disabled={acting || !relayDrawing.length}>{t("PASS THE DOODLE →")}</button></form> : <div className="relay-locked-page"><RelayPreview drawing={view.ownRelayDrawing ?? []} label={t("Your submitted doodle")} /><strong>{t("PAGE PASSED ✓")}</strong></div>}
              <p className="submission-line">{view.submittedCount}/{view.expectedCount} {t(" pages passed. Everyone turns together.")}</p>
            </section>
          </div>
        )}

        {view.phase === 'relay-guessing' && (
          <div className="relay-play-stage">
            <section className="relay-source-panel relay-drawing-source">
              <p className="stage-label">{t("PAGE ")}{view.relayStepNumber}/{view.relayStepTotal} {t(" · DESCRIBE WHAT YOU SEE")}</p>
              <RelayPreview drawing={view.relaySourceDrawing ?? []} label={t("The private doodle you need to describe")} />
              <p>{t("Do not ask the artist, react aloud, or hunt for hidden writing. Type the scene you genuinely see.")}</p>
            </section>
            <section className="relay-work-panel relay-guess-panel">
              <p className="stage-label">{t("YOUR BEST GUESS")}</p>
              {!view.hasSubmitted ? <form onSubmit={submitRelayGuess}><label htmlFor="relay-guess">{t("ONE SHORT PHRASE")}</label><textarea id="relay-guess" value={relayGuess} maxLength={100} onChange={(event) => setRelayGuessDraft({ round: view.round ?? 0, value: event.target.value })} placeholder={t("It looks like…")} autoComplete="off" autoFocus /><div><span>{relayGuess.length}/100</span><button className="relay-pass-button" type="submit" disabled={acting || relayGuess.trim().length < 2}>{t("PASS THE GUESS →")}</button></div></form> : <div className="relay-locked-guess"><small>{t("YOUR GUESS")}</small><strong>{view.ownRelayGuess}</strong><span>{t("PAGE PASSED ✓")}</span></div>}
              <p className="submission-line">{view.submittedCount}/{view.expectedCount} {t(" pages passed. The next drawing appears automatically.")}</p>
            </section>
          </div>
        )}

        {view.phase === 'relay-reveal' && (
          <div className="relay-reveal-stage">
            <header><p className="stage-label">{t("CHAIN ")}{view.relayRevealNumber}/{view.relayRevealTotal}</p><h2>{t("Here is where it wandered.")}</h2></header>
            <div className="relay-chain"><article className="relay-chain-prompt"><small>{t("THE ORIGINAL")}</small><strong>{view.relayRevealChain?.prompt}</strong></article>{view.relayRevealChain?.entries.map((entry, index) => <article className={`relay-chain-entry relay-chain-${entry.kind}`} key={`${entry.playerId}-${index}`}><small>{String(index + 1).padStart(2, '0')} · {entry.kind === 'draw' ? t("DOODLED") : t("GUESSED")} {t(" BY ")}{playerName(entry.playerId)}</small>{entry.kind === 'draw' ? <RelayPreview drawing={entry.value} label={t('Drawing by {name}', { name: playerName(entry.playerId) })} /> : <strong>{entry.value}</strong>}</article>)}</div>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{view.relayRevealNumber === view.relayRevealTotal ? t("SEE THE RELAY BOARD →") : t("REVEAL THE NEXT CHAIN →")}</button> : <div className="waiting-block"><i /> {t(" READING THE CHAIN TOGETHER")}</div>}
          </div>
        )}

        {view.phase === 'relay-final' && (
          <div className="results-stage relay-final">
            <p className="stage-label">{t("EVERY CHAIN MADE IT AROUND THE TABLE")}</p>
            <h2>{t("Not one message arrived intact.")}</h2>
            <div className="relay-summary-grid">{view.relaySummaries?.map((summary, index) => <article key={`${summary.prompt}-${index}`}><small>{t("CHAIN ")}{String(index + 1).padStart(2, '0')}</small><strong>{summary.prompt}</strong><span>↓</span><p>{summary.finalGuess ?? t("The chain ended on a drawing.")}</p></article>)}</div>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t("START A NEW RELAY →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE HOST")}</div>}
          </div>
        )}

        {view.phase === 'categories-ready' && (
          <div className="categories-ready-stage">
            <section>
              <p className="stage-label">{t("THE CLASSIC WORD RACE")}</p>
              <h2>{t("Five categories. One secret letter.")}</h2>
              <p>{t("When the host starts, the letter and answer sheet appear together. You have {seconds} seconds. Every answer must begin with that letter.", { seconds: view.turnSeconds ?? 90 })}</p>
              <div className="category-example"><small>{t("EXAMPLE · LETTER B")}</small><span><b>{t("AN ANIMAL")}</b>{t("Bear ✓")}</span><span><b>{t("A FOOD")}</b>{t("Banana ✓")}</span></div>
            </section>
            <section className="categories-ready-rules">
              <p className="stage-label">{t("HOW SCORING WORKS")}</p>
              <h2>{t("Different wins.")}</h2>
              <ol><li>{t("A valid answer nobody else wrote earns ")}<b>{t("1 point")}</b>.</li><li>{t("If two or more people match, every copy earns ")}<b>0</b>.</li><li>{t("Blank answers and answers with the wrong first letter earn ")}<b>0</b>.</li></ol>
              {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t("REVEAL THE LETTER →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE LETTER")}</div>}
            </section>
          </div>
        )}

        {view.phase === 'categories-answering' && (
          <div className="categories-answering-stage">
            <header><div><small>{t("YOUR LETTER")}</small><strong>{view.letter}</strong></div><div className={remainingSeconds <= 15 ? 'clock-low' : ''}><small>{t("SECONDS LEFT")}</small><strong>{String(remainingSeconds).padStart(2, '0')}</strong></div></header>
            {!view.hasSubmitted ? <form onSubmit={submitCategories}>
              {view.categories?.map((category, index) => <label key={category}><span><b>{index + 1}</b>{category}</span><div><i>{view.letter}</i><input value={categoryAnswers[index]} maxLength={40} disabled={remainingSeconds === 0} onChange={(event) => setCategoryAnswers(categoryAnswers.map((answer, answerIndex) => answerIndex === index ? event.target.value : answer))} placeholder={t("Your unique answer…")} autoComplete="off" /></div></label>)}
              <p>{t('You can leave answers blank. Submit before time runs out; only submitted answers count.')}</p>
              <button type="submit" disabled={acting || remainingSeconds === 0}>{t("SUBMIT MY SHEET →")}</button>
            </form> : <div className="categories-locked"><small>{t("YOUR SHEET IS IN")}</small>{view.categories?.map((category, index) => <span key={category}><b>{category}</b>{view.ownCategoryAnswers?.[index] || '—'}</span>)}<strong>{t("NO CHANGES AFTER SUBMITTING ✓")}</strong></div>}
            <p className="submission-line">{view.submittedCount}/{view.expectedCount} {t(" sheets are in. Results appear when everyone submits or time expires.")}</p>
          </div>
        )}

        {view.phase === 'fishbowl-setup' && (
          <div className="fishbowl-setup-stage">
            <section>
              <p className="stage-label">{t("ADD TWO SECRET PROMPTS")}</p>
              <h2>{t("Write the bowl together.")}</h2>
              <p>{t("Use a person, character, place, object, or short phrase that most people here could recognize. Funny and specific beats obscure.")}</p>
              {!view.hasSubmitted ? <form onSubmit={submitBowl}>
                {bowlPrompts.map((prompt, index) => <label key={index}>{t("PROMPT ")}{index + 1}<input value={prompt} maxLength={50} onChange={(event) => setBowlPrompts(bowlPrompts.map((value, promptIndex) => promptIndex === index ? event.target.value : value))} placeholder={index === 0 ? t("e.g. A pigeon stealing chips") : t("e.g. Sherlock Holmes")} autoComplete="off" /></label>)}
                <button type="submit" disabled={acting || !bowlPrompts.every((prompt) => prompt.trim())}>{t("DROP THEM IN THE BOWL →")}</button>
              </form> : <div className="bowl-locked"><small>{t("YOUR PROMPTS ARE IN")}</small>{view.ownPrompts?.map((prompt) => <strong key={prompt}>{prompt}</strong>)}<span>{t("KEPT SECRET ✓")}</span></div>}
            </section>
            <section className="fishbowl-setup-guide">
              <p className="stage-label">{t("WHAT HAPPENS NEXT")}</p>
              <h2>{t("The same bowl. Three different rules.")}</h2>
              <ol><li><b>01</b><span><strong>{t("Describe it")}</strong>{t("Say anything except the answer.")}</span></li><li><b>02</b><span><strong>{t("One word")}</strong>{t("Exactly one clue word per prompt.")}</span></li><li><b>03</b><span><strong>{t("Act it")}</strong>{t("Silent movement only.")}</span></li></ol>
              <p className="submission-line">{view.submittedCount}/{view.expectedCount} {t(" players have added their prompts.")}</p>
              {view.isHost ? <button className="stage-action" type="button" disabled={acting || view.submittedCount !== view.expectedCount} onClick={() => sendAction('advance')}>{t("LOCK THE BOWL →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR EVERY PROMPT")}</div>}
            </section>
          </div>
        )}

        {view.phase === 'fishbowl-ready' && (
          <div className="charades-ready-stage fishbowl-ready-stage">
            <section>
              <p className="stage-label">{t("ROUND ")}{view.round} {t(" OF 3 · ")}{view.bowlSize} {t(" PROMPTS")}</p>
              <h2 className="bowl-round-title">{view.roundTitle}</h2>
              <p className="bowl-round-rule">{view.roundRule}</p>
              <div className="charades-teams">
                {(['blue', 'red'] as const).map((team) => <article className={`charades-team team-${team}`} key={team}><header><span>{t(team === 'blue' ? 'BLUE TEAM' : 'RED TEAM')}</span><strong>{view.teamScores?.[team] ?? 0}</strong></header>{view.teams?.[team].map((id) => <p className={id === view.actorId ? 'next-actor' : ''} key={id}>{playerName(id)}{id === view.actorId && <small>{t("CLUE-GIVER")}</small>}</p>)}</article>)}
              </div>
            </section>
            <section className="charades-handoff">
              <p className="stage-label">{t("PASS THE PHONE")}</p>
              <h2>{view.actorName}{t(", take the bowl.")}</h2>
              <p>{t("Your ")}{t(view.actorTeam ?? 'blue')} {t(" team guesses. Follow this round's clue rule, tap every correct answer, and pass whenever you are stuck.")}</p>
              {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t("START {seconds} SECONDS →", { seconds: view.turnSeconds ?? 45 })}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE HOST")}</div>}
            </section>
          </div>
        )}

        {view.phase === 'fishbowl-turn' && (
          <div className="charades-turn-stage fishbowl-turn-stage">
            <section className={`charades-clock ${remainingSeconds <= 10 ? 'clock-low' : ''}`}><small>{t("SECONDS LEFT")}</small><strong>{String(remainingSeconds).padStart(2, '0')}</strong><p>{view.remainingCount} {t(" of ")}{view.bowlSize} {t(" prompts remain")}</p></section>
            {view.playerId === view.actorId ? <section className="charades-prompt-card fishbowl-prompt-card">
              <p className="stage-label">{view.roundTitle?.toUpperCase()} · {view.actorTeam?.toUpperCase()} {t(" TEAM")}</p>
              <div><span>{t("FOLLOW THIS RULE")}</span><p>{view.roundRule}</p><h2>{view.fishbowlPrompt}</h2></div>
              <div className="charades-controls"><button type="button" disabled={acting} onClick={() => sendAction('fishbowl-pass')}>{t("PASS")}</button><button type="button" disabled={acting} onClick={() => sendAction('fishbowl-correct')}>{t("GOT IT! +1")}</button></div>
              <button className="charades-end-turn" type="button" disabled={acting} onClick={() => sendAction('fishbowl-finish')}>{t("END TURN EARLY")}</button>
            </section> : <section className="charades-wait-card">
              <p className="stage-label">{view.ownTeam === view.actorTeam ? t("YOUR TEAM IS GUESSING") : t("THE OTHER TEAM IS GUESSING")}</p>
              <h2>{view.ownTeam === view.actorTeam ? t('Guess from {name}’s clue.', { name: view.actorName }) : t("Listen carefully. Every prompt returns.")}</h2>
              <p>{view.roundRule} {t(" The clue-giver controls correct answers and passes on their phone.")}</p>
              {view.isHost && <button className="charades-end-turn" type="button" disabled={acting} onClick={() => sendAction('fishbowl-finish')}>{t("END TURN EARLY")}</button>}
            </section>}
          </div>
        )}

        {view.phase === 'fishbowl-turn-recap' && (
          <div className="results-stage charades-recap">
            <p className="stage-label">{t("TIME · ")}{view.remainingCount} {t(" PROMPTS STILL IN THE BOWL")}</p>
            <h2>{view.actorName} {t(" cleared ")}{view.turnScore}.</h2>
            <div className="charades-score-cards">{(['blue', 'red'] as const).map((team) => <article className={`team-${team}`} key={team}><small>{t(team === 'blue' ? 'BLUE TEAM' : 'RED TEAM')}</small><strong>{view.teamScores?.[team] ?? 0}</strong></article>)}</div>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t("PASS THE BOWL →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE NEXT TURN")}</div>}
          </div>
        )}

        {view.phase === 'fishbowl-round-recap' && (
          <div className="results-stage charades-recap">
            <p className="stage-label">{t("ROUND ")}{view.round} {t(" COMPLETE")}</p>
            <h2>{t("The bowl is empty.")}</h2>
            <p className="bowl-recap-copy">{t("Every prompt goes back in. You already know the answers—now the clue rule gets harder.")}</p>
            <div className="charades-score-cards">{(['blue', 'red'] as const).map((team) => <article className={`team-${team}`} key={team}><small>{t(team === 'blue' ? 'BLUE TEAM' : 'RED TEAM')}</small><strong>{view.teamScores?.[team] ?? 0}</strong></article>)}</div>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{view.roundMode === 2 ? t("SEE THE FINAL SCORE →") : t('OPEN ROUND {round} →', { round: (view.round ?? 1) + 1 })}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE HOST")}</div>}
          </div>
        )}

        {view.phase === 'vote' && (
          <div className="action-column vote-column">
            <p className="stage-label">{t("WHO HAD THE WRONG BRIEF?")}</p>
            <h2>{t("Trust the awkward details.")}</h2>
            {['alibi-club', 'house-rule', 'head-fake'].includes(view.game?.slug ?? '') && <p>{t('Vote during the discussion. The last vote reveals the result automatically.')}</p>}
            <div className="vote-grid">
              {players.filter((player) => player.id !== view.playerId).map((player) => (
                <button className={view.ownVoteTargetId === player.id ? 'selected' : ''} type="button" key={player.id} aria-pressed={view.ownVoteTargetId === player.id} disabled={acting} onClick={() => sendAction('vote', { targetId: player.id })}>
                  <span className={`player-avatar avatar-${player.avatarColor}`}>{player.name.slice(0, 2).toUpperCase()}</span><strong>{player.name}</strong><b>{view.ownVoteTargetId === player.id ? t("VOTED ✓") : t("CHOOSE")}</b>
                </button>
              ))}
            </div>
            <p className="submission-line">{t("You may change your vote until the reveal.")} · {view.submittedCount}/{view.expectedCount} {t(" voted")}</p>
            <div className="vote-status-list" aria-label={t("Voting status")}>{view.voteStatus?.map((status) => <span className={status.voted ? 'voted' : 'waiting'} key={status.playerId}><i />{playerName(status.playerId)}<b>{status.voted ? t("VOTED") : t("WAITING")}</b></span>)}</div>
            {view.isHost && <button className="stage-action" type="button" disabled={acting || (!['alibi-club', 'house-rule', 'head-fake'].includes(view.game?.slug ?? '') && !readyToReveal)} onClick={() => requestVoteReveal('advance')}>{missingVotes ? t("REVEAL CURRENT VOTES →") : t("REVEAL THE VOTES →")}</button>}
          </div>
        )}

        {view.phase === 'answering' && (
          <div className="answer-stage">
            <p className="stage-label">{t("ANSWER FOR THE ROOM, NOT YOURSELF")}</p>
            <h2>{view.question}</h2>
            {!view.hasSubmitted ? (
              <form onSubmit={submitAnswer}><label htmlFor="round-answer">{t("YOUR ANSWER")}</label><div><input id="round-answer" value={answer} onChange={(event) => setAnswer(event.target.value.slice(0, 60))} placeholder={t("Think like everyone else…")} autoComplete="off" /><button disabled={acting || !answer.trim()} type="submit">{t("LOCK IT IN →")}</button></div></form>
            ) : (
              <div className="locked-answer"><small>{t("YOUR ANSWER")}</small><strong>{view.ownAnswer}</strong><span>{t("LOCKED ✓")}</span></div>
            )}
            <p className="submission-line">{view.submittedCount}/{view.expectedCount} {t(" answers are in. No peeking, no negotiating.")}</p>
            {view.isHost && <button className="stage-action" type="button" disabled={acting || !readyToReveal} onClick={() => requestVoteReveal('advance')}>{t("REVEAL THE ROOM →")}</button>}
          </div>
        )}

        {view.phase === 'missions' && (
          <div className="mission-stage">
            <div>
              <p className="stage-label">{t("YOUR SECRET SIDE MISSION")}</p>
              <div className={`mission-card ${briefVisible ? 'revealed' : 'concealed'}`}>{briefVisible ? <><small>{view.mission?.title}</small><h2>{view.mission?.mission}</h2><p>{view.mission?.note}</p><button className="private-hide-button" type="button" onClick={() => setBriefVisible(false)}>{t("HIDE MY MISSION ↑")}</button></> : <button className="mission-reveal-button" type="button" onClick={() => setBriefVisible(true)}><span>{t("KEEP THIS SCREEN PRIVATE")}</span>{t("REVEAL MY MISSION")}</button>}</div>
            </div>
            <div className="mission-controls">
              <p className="stage-label">{t("KEEP PLAYING THE BOARD GAME")}</p>
              <h2>{t("Complete it quietly. Reveal it when the table is done.")}</h2>
              <p>{t("Marking a mission is based on trust. You can undo it before the host reveals everyone's objectives.")}</p>
              <button className={`mission-complete ${view.hasSubmitted ? 'done' : ''}`} type="button" disabled={acting} onClick={() => sendAction('complete', { value: !view.hasSubmitted })}>{view.hasSubmitted ? t("MISSION COMPLETE ✓") : t("I COMPLETED MY MISSION")}</button>
              <span>{view.submittedCount}/{view.expectedCount} {t(" players have quietly completed theirs")}</span>
              {view.isHost && <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t("REVEAL ALL MISSIONS →")}</button>}
            </div>
          </div>
        )}

        {view.phase === 'results' && view.game?.mode === 'outsider' && (
          <div className="results-stage">
            <p className="stage-label">{t("THE TABLE HAS SPOKEN")}</p>
            <h2>{view.result?.caught ? t("Caught in the act.") : t("They got away with it.")}</h2>
            <div className="outsider-reveal"><small>{t("THE OUTSIDER WAS")}</small><strong>{playerName(view.result?.outsiderId)}</strong></div>
            <div className="prompt-compare"><div><small>{t("THE GROUP SAW")}</small><p>{view.result?.regularPrompt}</p></div><div><small>{t("THE OUTSIDER SAW")}</small><p>{view.result?.outsiderPrompt}</p></div></div>
            <div className="tally-list">
              {Object.entries(view.result?.tally ?? {}).sort((a, b) => b[1] - a[1]).map(([id, votes]) => <span key={id}><b>{playerName(id)}</b>{votes} {votes === 1 ? t("vote") : t("votes")}</span>)}
            </div>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t("PLAY ANOTHER ROUND →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE NEXT ROUND")}</div>}
          </div>
        )}

        {view.phase === 'results' && view.game?.mode === 'answers' && (
          <div className="results-stage same-results">
            <p className="stage-label">{t("HERE'S WHAT THE ROOM THOUGHT")}</p>
            <h2>{(view.result?.winnerIds?.length ?? 0) > 0 ? t("Great minds collided.") : t("Not one matching thought.")}</h2>
            <div className="answer-groups">
              {view.result?.answerGroups?.map((group, index) => (
                <article className={index === 0 && group.playerIds.length > 1 ? 'top-match' : ''} key={`${group.answer}-${index}`}><strong>{group.answer}</strong><span>{group.playerIds.map((id) => playerName(id)).join(', ')}</span><b>{group.playerIds.length}</b></article>
              ))}
            </div>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t("NEXT QUESTION →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE NEXT QUESTION")}</div>}
          </div>
        )}

        {view.phase === 'results' && view.game?.mode === 'missions' && (
          <div className="results-stage mission-results">
            <p className="stage-label">{t("THE SECRET AGENDAS")}</p>
            <h2>{t("The board had a second game hiding underneath it.")}</h2>
            <div className="mission-result-list">
              {view.result?.missionResults?.map((result) => <article className={result.completed ? 'complete' : ''} key={result.playerId}><span className={result.completed ? 'mission-check' : 'mission-miss'}>{result.completed ? '✓' : '—'}</span><div><small>{result.title}</small><strong>{playerName(result.playerId)}</strong><p>{result.mission}</p></div></article>)}
            </div>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t("DEAL NEW MISSIONS →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE HOST")}</div>}
          </div>
        )}

        {view.phase === 'results' && view.game?.mode === 'fishbowl' && (
          <div className="results-stage charades-results">
            <p className="stage-label">{t("THREE ROUNDS · ONE VERY FAMILIAR BOWL")}</p>
            <h2>{view.result?.fishbowlWinner === 'tie' ? t("Nothing separates the teams.") : t(view.result?.fishbowlWinner === 'blue' ? 'Blue team wins.' : 'Red team wins.')}</h2>
            <div className="charades-score-cards">{(['blue', 'red'] as const).map((team) => <article className={`team-${team} ${view.result?.fishbowlWinner === team ? 'winner' : ''}`} key={team}><small>{t(team === 'blue' ? 'BLUE TEAM' : 'RED TEAM')}</small><strong>{view.teamScores?.[team] ?? 0}</strong><p>{view.teams?.[team].map((id) => playerName(id)).join(' · ')}</p></article>)}</div>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t("WRITE A NEW BOWL →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE HOST")}</div>}
          </div>
        )}
        {view.phase === 'results' && view.game?.mode === 'categories' && (
          <div className="results-stage categories-results">
            <p className="stage-label">{t("LETTER ")}{view.letter} {t(" · THE UNIQUE ANSWERS SCORE")}</p>
            <h2>{(view.result?.winnerIds?.length ?? 0) > 1 ? t("A crowded top spot.") : (view.result?.winnerIds?.length ?? 0) === 1 ? t('{name} found the gaps.', { name: playerName(view.result?.winnerIds?.[0]) }) : t("The room cancelled itself out.")}</h2>
            <p>{t('Categories are checked for the starting letter and repeated answers. The group should agree whether each answer fits its category.')}</p>
            <div className="category-results-list">{view.result?.categoryResults?.map((category, index) => <article key={category.category}><header><b>{index + 1}</b><strong>{category.category}</strong></header><div>{category.entries.map((entry) => <span className={entry.scored ? 'scored' : ''} key={entry.playerId}><b>{playerName(entry.playerId)}</b><em>{entry.answer || '—'}</em><strong>{entry.scored ? '+1' : '0'}</strong>{view.isHost && entry.answer.trim() && <button type="button" disabled={acting} aria-label={t('Review answer by {name}', { name: playerName(entry.playerId) })} onClick={() => sendAction('category-score', { targetId: entry.playerId, value: { categoryIndex: index, scored: !entry.scored } })}>{t(entry.scored ? 'Reject answer' : 'Accept answer')}</button>}</span>)}</div></article>)}</div>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t("NEW LETTER & CATEGORIES →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE NEXT ROUND")}</div>}
          </div>
        )}
        {view.phase === 'results' && view.game?.mode === 'truths' && (
          <div className="results-stage truths-results">
            <p className="stage-label">{view.storytellerName?.toUpperCase()} {t(" REVEALS THE LIE")}</p>
            <h2>{(view.result?.fooledCount ?? 0) > 0 ? t('{count} fell for it.', { count: view.result?.fooledCount }) : t("Nobody bought it.")}</h2>
            <div className="truth-reveal-list">{view.truthStatements?.map((statement, index) => <article className={index === view.result?.truthLieIndex ? 'the-lie' : 'the-truth'} key={statement}><b>{index + 1}</b><div><small>{index === view.result?.truthLieIndex ? t("THE LIE") : t("TRUE")}</small><p>{statement}</p></div><strong>{view.result?.truthTally?.[index] ?? 0} {t(" votes")}</strong></article>)}</div>
            <p className="truth-score-note">{t("Correct voters earn 1 point. ")}{view.storytellerName} {t(" earns ")}{view.result?.fooledCount ?? 0} {t(" for the people they fooled.")}</p>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{view.storyNumber === view.storyTotal ? t("SEE THE FINAL SCORE →") : t("NEXT STORYTELLER →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE NEXT STORY")}</div>}
          </div>
        )}

        {view.phase === 'truths-final' && (
          <div className="results-stage truths-final">
            <p className="stage-label">{t("EVERYONE HAS TAKEN THE HOT SEAT")}</p>
            <h2>{players.filter((player) => player.score === tableHighScore).length > 1 ? t("The table shares the crown.") : t('{name} read the room best.', { name: players.find((player) => player.score === tableHighScore)?.name })}</h2>
            <div className="truth-final-scores">{[...players].sort((a, b) => b.score - a.score).map((player, index) => <article className={player.score === tableHighScore ? 'winner' : ''} key={player.id}><b>{index + 1}</b><strong>{player.name}</strong><span>{player.score} {t(" PTS")}</span></article>)}</div>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t("PLAY ANOTHER LAP →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE HOST")}</div>}
          </div>
        )}
        {view.phase === 'results' && view.game?.mode === 'signal' && (
          <div className="results-stage signal-results">
            <p className="stage-label">{view.result?.signalCorrect ? t("CONNECTION MADE") : t("SIGNAL MISSED")} · {view.receiverName?.toUpperCase()} {t(" RECEIVED")}</p>
            <h2>{view.result?.signalCorrect ? t("Loud and clear.") : t("Lost in translation.")}</h2>
            <div className="signal-answer-compare"><section><small>{t("THE TARGET")}</small><strong>{view.result?.signalTarget}</strong></section><section className={view.result?.signalCorrect ? 'correct' : 'wrong'}><small>{t("THE GUESS")}</small><strong>{view.result?.signalGuess}</strong></section></div>
            <div className="signal-reveal-list">{view.signalClues?.map((clue) => <article className={clue.cancelled ? 'cancelled' : 'survived'} key={clue.playerId}><span>{clue.cancelled ? '×' : '✓'}</span><div><small>{clue.cancelled ? t("CANCELLED ECHO") : t("LIVE SIGNAL")}</small><strong>{clue.clue}</strong></div><b>{playerName(clue.playerId)}</b></article>)}</div>
            <p className="truth-score-note">{t("Lap score: ")}{view.signalCorrectCount}/{view.signalTurnTotal} {t(" connections. A correct guess gives every player 1 shared point.")}</p>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{view.signalTurnNumber === view.signalTurnTotal ? t("SEE THE LAP SCORE →") : t("NEXT RECEIVER →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE NEXT SIGNAL")}</div>}
          </div>
        )}
        {view.phase === 'results' && view.game?.mode === 'writers' && (
          <div className="results-stage writers-results">
            <p className="stage-label">{view.directorName?.toUpperCase()} {t(" CALLED THE SCENE")}</p>
            <h2>{playerName(view.result?.writersWinnerId)} {t(" gets the credit.")}</h2>
            <div className="writers-winning-pitch"><small>{t("THE WINNING PITCH · +2 POINTS")}</small><strong>{view.result?.writersWinningPitch}</strong></div>
            <div className="writers-reveal-grid">{view.writersPitches?.map((pitch, index) => <article className={pitch.playerId === view.result?.writersWinnerId ? 'winner' : ''} key={pitch.playerId}><small>{t("PITCH ")}{String(index + 1).padStart(2, '0')} · {playerName(pitch.playerId)}</small><p>{pitch.pitch}</p></article>)}</div>
            {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{view.writersTurnNumber === view.writersTurnTotal ? t("ROLL THE CREDITS →") : t("NEXT DIRECTOR →")}</button> : <div className="waiting-block"><i /> {t(" WAITING FOR THE NEXT SCENE")}</div>}
          </div>
        )}
      </section>

      <GameRecovery view={view} acting={acting} sendAction={sendAction} />

      <RoomScoreboard data={scoreboard} playerId={view.playerId ?? ""} code={code} compact />
      {view.isHost && <HostControls players={players} active acting={acting} sendAction={sendAction} />}
      {view.nightOutcome && <NightResult outcome={view.nightOutcome} saved={view.nightOutcomeSaved} isHost={view.isHost} acting={acting} finish={() => { void sendAction("end"); }} />}


      {view.game?.mode === 'advocate' ? <aside className="score-strip"><p>{t(view.phase === 'advocate-final' ? 'THE VERDICT IS IN' : 'RATINGS SEALED UNTIL THE FINALE')}</p></aside> : view.game?.mode === 'charades' || view.game?.mode === 'fishbowl' ? <aside className="score-strip charades-score-strip"><p>{t("TEAM SCORE")}</p>{Object.entries(view.teamScores ?? {}).map(([team, score]) => <span key={team}><b>{t(({ blue: 'BLUE TEAM', red: 'RED TEAM', green: 'GREEN TEAM', yellow: 'YELLOW TEAM', purple: 'PURPLE TEAM' } as Record<string, string>)[team] ?? team)}</b><strong>{score}</strong></span>)}</aside> : view.game?.mode === 'signal' ? <aside className="score-strip signal-score-strip"><p>{t("SHARED SIGNAL")}</p><span><b>{t("THIS LAP")}</b><strong>{view.signalCorrectCount ?? 0}/{view.signalTurnTotal ?? players.length}</strong></span><span><b>{t("RECEIVER")}</b><strong>{view.signalTurnNumber ?? 1}/{view.signalTurnTotal ?? players.length}</strong></span></aside> : view.game?.mode === 'relay' ? <aside className="score-strip relay-score-strip"><p>{t("RELAY STATUS")}</p><span><b>{t("PAGE")}</b><strong>{Math.min(view.relayStepNumber ?? 1, view.relayStepTotal ?? 1)}/{view.relayStepTotal ?? 1}</strong></span><span><b>{t("PASSED")}</b><strong>{view.submittedCount ?? 0}/{view.expectedCount ?? players.length}</strong></span></aside> : view.game?.mode === 'night' ? <aside className="score-strip night-score-strip"><p>{t("STATION STATUS")}</p><span><b>{t("STABLE")}</b><strong>{view.nightCrewWins ?? 0}/3</strong></span><span><b>{t("FAILED")}</b><strong>{view.nightSaboteurWins ?? 0}/3</strong></span></aside> : <aside className="score-strip"><p>{t("THIS GAME’S SCORE")}</p>{[...players].sort((a, b) => b.score - a.score).map((player) => <span key={player.id}><b>{player.name}</b><strong>{player.score}</strong></span>)}</aside>}
      {error && <div className="game-toast" role="alert">{error}</div>}
      <dialog ref={earlyRevealDialog} className="host-confirm-dialog" aria-labelledby="early-reveal-title" onClose={() => setEarlyRevealAction(null)}>
        {earlyRevealAction && <><p className="stage-label">{view.submittedCount}/{view.expectedCount} {t(view.phase === 'answering' ? 'ANSWERS RECEIVED' : 'VOTES RECEIVED')}</p><h2 id="early-reveal-title">{t('Reveal without everyone?')}</h2><p>{t(missingVotes === 1 ? '1 player has not responded. Their response will not count in this round.' : '{count} players have not responded. Their responses will not count in this round.', { count: missingVotes })}</p><div><button type="button" autoFocus onClick={() => setEarlyRevealAction(null)}>{t('KEEP WAITING')}</button><button type="button" disabled={acting} onClick={confirmEarlyReveal}>{t('REVEAL ANYWAY →')}</button></div></>}
      </dialog>
    </main>
  );
}
