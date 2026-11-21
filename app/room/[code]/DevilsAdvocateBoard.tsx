'use client';

import { useState } from 'react';
import { useLanguage } from '@/app/LanguageProvider';
import type { GameView } from './GameBoard';

type Props = {
  view: GameView;
  remainingSeconds: number;
  acting: boolean;
  sendAction: (action: string, payload?: Record<string, unknown>) => Promise<boolean>;
};

export default function DevilsAdvocateBoard({ view, remainingSeconds, acting, sendAction }: Props) {
  const { t } = useLanguage();
  const [rating, setRating] = useState<number | null>(null);
  const speaker = view.currentPlayerId === view.playerId;
  const players = view.players ?? [];
  const name = (id: string) => players.find(player => player.id === id)?.name;
  const allRated = view.submittedCount === view.expectedCount;
  const final = view.phase === 'advocate-final';
  const results = view.advocateResults ?? [];
  const winners = results.filter(result => result.winner);
  const losers = results.filter(result => result.loser);

  if (final) return <div className="advocate-final">
    <p className="stage-label">{t('THE VERDICT IS IN')}</p>
    <h2>{t('Every terrible take. Every secret score.')}</h2>
    <div className="advocate-verdicts">
      <article><small>{winners.length === players.length ? t('EVERYONE TIED') : t('WINNER')}</small><strong>{winners.length ? winners.map(result => name(result.playerId)).join(' · ') : t('No ratings this time')}</strong><p>{t('A terrifying talent for bullshit.')}</p></article>
      {losers.length > 0 && <article><small>{t('LOSER')}</small><strong>{losers.map(result => name(result.playerId)).join(' · ')}</strong><p>{t('Even the devil wants a refund.')}</p></article>}
    </div>
    <ol className="advocate-leaderboard" aria-label={t('Final ratings leaderboard')}>
      {results.map(result => <li key={result.playerId} className={result.winner ? 'winner' : ''}>
        <b>{result.rank}</b><div><strong>{name(result.playerId)}</strong><p>{result.statement}</p></div><span>{result.ratingCount === 0 ? '—' : result.average.toFixed(2)}<small>{result.ratingCount === 0 ? t('Unrated') : '/ 10'}</small></span>
      </li>)}
    </ol>
    <p>{t('Average of the ratings received. Missing ratings do not count. Equal scores share a rank.')}</p>
    {view.isHost && <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t('DEAL MORE BAD OPINIONS →')}</button>}
  </div>;

  return <div className="advocate-stage">
    {(view.phase === 'advocate-defense' || view.phase === 'advocate-challenge') && <div className="advocate-live-timer">
      <strong>{view.currentPlayerName}</strong>
      <div className={`advocate-clock ${remainingSeconds <= 10 ? 'urgent' : ''}`} role="timer" aria-label={t('Seconds remaining')}>{remainingSeconds}<small>{t('SECONDS LEFT')}</small></div>
      <progress max={view.phase === 'advocate-challenge' ? view.challengeSeconds ?? 60 : view.defenseSeconds ?? 60} value={remainingSeconds} aria-label={t('Defense time remaining')} />
    </div>}
    <section className="advocate-claim">
      <p className="stage-label">{t('DEFENSE {number} OF {total}', { number: view.round, total: players.length })}</p>
      <div className="advocate-speaker"><small>{t('ON THE STAND')}</small><strong>{view.currentPlayerName}</strong></div>
      {view.phase === 'advocate-ready' ? <>
        <h2>{speaker ? t('Your hill to die on is ready.') : t('{name} is about to make this worse.', { name: view.currentPlayerName })}</h2>
        <p>{t('The statement appears when the clock starts. You have {seconds} seconds to make your case.', { seconds: view.defenseSeconds ?? 60 })}</p>
        <span className="advocate-seal">{t('{seconds} SECONDS. ZERO SHAME.', { seconds: view.defenseSeconds ?? 60 })}</span>
      </> : <>
        <small>{t('DEFEND THIS AS TRUE')}</small><h2>{view.advocateStatement}</h2>
        <p>{view.phase === 'advocate-challenge' ? t('Challenge the argument, one person at a time. The speaker answers and defends their case.') : t('Commit to the bit. Logic, charisma, outrageous bullshit: make your case out loud.')}</p>
      </>}
    </section>
    <section className="advocate-controls">
      {view.phase === 'advocate-ready' && <>
        <p className="stage-label">{t('THE RULES OF ENGAGEMENT')}</p>
        <h3>{t('A bad opinion. A good argument.')}</h3>
        <p>{t('Everyone speaks once. Everyone else rates the argument from 1 to 10. All scores stay sealed until the last defense.')}</p>
        <p>{t('The deck mixes silly absurdity, filthy language, and very dark humour.')}</p>
        {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t('REVEAL & START THE TIMER →')}</button> : <div className="waiting-block"><i />{t('WAITING FOR THE HOST')}</div>}
      </>}
      {(view.phase === 'advocate-defense' || view.phase === 'advocate-challenge') && <>
        <p className="stage-label">{speaker ? t('MAKE YOUR CASE') : t('HEAR THEM OUT')}</p>
        <p>{view.phase === 'advocate-challenge' ? t('Questions and rebuttals') : view.challengeSeconds ? t('Questions and rebuttals follow this opening defense.') : t('Rate the defense after the timer ends. Let the speaker cook.')}</p>
      </>}
      {view.phase === 'advocate-rating' && <>
        <p className="stage-label">{t('THE JURY DECIDES')}</p>
        <h3>{speaker ? t('Your fate is in their phones.') : t('How good was that defense?')}</h3>
        {speaker ? <p>{t('You cannot rate yourself. Everyone else is submitting a secret score.')}</p> : view.hasSubmitted ? <div className="advocate-locked"><strong>{t('RATING SEALED ✓')}</strong><p>{t('Your rating: {rating}/10. Only you can see this.', { rating: view.ownRating })}</p></div> : <>
          <p>{t('Judge the argument, delivery, and commitment. Not whether you agree.')}</p>
          <div className="advocate-ratings" role="group" aria-label={t('Rate the defense from 1 to 10')}>{Array.from({ length: 10 }, (_, index) => index + 1).map(value => <button type="button" aria-pressed={rating === value} className={rating === value ? 'selected' : ''} key={value} disabled={acting} onClick={() => setRating(value)}>{value}</button>)}</div>
          <div className="advocate-rating-labels"><span>{t('1 · Train wreck')}</span><span>{t('10 · Horribly convincing')}</span></div>
          <button className="stage-action" type="button" disabled={acting || rating === null} onClick={() => sendAction('advocate-rate', { value: rating })}>{t('SEAL MY RATING →')}</button>
        </>}
        <p aria-live="polite">{t('{count}/{total} secret ratings received.', { count: view.submittedCount, total: view.expectedCount })}</p>
        {view.isHost && <button className="stage-action" type="button" disabled={acting || !allRated} onClick={() => sendAction('advance')}>{view.round === players.length ? t('REVEAL THE FINAL VERDICT →') : t('NEXT DEFENDANT →')}</button>}
      </>}
      <p className="advocate-privacy">{t('RATINGS SEALED UNTIL THE FINALE')}</p>
    </section>
  </div>;
}
