'use client';

import { browserStorage, joinRequestKey } from '@/lib/browser-storage';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { games } from '@/lib/games';
import { clientRequest } from '@/lib/client-request';
import { createRefreshOrder } from '@/lib/refresh-order';
import { RecoverSeat, HostSeatRecovery } from './SeatRecovery';
import GameHelp from './GameHelp';
import GameSetup from './GameSetup';
import GameTimer from './GameTimer';
import RoomScoreboard from './RoomScoreboard';
import type { RoomStandings } from '@/lib/room-standings';
import HostControls from './HostControls';
import { localizeGameView } from '@/lib/i18n';
import GameBoard, { type GameView } from './GameBoard';
import { useLanguage } from '@/app/LanguageProvider';

type Player = { id: string; name: string; avatarColor: string; isHost: boolean; lastSeen: number; online: boolean };
type RoomData = { hostCanBeReplaced?: boolean; scoreboard: RoomStandings; room: { id: string; code: string; status: string; createdAt: number }; players: Player[] };
type Session = { token: string; playerId: string; name: string };

const playtesterNames = ['Alex', 'Blair', 'Casey', 'Drew', 'Emery', 'Frankie', 'Gray', 'Harper', 'Indigo'];

export default function RoomPage() {
  const { localize, t, locale } = useLanguage();
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = String(params.code ?? '').toUpperCase();
  const storageKey = `house-rules:${code}`;
  const playtestKey = `house-rules-playtest:${code}`;
  const [session, setSession] = useState<Session | null>(null);
  const [primarySession, setPrimarySession] = useState<Session | null>(null);
  const [playtestSessions, setPlaytestSessions] = useState<Session[]>([]);
  const [playtestActing, setPlaytestActing] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [shared, setShared] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [gameView, setGameView] = useState<GameView>({ active: false });
  const [gameError, setGameError] = useState('');
  const [gameActing, setGameActing] = useState(false);
  const actionInFlight = useRef(false);
  const viewEpoch = useRef(0);
  const roomRefreshOrder = useRef(createRefreshOrder());
  const gameRefreshOrder = useRef(createRefreshOrder());
  const localizedGameView = useMemo(() => {
    const translated = localizeGameView(gameView, locale);
    if (gameView.relayStepNumber === 1 && gameView.relaySourceText) translated.relaySourceText = t(gameView.relaySourceText);
    return translated;
  }, [gameView, locale, t]);
  const localizedGames = useMemo(() => localize(games), [localize]);

  const adoptSession = useCallback((nextSession: Session) => {
    const saved = browserStorage.setItem(storageKey, JSON.stringify(nextSession));
    setStorageWarning(!saved);
    viewEpoch.current += 1;
    setGameView({ active: false });
    setGameError('');
    setError('');
    setSession(nextSession);
    setPrimarySession(nextSession);
  }, [storageKey]);

  const refreshRoom = useCallback(async () => {
    const ticket = roomRefreshOrder.current.begin();
    try {
      const response = await clientRequest(`/api/rooms/${code}`, { cache: 'no-store' });
      const result = (await response.json()) as RoomData & { error?: string };
      if (!roomRefreshOrder.current.accept(ticket)) return;
      if (!response.ok) {
        setError(result.error ?? 'This room is unavailable.');
        // A temporary server failure must not unmount the game and erase drafts.
        if (response.status === 404) setRoomData(null);
      } else {
        setRoomData(result);
        setError('');
      }
    } catch {
      if (roomRefreshOrder.current.accept(ticket)) setError('We lost the table for a moment. Trying again…');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    let savedSession: Session | null = null;
    let savedPlaytestSessions: Session[] = [];
    try {
      const saved = browserStorage.getItem(storageKey);
      if (saved) savedSession = JSON.parse(saved) as Session;
      const savedPlaytest = browserStorage.getItem(playtestKey);
      if (savedPlaytest) {
        const parsed = JSON.parse(savedPlaytest) as unknown;
        if (Array.isArray(parsed)) savedPlaytestSessions = parsed.filter((seat): seat is Session => Boolean(seat) && typeof seat === 'object' && typeof seat.token === 'string' && typeof seat.playerId === 'string' && typeof seat.name === 'string');
      }
    } catch {
      browserStorage.removeItem(storageKey);
      browserStorage.removeItem(playtestKey);
    }
    const restoreTimer = window.setTimeout(() => {
      if (savedSession) {
        adoptSession(savedSession);
      }
      setPlaytestSessions(savedPlaytestSessions);
      void refreshRoom();
    });
    return () => window.clearTimeout(restoreTimer);
  }, [adoptSession, playtestKey, refreshRoom, storageKey]);

  useEffect(() => {
    const roomPoll = window.setInterval(() => void refreshRoom(), 3000);
    return () => window.clearInterval(roomPoll);
  }, [refreshRoom]);

  const knownSessions = useMemo(() => {
    const seats = [primarySession, ...playtestSessions, session].filter((seat): seat is Session => Boolean(seat));
    return Array.from(new Map(seats.map((seat) => [seat.playerId, seat])).values());
  }, [playtestSessions, primarySession, session]);

  useEffect(() => {
    if (!knownSessions.length) return;
    const ping = () => Promise.all(knownSessions.map((seat) => clientRequest(`/api/rooms/${code}/presence`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: seat.token }),
    }).catch(() => undefined)));
    void ping();
    const presencePoll = window.setInterval(() => void ping(), 9000);
    return () => window.clearInterval(presencePoll);
  }, [code, knownSessions]);

  const me = useMemo(() => roomData?.players.find((player) => player.id === session?.playerId), [roomData, session]);

  const refreshGame = useCallback(async () => {
    if (!session || actionInFlight.current) return;
    const epoch = viewEpoch.current;
    const ticket = gameRefreshOrder.current.begin();
    try {
      const response = await clientRequest(`/api/rooms/${code}/game`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view', token: session.token }),
      });
      const result = await response.json() as GameView & { error?: string };
      if (epoch !== viewEpoch.current || actionInFlight.current || !gameRefreshOrder.current.accept(ticket)) return;
      if (response.ok) { setGameView(result as GameView); setGameError((current) => current === 'Connection lost for a moment. Try again.' ? '' : current); }
      else if (response.status === 401) {
        // Another tab may already have saved the replacement credential.
        setSession(null); setPrimarySession(null); setPlaytestSessions([]); setGameView({ active: false });
        setError('Your seat moved to another phone. Ask the host if you need to reconnect.');
      } else setGameError(result.error ?? 'Could not refresh the game.');
    } catch {
      if (epoch === viewEpoch.current && gameRefreshOrder.current.accept(ticket)) setGameError('Connection lost for a moment. Try again.');
    }
  }, [code, session]);

  useEffect(() => {
    if (!session) return;
    const initial = window.setTimeout(() => void refreshGame(), 0);
    const gamePoll = window.setInterval(() => void refreshGame(), 1800);
    return () => { viewEpoch.current += 1; window.clearTimeout(initial); window.clearInterval(gamePoll); };
  }, [refreshGame, session]);

  useEffect(() => {
    const resume = () => { if (document.visibilityState === 'visible') { void refreshRoom(); void refreshGame(); } };
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    return () => { window.removeEventListener('online', resume); document.removeEventListener('visibilitychange', resume); };
  }, [refreshRoom, refreshGame]);

  async function sendGameAction(action: string, payload: Record<string, unknown> = {}) {
    if (!session || actionInFlight.current) return false;
    actionInFlight.current = true;
    const epoch = ++viewEpoch.current;
    setGameActing(true);
    setGameError('');
    let refreshAfterAction = false;
    try {
      const response = await clientRequest(`/api/rooms/${code}/game`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, token: session.token, gameId: gameView.gameId ?? null, version: gameView.version, ...payload }),
      });
      const result = (await response.json()) as GameView & { error?: string };
      if (epoch !== viewEpoch.current) return false;
      if (!response.ok) {
        refreshAfterAction = response.status === 409 || response.status === 401;
        setGameError(result.error ?? 'That move did not go through.');
        return false;
      }
      setGameView(result);
      // Scores and roster refresh independently; timed play can continue now.
      void refreshRoom();
      return true;
    } catch {
      refreshAfterAction = true;
      setGameError('Connection lost for a moment. Try again.');
      return false;
    } finally {
      actionInFlight.current = false;
      setGameActing(false);
      if (refreshAfterAction) void refreshGame();
    }
  }

  async function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2) return;
    setJoining(true);
    setError('');
    try {
      const response = await clientRequest(`/api/rooms/${code}/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, requestKey: joinRequestKey(code, name) }),
      });
      const result = (await response.json()) as Session & { code?: string; error?: string };
      if (!response.ok) {
        setError(result.error ?? 'Could not join the room.');
        return;
      }
      const nextSession = { token: result.token, playerId: result.playerId, name: name.trim() };
      adoptSession(nextSession);
      await refreshRoom();
    } catch {
      setError('Could not join the room. Try once more.');
    } finally {
      setJoining(false);
    }
  }

  async function shareRoom() {
    const roomUrl = new URL(`/room/${code}`, window.location.origin).href;
    const shareData = { title: t('Join my House Rules room'), text: t('Join game night with code {code}', { code }), url: roomUrl };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(roomUrl);
      else {
        window.prompt(t('Copy this room link:'), roomUrl);
        return;
      }
      setShared(true);
      window.setTimeout(() => setShared(false), 2200);
    } catch (error) {
      // Plain HTTP Wi-Fi addresses may not support native sharing or clipboard.
      // Cancelling the native sheet should still do nothing.
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        window.prompt(t('Copy this room link:'), roomUrl);
      }
    }
  }

  function savePlaytestSessions(seats: Session[]) {
    const uniqueSeats = Array.from(new Map(seats.map((seat) => [seat.playerId, seat])).values());
    browserStorage.setItem(playtestKey, JSON.stringify(uniqueSeats));
    setPlaytestSessions(uniqueSeats);
    return uniqueSeats;
  }

  async function addPlaytestSeats(target: 5 | 10) {
    if (!primarySession || !me?.isHost || !roomData || roomData.players.length >= target) return;
    setPlaytestActing(true);
    setGameError('');
    let seats = [...playtestSessions];
    try {
      const takenNames = new Set(roomData.players.map((player) => player.name.toLocaleLowerCase()));
      const needed = target - roomData.players.length;
      for (let index = 0; index < needed; index += 1) {
        const baseName = playtesterNames.find((candidate) => !takenNames.has(candidate.toLocaleLowerCase())) ?? `Test ${seats.length + index + 1}`;
        takenNames.add(baseName.toLocaleLowerCase());
        const response = await clientRequest(`/api/rooms/${code}/join`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: baseName, requestKey: joinRequestKey(code, baseName) }),
        });
        const result = (await response.json()) as Session & { error?: string };
        if (!response.ok) throw new Error(result.error ?? 'A simulated phone could not join.');
        seats = savePlaytestSessions([...seats, { token: result.token, playerId: result.playerId, name: baseName }]);
      }
      await refreshRoom();
    } catch (cause) {
      setGameError(cause instanceof Error ? cause.message : 'Could not add the simulated phones.');
    } finally {
      setPlaytestActing(false);
    }
  }

  async function clearPlaytestSeats() {
    if (!primarySession || !playtestSessions.length) return;
    setPlaytestActing(true);
    setGameError('');
    try {
      const response = await clientRequest(`/api/rooms/${code}/game`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove-playtesters', token: primarySession.token, value: playtestSessions.map((seat) => seat.playerId) }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Could not clear the simulated phones.');
      browserStorage.removeItem(playtestKey);
      setPlaytestSessions([]);
      setSession(primarySession);
      setGameView({ active: false });
      await refreshRoom();
    } catch (cause) {
      setGameError(cause instanceof Error ? cause.message : 'Could not clear the simulated phones.');
    } finally {
      setPlaytestActing(false);
    }
  }

  function switchPlaytestSeat(playerId: string) {
    const nextSession = knownSessions.find((seat) => seat.playerId === playerId);
    if (!nextSession || nextSession.playerId === session?.playerId) return;
    viewEpoch.current += 1;
    setGameError('');
    setGameView({ active: false });
    setSession(nextSession);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }

  if (loading) {
    return <main data-i18n-managed="true" className="room-shell room-loading"><span className="logo-mark" aria-hidden="true"><i /><i /><i /></span><p>{t("SETTING THE TABLE…")}</p></main>;
  }

  if (!roomData) {
    return (
      <main data-i18n-managed="true" className="room-shell room-error">
        <a className="wordmark" href="/"><span className="logo-mark" aria-hidden="true"><i /><i /><i /></span> {t(" HOUSE RULES")}</a>
        <div><p className="eyebrow"><span /> {t(" ROOM ")}{code}</p><h1>{t("That table")}<br /><em>{t("isn't here.")}</em></h1><p>{t(error)}</p><button onClick={() => router.push('/')}>{t("BACK TO THE FRONT DOOR")}</button></div>
      </main>
    );
  }

  if (!session || !me) {
    return (
      <main data-i18n-managed="true" className="join-room-shell">
        <section className="join-room-brand">
          <a className="wordmark light" href="/"><span className="logo-mark" aria-hidden="true"><i /><i /><i /></span> {t(" HOUSE RULES")}</a>
          <div><p>{t("YOU'VE BEEN INVITED TO")}</p><h1>{t("Room")}<br /><em>{code}</em></h1><small>{roomData.players.length} {roomData.players.length === 1 ? t("player is") : t("players are")} {t(" waiting")}</small></div>
        </section>
        <section className="join-room-form">
          <p className="eyebrow"><span /> {t(" PULL UP A CHAIR")}</p>
          <h2>{t("What should we call you?")}</h2>
          <p>{t("This name is only used in tonight's room.")}</p>
          <form onSubmit={joinRoom}>
            <label htmlFor="player-name">{t("YOUR NAME")}</label>
            <input id="player-name" value={name} onChange={(event) => setName(event.target.value.slice(0, 24))} placeholder={t("e.g. Player 2")} autoFocus autoComplete="name" />
            <button type="submit" disabled={joining || name.trim().length < 2}>{joining ? t("JOINING…") : t("JOIN THE ROOM →")}</button>
          </form>
          {error && <p className="join-error" role="alert">{t(error)}</p>}
          <RecoverSeat code={code} players={roomData.players} onRecovered={adoptSession} />
        </section>
      </main>
    );
  }

  const playtestSwitcher = playtestSessions.length > 0 && primarySession ? (
    <aside data-i18n-managed="true" className="playtest-switcher" aria-label={t("Solo playtest phone switcher")}>
      <div><strong>{t("SOLO PLAYTEST")}</strong><span>{t("You are controlling one phone at a time.")}</span></div>
      <label><span>{t("VIEW PHONE")}</span><select value={session.playerId} onChange={(event) => switchPlaytestSeat(event.target.value)}>{knownSessions.map((seat) => <option value={seat.playerId} key={seat.playerId}>{seat.playerId === primarySession.playerId ? t('{name} (host)', { name: seat.name }) : seat.name}</option>)}</select></label>
    </aside>
  ) : null;

  const canTakeOver = !me.isHost && !gameView.watching && roomData.hostCanBeReplaced;
  const connectionControls = <>
    {storageWarning && <p className="connection-notice" role="status">{t('This browser cannot save your seat. Keep this tab open. If it closes, the host can restore your seat.')}</p>}
    {me.isHost && <HostSeatRecovery code={code} token={session.token} />}
    {error && <p className="connection-notice" role="status">{t(error)}</p>}
    {canTakeOver && <aside className="host-takeover" data-i18n-managed="true">
      <p>{t('The host has been offline for a minute. You can take over and keep playing.')}</p>
      <button type="button" disabled={gameActing} onClick={() => sendGameAction('claim-host')}>{t('Take over hosting')}</button>
    </aside>}
  </>;

  const gameTimer = <GameTimer gameId={gameView.gameId ?? code} phase={gameView.phase ?? 'lobby'} deadline={gameView.briefingEndsAt ?? gameView.turnEndsAt ?? gameView.categoriesEndsAt ?? null} label={gameView.briefingEndsAt ? t('Read and remember') : gameView.phase === 'advocate-challenge' ? t('Questions and rebuttals') : gameView.phase === 'advocate-defense' ? t('Opening defense') : t('Time remaining')} />;
  if (gameView.active) {
    return <div className={playtestSwitcher ? 'playtest-mode' : ''}>{gameTimer}{playtestSwitcher}{connectionControls}<GameBoard key={`${gameView.gameId}-${gameView.game?.slug}-${gameView.round}-${gameView.phase}-${gameView.currentPlayerId}-${gameView.nightProposalAttempt}-${gameView.nightLeaderId}-${session.playerId}`} code={code} scoreboard={roomData.scoreboard} view={localizedGameView} error={t(gameError)} acting={gameActing} sendAction={sendGameAction} /></div>;
  }

  return (
    <div className={playtestSwitcher ? 'playtest-mode' : ''}>
    {gameTimer}
    {playtestSwitcher}
    {connectionControls}
    <main data-i18n-managed="true" className="lobby-shell">
      <header className="lobby-nav">
        <a className="wordmark" href="/"><span className="logo-mark" aria-hidden="true"><i /><i /><i /></span> {t(" HOUSE RULES")}</a>
        <div><span className="you-are">{t("YOU'RE ")}{me.name.toUpperCase()}</span><button onClick={() => router.push('/')} type="button">{t("EXIT")}</button></div>
      </header>

      <section className="lobby-top">
        <div className="lobby-title">
          <p className="eyebrow"><span /> {me.isHost ? t("YOU SET THE RULES TONIGHT") : t("THE HOST IS SETTING THE TABLE")}</p>
          <h1>{t("Room ")}<em>{code}</em></h1>
        </div>
        <div className="invite-panel">
          <p>{t("INVITE THE REST OF THE TABLE")}</p>
          <strong>{code}</strong>
          <button type="button" onClick={shareRoom}>{shared ? t("LINK COPIED ✓") : t("SHARE INVITE ↗")}</button>
        </div>
      </section>

      <section className="lobby-content">
        <div className="choose-panel" id="game-picker">
          <div className="section-heading"><p>{t("CHOOSE A GAME")}</p><span>{t("{count} at the table", { count: roomData.players.length })}</span></div>
          <div className="lobby-games">
            {localizedGames.map((game, index) => (
              <article className={`lobby-game game-${game.color}`} key={game.slug}>
                <span>{String(index + 1).padStart(2, '0')}</span><p>{game.eyebrow}</p><h2>{game.title}</h2><small>{game.players} {t(" PLAYERS · ")}{game.duration}</small>
                <GameSetup slug={game.slug} host={me.isHost} disabled={!me.isHost || !game.available || gameActing || roomData.players.length < game.minPlayers || roomData.players.length > game.maxPlayers}
                  onStart={settings => { void sendGameAction('start', { slug: game.slug, settings }); }}
                  label={!game.available ? t('COMING SOON') : roomData.players.length < game.minPlayers ? t('Needs {count} players', { count: game.minPlayers }) : roomData.players.length > game.maxPlayers ? t('Maximum {count} players', { count: game.maxPlayers }) : me.isHost ? t('START GAME →') : t('HOST CHOOSES')} />
                <GameHelp slug={game.slug} />
              </article>
            ))}
          </div>
          <p className="host-note">{gameError ? t(gameError) : t(me.isHost ? 'Pick a game when everyone is at the table. Every phone will move into the round together.' : 'Hang tight—the host will choose the game for everyone.')}</p>
        </div>

        <div className="players-panel">
          <div className="section-heading"><p>{t("AT THE TABLE")}</p><span>{roomData.players.length}/12</span></div>
          <div className="player-list">
            {roomData.players.map((player, index) => {
              const online = player.online;
              const isPlaytester = playtestSessions.some((seat) => seat.playerId === player.id);
              return (
                <article className={online ? '' : 'away'} key={player.id}>
                  <span className={`player-avatar avatar-${player.avatarColor}`}>{player.name.slice(0, 2).toUpperCase()}</span>
                  <div><strong>{player.name}{player.id === me.id ? t(" (you)") : ''}</strong><small>{player.isHost ? t("HOST") : isPlaytester ? t("SIMULATED PHONE") : online ? t('PLAYER {number}', { number: index + 1 }) : t("RECONNECTING")}</small></div>
                  <i title={online ? t("Connected") : t("Reconnecting")} />
                </article>
              );
            })}
            <article className="empty-seat"><span>+</span><div><strong>{t("Empty seat")}</strong><small>{t("SHARE THE CODE")}</small></div></article>
          </div>
          {me.isHost && <HostControls players={roomData.players} active={false} acting={gameActing} sendAction={sendGameAction} />}
          {me.isHost && <details className="solo-playtest-panel">
            <summary>{t("Testing by yourself?")}</summary>
            <p>{t("TESTING BY YOURSELF?")}</p>
            <h2>{t("Borrow a few phones.")}</h2>
            <span>{t("Add simulated players, start any game, then use the phone switcher to take each turn yourself.")}</span>
            <div>
              <button type="button" disabled={playtestActing || roomData.players.length >= 5} onClick={() => addPlaytestSeats(5)}>{roomData.players.length >= 5 ? t("READY FOR EVERY GAME ✓") : t("FILL TO 5 PLAYERS")}</button>
              <button type="button" disabled={playtestActing || roomData.players.length >= 10} onClick={() => addPlaytestSeats(10)}>{t("FILL TO 10")}</button>
            </div>
            {playtestSessions.length > 0 && <button className="clear-playtesters" type="button" disabled={playtestActing} onClick={clearPlaytestSeats}>{t("CLEAR SIMULATED PLAYERS")}</button>}
          </details>}
        </div>
      </section>
      <RoomScoreboard data={roomData.scoreboard} playerId={session.playerId} code={code} compact />
    </main>
    </div>
  );
}
