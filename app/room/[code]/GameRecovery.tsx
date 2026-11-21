'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/app/LanguageProvider';
import type { GameView } from './GameBoard';

export default function GameRecovery({ view, acting, sendAction }: {
  view: GameView; acting: boolean;
  sendAction: (action: string, payload?: Record<string, unknown>) => Promise<boolean>;
}) {
  const { t } = useLanguage();
  const [confirming, setConfirming] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (confirming) dialog.current?.showModal(); else dialog.current?.close(); }, [confirming]);
  if (!view.recovery) return null;
  const waiting = (view.waitingFor ?? []).map(id => view.players?.find(player => player.id === id)?.name).filter(Boolean);
  return <aside className="game-recovery" aria-label={t('Keep the game moving')}>
    {waiting.length > 0 && <p aria-live="polite">{t('Waiting for:')} <span translate="no">{waiting.join(', ')}</span></p>}
    {view.isHost && <details><summary>{t('Someone stuck?')}</summary>
      <p>{t(view.recovery.explanation)}</p>
      <button type="button" disabled={acting} onClick={() => setConfirming(true)}>{t(view.recovery.label)}</button>
    </details>}
    <dialog ref={dialog} className="host-confirm-dialog" aria-labelledby="recovery-title" onClose={() => setConfirming(false)}>
      <h2 id="recovery-title">{t(view.recovery.label)}</h2><p>{t(view.recovery.explanation)}</p>
      <div><button type="button" autoFocus disabled={acting} onClick={() => setConfirming(false)}>{t('Keep waiting')}</button>
        <button type="button" disabled={acting} onClick={async () => { if (await sendAction('recover')) setConfirming(false); }}>{t('Continue now')}</button></div>
    </dialog>
  </aside>;
}
