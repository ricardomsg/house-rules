'use client';

import { useLanguage } from '@/app/LanguageProvider';
import { rankIdentityResults, type IdentityResult } from '@/lib/identity-flow';
import type { GameView } from './GameBoard';

export type IdentityView = GameView & { identityResults?: IdentityResult[] };
type Props = {
  view: IdentityView;
  remainingSeconds: number;
  acting: boolean;
  sendAction: (action: string, payload?: Record<string, unknown>) => Promise<boolean>;
};

export default function IdentityBoard({ view, remainingSeconds, acting, sendAction }: Props) {
  const { t } = useLanguage();
  const players = view.players ?? [];
  const name = (id?: string) => players.find(player => player.id === id)?.name ?? t('Player');
  const guessing = view.currentPlayerId === view.playerId;
  const participant = !view.watching && players.some(player => player.id === view.playerId);
  const mayJudge = participant && !guessing;
  const ready = view.phase === 'identity-briefing';
  const live = view.phase === 'identity-playing';
  // Defence in depth: do not render the viewer's own card even if a faulty
  // response supplies it. The route must enforce the same privacy boundary.
  const identity = !guessing ? view.identities?.find(card => card.playerId === view.currentPlayerId && card.playerId !== view.playerId) : undefined;
  const results = rankIdentityResults(view.identityResults ?? []);

  if (view.phase === 'results') return <section className="identity-results">
    <p className="stage-label">{t('WHO FOUND THEMSELVES FASTEST?')}</p>
    <h2>{t('Fastest correct guess wins.')}</h2>
    <p>{t('Only solved identities receive a rank. Passing or running out of time scores nothing.')}</p>
    <ol className="identity-result-grid" aria-label={t('Identity time rankings')} style={{ listStyle: 'none', padding: 0 }}>
      {results.map(result => <li key={result.playerId}><article className={result.solved ? 'identity-solved' : ''}>
        <small>{result.rank === null ? t('NOT SOLVED') : t('PLACE {rank}', { rank: result.rank })}</small>
        <strong>{name(result.playerId)}</strong>
        <p>{result.solved ? t('{seconds} seconds', { seconds: (result.elapsedMs / 1000).toFixed(1) }) : t('Passed or time expired')}</p>
      </article></li>)}
    </ol>
    <p>{t('Your identity stays hidden, including here. Ask the group afterwards if you want to know.')}</p>
    {view.isHost && <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t('PLAY ANOTHER ROUND →')}</button>}
  </section>;

  return <div className="identity-playing-stage">
    <section className="identity-turn-panel">
      <p className="stage-label">{t('ONE PLAYER. ONE CLOCK.')}</p>
      <h2>{guessing ? t('Who are you?') : t('{name} is guessing.', { name: name(view.currentPlayerId) })}</h2>
      <p>{t('Ask yes-or-no questions aloud. Everyone else answers aloud. Keep going until you guess correctly or the timer ends.')}</p>
      {live && <p role="timer" aria-label={t('Seconds remaining')}><strong>{remainingSeconds}</strong> {t('SECONDS LEFT')}</p>}
      {guessing ? <div className="identity-asker-card">
        <strong aria-label={t('Your identity is hidden')}>?</strong>
        <p>{t('Your phone never shows your identity. Ask the room, make guesses aloud, and let another player mark the result.')}</p>
      </div> : <div className="identity-answer-card">
        <small>{t('KEEP THIS SCREEN AWAY FROM THE GUESSER')}</small>
        <strong>{identity?.name ?? t('Waiting for the identity…')}</strong>
        {identity && <span>{identity.category}</span>}
        <p>{t('Answer aloud: yes, no, or not sure. Accept a recognisable correct name; spelling and typing are not part of the game.')}</p>
        {mayJudge && <>
          {live && <div>
            <button type="button" disabled={acting || remainingSeconds <= 0 || !identity} onClick={() => sendAction('identity-guessed')}>{t('GUESSED ✓')}</button>
            <button type="button" disabled={acting || remainingSeconds <= 0} onClick={() => sendAction('identity-pass')}>{t('PASS · NO SCORE')}</button>
          </div>}
          {(ready || live) && <button type="button" style={{ width: '100%', marginTop: 12 }} disabled={acting || !identity || (live && remainingSeconds <= 0)} onClick={() => sendAction('identity-replace')}>{t('UNKNOWN IDENTITY? REPLACE IT')}</button>}
          <p>{t('Replace only when the group does not know the identity. During a turn, replacement keeps the same clock running.')}</p>
        </>}
      </div>}
      {ready && <>
        <p>{t('You have {seconds} seconds. Check that the guesser is ready and everyone else knows the identity.', { seconds: view.turnSeconds ?? 120 })}</p>
        {participant && (guessing || view.isHost) ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('identity-start')}>{t('START THE TURN →')}</button> : <p className="waiting-block">{t('Waiting for the guesser or host to start.')}</p>}
      </>}
      {live && remainingSeconds <= 0 && <p role="status">{t('Time is up. Moving to the next player…')}</p>}
    </section>
    <section className="identity-rules">
      <p className="stage-label">{t('THE TABLE DOES THE TALKING')}</p>
      <ol>
        <li><b>1</b><p>{t('One person keeps asking questions for their whole timed turn. There is no button after each answer.')}</p></li>
        <li><b>2</b><p>{t('Any other player can mark a correct guess or pass the turn. The guesser cannot mark their own result.')}</p></li>
        <li><b>3</b><p>{t('The next player gets a fresh timer. Fastest solved time wins; passes and timeouts receive no score.')}</p></li>
      </ol>
      <p>{t('Do not show or read the identity to the guesser, and do not give extra clues beyond answering their questions.')}</p>
      <p>{t('{count}/{total} turns completed', { count: results.length, total: players.length })}</p>
    </section>
  </div>;
}
