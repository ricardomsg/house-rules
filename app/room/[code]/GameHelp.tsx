'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '@/app/LanguageProvider';
import { gameGuides } from '@/lib/game-guides';

export default function GameHelp({ slug }: { slug: string }) {
  const { t, localize } = useLanguage();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const guide = localize(gameGuides.find((entry) => entry.slug === slug));
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  if (!guide) return null;
  return <span data-i18n-managed="true" className="game-help">
    <button type="button" className="game-help-trigger" onClick={() => setOpen(true)}>{t('How to play')}</button>
    <dialog ref={dialog} className="game-help-dialog" aria-labelledby={titleId} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="game-help-content">
        <header><div><p>{t('How to play')}</p><h2 id={titleId}>{guide.title}</h2></div><button type="button" autoFocus onClick={() => setOpen(false)} aria-label={t('Close rules')}>×</button></header>
        <p className="game-help-meta">{guide.players} {t('players')} · {guide.time}</p>
        <p>{guide.summary}</p>
        <section><h3>{t('SETUP')}</h3><p>{guide.setup}</p></section>
        <section><h3>{t('THE ROUND')}</h3><ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol></section>
        <section><h3>{t('SCORING')}</h3><p>{guide.scoring}</p></section>
        <section className="game-help-example"><h3>{t('EXAMPLE')}</h3><p>{guide.example}</p></section>
        <section><h3>{t('Night standings')}</h3><p>{t('Finish a game to earn 1 night point, plus 2 for a win or completed goal. Extra rounds of this game build one combined result. Tied winners share the bonus; a zero-score tie gives participation points only.')}</p>
          {slug === 'signal-lost' && <p>{t('Team challenge: guess at least half the targets in a full lap to earn the shared night bonus.')}</p>}
          {slug === 'doodle-relay' && <p>{t('Everyone earns 1 night point. This game has no winner.')}</p>}
        </section>
        <section><h3>{t('Host controls')}</h3><p>{t('The host starts the game, opens the next stage and reveals results using the controls on screen. Only the current player can make their private decisions. If someone cannot continue, the host can restart the match or return everyone to the lobby to adjust the players.')}</p></section>
        <p>{t('Reading the rules does not pause the game or its timer. Close this window to return to your turn.')}</p>
        <button type="button" className="stage-action" onClick={() => setOpen(false)}>{t('Back to the game')}</button>
      </div>
    </dialog>
  </span>;
}
