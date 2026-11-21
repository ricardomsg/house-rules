'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/app/LanguageProvider';
import { getGame } from '@/lib/games';
import type { RoomStandings, NightOutcome } from '@/lib/room-standings';

export function NightResult({ outcome, saved, isHost, acting, finish }: { outcome: NightOutcome; saved?: boolean; isHost?: boolean; acting: boolean; finish: () => void }) {
  const { t } = useLanguage();
  return <section className="night-result" aria-label={t('Night points')}>
    <span className="night-result-star" aria-hidden="true">✦</span>
    <div><p className="night-kicker">{saved ? t('ADDED TO THE NIGHT') : t('MAKE THIS ONE COUNT')}</p>
      <h2>{outcome.kind === 'creative' ? t('A story for the table.') : outcome.kind === 'cooperative' ? t('Better together.') : t('One game. More bragging rights.')}</h2>
      <p>{saved ? t('This result is saved. Your night points stay when you change games.') : t('Play another round to build this game’s score, or finish now to save the result to the night standings.')}</p>
      <small>{t(outcome.kind === 'creative' ? 'Everyone earns 1 night point. This game has no winner.' : '1 point for finishing · +2 for a win or shared achievement')}</small>
    </div>
    {isHost ? <button type="button" disabled={acting} onClick={finish}>{t('FINISH & CHOOSE NEXT GAME →')}</button> : <span>{t('The host chooses what comes next.')}</span>}
  </section>;
}

export default function RoomScoreboard({ data, playerId, code, compact = false }: { data?: RoomStandings; playerId: string; code: string; compact?: boolean }) {
  const { t } = useLanguage();
  const [celebration, setCelebration] = useState<{ points: number; won: boolean } | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const rows = data?.standings ?? [];
  const latest = data?.recent[0];
  const latestId = latest?.id;
  const award = latest?.awards.find(a => a.playerId === playerId);
  const earned = award?.points;
  const won = award?.won;
  useEffect(() => {
    if (!latestId) return;
    const key = `house-rules-celebrated:${code}:${playerId}`;
    try {
      if (sessionStorage.getItem(key) === latestId) return;
    } catch { /* Celebrations are optional when browser storage is unavailable. */ }
    if (earned === undefined) return;
    const frame = requestAnimationFrame(() => {
      try { sessionStorage.setItem(key, latestId); } catch { /* Optional celebration preference. */ }
      setCelebration({ points: earned, won: Boolean(won) });
    });
    const timer = window.setTimeout(() => setCelebration(null), 4500);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [latestId, earned, won, code, playerId]); // The ledger ID is stable across polls.
  const me = rows.find(row => row.id === playerId);
  const above = me && rows.filter(row => row.points > me.points).at(-1);
  return <section className={`night-board ${compact ? 'night-board-compact' : ''}`} data-i18n-managed="true" aria-label={t('Night standings')}>
    <header><div><p className="night-kicker">{t('THE NIGHT BELONGS TO EVERYONE')}</p><h2>{t('Night standings')}<span>✦</span></h2></div>
      <div className="night-heading-actions">{!compact && <a href="#game-picker">{t("NEXT GAME ↓")}</a>}<button className="night-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? t('Collapse standings') : t('Show standings')} {expanded ? '−' : '+'}</button></div>
    </header>
    <div className="night-stats"><span><strong>{data?.gamesPlayed ?? 0}</strong> {t(data?.gamesPlayed === 1 ? 'game finished' : 'games finished')}</span><span><strong>{me?.points ?? 0}</strong> {t(me?.points === 1 ? 'your night point' : 'your night points')}</span>{me && me.played > 0 && <span><strong>#{me.rank}</strong> {t('your place')}</span>}</div>
    {celebration && <div className="night-celebration" role="status"><span aria-hidden="true">✦</span><strong>+{celebration.points}</strong><p>{celebration.won ? t('An achievement worth remembering!') : t('Another game in the story.')}</p><button type="button" onClick={() => setCelebration(null)} aria-label={t('Close celebration')}>×</button></div>}
    {expanded && <>
      {!data?.gamesPlayed && <p className="night-empty">{t('Every great night starts at zero. Finish your first game to put this board in motion.')}</p>}
      <ol className="night-ranking">{rows.map(row => <li key={row.id} className={`${row.id === playerId ? 'night-you' : ''} ${row.rank === 1 && row.points > 0 ? 'night-leader' : ''}`}>
        <span className="night-rank">{row.points > 0 ? row.rank === 1 ? '♛' : `#${row.rank}` : '—'}</span>
        <span className={`player-avatar avatar-${row.avatarColor}`}>{row.name.slice(0,2).toUpperCase()}</span>
        <div className="night-name"><strong>{row.name}{row.id === playerId && <small>{t('(you)')}</small>}</strong><span>{row.wins} {t(row.wins === 1 ? 'win / achievement' : 'wins / achievements')} · {row.played} {t(row.played === 1 ? 'game' : 'games')}{!row.present && ` · ${t('left the table')}`}</span></div>
        <strong className="night-points" key={`${row.id}:${row.points}`}>{row.points}<small>{t('PTS')}</small></strong>
      </li>)}</ol>
      {above && me && <p className="night-chase">{t(above.points - me.points === 1 ? 'One more point to draw level with {name}.' : '{points} more points to draw level with {name}.', { points: above.points - me.points, name: above.name })}</p>}
      <details className="night-rules"><summary>{t('How night points work')}</summary><p>{t('Each finished game earns 1 night point. Winners earn 2 extra; tied winners share the bonus. A game’s own score stays separate, so a high-scoring game cannot overwhelm the night.')}</p><p>{t('Extra rounds of the same game build one combined result until the host finishes it. Complete team games and full laps save automatically. Unfinished games earn nothing; restarting preserves any already completed result.')}</p><p>{t('Human Scale rewards a successful round, Secret Settlers rewards completed missions, and Signal Lost rewards everyone when at least half the targets are guessed. Doodle Relay gives everyone 1 participation point, with no winner.')}</p><p>{t('Standings stay in this room across games and reconnects. Keep your room link and use the same browser to keep your seat. A new room starts a new night.')}</p><p>{t('A zero-score tie earns participation points only.')}</p><p>{t('Equal points are ordered by wins; equal points and wins share a place. Leaving the room does not erase saved results.')}</p></details>
      {Boolean(data?.recent.length) && <div className="night-history"><h3>{t('Tonight’s stories')}</h3>{data!.recent.map(result => {
        const winners = result.awards.filter(a => a.won).map(a => result.players.find(p => p.id === a.playerId)?.name).filter(Boolean);
        return <article key={result.id}><div><strong>{t(getGame(result.slug)?.title ?? result.slug)}</strong><span>{result.kind === 'creative' ? t('A shared story') : winners.length ? `${t('Victory / achievement')}: ${winners.join(', ')}` : t('Everyone added a game to the night.')}</span></div><details><summary>{t('View points')}</summary>{result.awards.map(award => <p key={award.playerId}><span>{result.players.find(p => p.id === award.playerId)?.name}</span><span>{result.kind !== 'creative' && <>{award.score} {t('game points')} · </>}<b>+{award.points}</b> {t(award.points === 1 ? 'night point' : 'night points')}</span></p>)}</details></article>;
      })}</div>}
    </>}
  </section>;
}
