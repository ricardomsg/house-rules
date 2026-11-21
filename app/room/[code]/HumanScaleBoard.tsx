'use client';

import { useState } from 'react';
import { useLanguage } from '@/app/LanguageProvider';
import { useGameDraft } from '@/lib/hooks/use-game-draft';
import { validateHumanScaleOrder, type HumanScaleOrderResult } from '@/lib/human-scale-flow';
import type { GameView } from './GameBoard';

export type HumanScaleView = GameView & {
  ownOrder?: string[];
  submissionStatus?: Array<{ playerId: string; submitted: boolean }>;
  result?: GameView['result'] & { lineupResults?: HumanScaleOrderResult[] };
};
type Props = {
  code: string;
  view: HumanScaleView;
  acting: boolean;
  sendAction: (action: string, payload?: Record<string, unknown>) => Promise<boolean>;
};

export default function HumanScaleBoard(props: Props) {
  // A new round must start with a fresh private reveal and correctly scoped draft.
  return <HumanScaleRound key={`${props.view.gameId}:${props.view.round}`} {...props} />;
}

function HumanScaleRound({ code, view, acting, sendAction }: Props) {
  const { t } = useLanguage();
  const [revealed, setRevealed] = useState(false);
  const players = view.players ?? [];
  const ids = players.map(player => player.id);
  const [draft, setDraft] = useGameDraft<string[]>(`${code}:${view.playerId}`, `${view.gameId}:${view.round}`, 'humanScaleOrder', view.ownOrder ?? ids);
  const order = validateHumanScaleOrder(draft, ids) ?? view.ownOrder ?? ids;
  const playerName = (id: string) => players.find(player => player.id === id)?.name ?? t('Unknown player');
  const move = (index: number, direction: number) => {
    const next = [...order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setDraft(next);
  };
  const totalPairs = players.length * (players.length - 1) / 2;
  const statuses = view.submissionStatus ?? players.map(player => ({ playerId: player.id, submitted: player.id === view.playerId && Boolean(view.hasSubmitted) }));
  const ownResult = view.result?.lineupResults?.find(result => result.playerId === view.playerId);

  return <section className="lineup-stage" data-i18n-managed>
    <p className="stage-label">{t('HUMAN SCALE')}</p>
    <h2>{view.scale?.topic}</h2>
    <div className="lineup-endpoints"><span>{view.scale?.left}</span><span>{view.scale?.right}</span></div>
    {view.phase !== 'results' ? <>
      <p>{t('Give one example that fits your secret position. Listen to everyone, then privately order the whole group from left to right. Include yourself.')}</p>
      <p>{t('Never say your number. Each correctly ordered pair earns one point, even if neither player is in the exact slot.')}</p>
      {!view.watching && <section className="private-prompt" style={{ marginBlock: '1rem' }}>
        <button type="button" className="private-hide-button" aria-expanded={revealed} onClick={() => setRevealed(!revealed)}>{revealed ? t('HIDE MY POSITION ↑') : t('REVEAL MY POSITION')}</button>
        {revealed && <p><strong style={{ fontSize: '2rem' }}>{view.targetPosition}</strong> {t('OF {total}', { total: view.positionCount ?? players.length })}</p>}
      </section>}
      {view.phase === 'briefing' ? <><p>{t('Read your position and give your example. The host can open the private ordering.')}</p>{view.isHost && <button type="button" className="stage-action" disabled={acting} onClick={() => sendAction('advance')}>{t('OPEN PRIVATE ORDERING →')}</button>}</> : <>
        <h3>{t('YOUR PRIVATE ORDER')}</h3>
        <p>{t('Top means the left end of the scale. Move players with the arrows; nobody else sees your draft.')}</p>
        <ol style={{ padding: 0, listStyle: 'none', display: 'grid', gap: '.5rem' }}>
          {order.map((id, index) => <li key={id} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.5rem', border: '1px solid currentColor', borderRadius: '.5rem' }}>
            <span style={{ flex: 1 }}><b>{index + 1}.</b> <span translate="no">{playerName(id)}</span></span>
            {!view.hasSubmitted && !view.watching && <>
              <button type="button" style={{ minWidth: 44, minHeight: 44 }} disabled={acting || index === 0} aria-label={t('Move {name} toward the left end', { name: playerName(id) })} onClick={() => move(index, -1)}>↑</button>
              <button type="button" style={{ minWidth: 44, minHeight: 44 }} disabled={acting || index === order.length - 1} aria-label={t('Move {name} toward the right end', { name: playerName(id) })} onClick={() => move(index, 1)}>↓</button>
            </>}
          </li>)}
        </ol>
        {!view.watching && (view.hasSubmitted ? <p role="status">{t('ORDER SEALED. The reveal starts when everyone has submitted.')}</p> : <button type="button" className="stage-action" disabled={acting || order.length !== players.length} onClick={() => sendAction('order', { value: order })}>{t('SEAL MY ORDER →')}</button>)}
        <h3>{t('WHO HAS SUBMITTED')}</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>{statuses.map(status => <li key={status.playerId}><span translate="no">{playerName(status.playerId)}</span> · {status.submitted ? t('Ready ✓') : t('Still ordering')}</li>)}</ul>
        <p>{t('{submitted} of {total} orders sealed', { submitted: view.submittedCount ?? 0, total: view.expectedCount ?? players.length })}</p>
      </>}
    </> : <>
      <h3>{t('THE TRUE SCALE')}</h3>
      <ol>{view.result?.actualOrder?.map(id => <li key={id} translate="no">{playerName(id)}</li>)}</ol>
      {ownResult ? <p><strong>{t('{correct} of {total} pairs correct', { correct: ownResult.correctPairs, total: ownResult.totalPairs })}</strong></p> : !view.watching && <p>{t('No order submitted this round: 0 points.')}</p>}
      <p>{t('Every pair counts once. Maximum this round: {total} points.', { total: totalPairs })}</p>
      <div style={{ display: 'grid', gap: '.75rem' }}>{players.map(player => {
        const result = view.result?.lineupResults?.find(entry => entry.playerId === player.id);
        return <details key={player.id} style={{ border: '1px solid currentColor', borderRadius: '.5rem', padding: '.75rem' }}>
          <summary><span translate="no">{player.name}</span> · {result ? t('{correct} of {total} pairs correct', { correct: result.correctPairs, total: result.totalPairs }) : t('No order submitted')}</summary>
          {result && <ol>{result.order.map(id => <li key={id} translate="no">{playerName(id)}</li>)}</ol>}
        </details>;
      })}</div>
      {view.isHost ? <button type="button" className="stage-action" disabled={acting} onClick={() => sendAction('advance')}>{t('NEXT SCALE →')}</button> : <p>{t('WAITING FOR THE NEXT ROUND')}</p>}
    </>}
  </section>;
}
