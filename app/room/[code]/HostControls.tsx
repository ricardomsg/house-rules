'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '@/app/LanguageProvider';

type Player = { id: string; name: string; isHost: boolean };
export default function HostControls({ players, active, acting, sendAction }: {
  players: Player[]; active: boolean; acting: boolean;
  sendAction: (action: string, payload?: Record<string, unknown>) => Promise<boolean>;
}) {
  const { t } = useLanguage();
  const [pending, setPending] = useState<{ action: string; targetId?: string; title: string; explanation: string } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { if (pending) dialog.current?.showModal(); else dialog.current?.close(); }, [pending]);
  return <details className="host-controls" data-i18n-managed="true">
    <summary>{t('Host controls')}</summary>
    <div className="host-controls-body">
      <p>{active ? t('Manage the match for everyone in this room.') : t('Manage the players before starting a game.')}</p>
      {active && <div className="host-match-actions">
        <button type="button" disabled={acting} onClick={() => setPending({ action: 'restart', title: t('Restart this match?'), explanation: t('Everyone gets a fresh setup. Completed results are saved to the night standings; unfinished play is discarded.') })}>{t('Restart match')}</button>
        <button type="button" disabled={acting} onClick={() => setPending({ action: 'end', title: t('Return everyone to the lobby?'), explanation: t('The last completed result is saved to the night standings. Unfinished play is discarded. You can then change players and choose another game.') })}>{t('Return to lobby')}</button>
      </div>}
      <p>{t('Transfer hosting to someone who can keep the room running. Keep your phone private: hosting does not reveal other players’ secrets.')}</p>
      {players.filter((player) => !player.isHost).map((player) => <div className="host-player" key={player.id}>
        <strong>{player.name}</strong>
        <button type="button" disabled={acting} onClick={() => setPending({ action: 'transfer-host', targetId: player.id, title: t('Make {name} the host?', { name: player.name }), explanation: t('You will remain a player. The new host will manage this room and its games.') })}>{t('Make host')}</button>
        {!active && <button type="button" disabled={acting} onClick={() => setPending({ action: 'remove-player', targetId: player.id, title: t('Remove {name}?', { name: player.name }), explanation: t('This seat will be removed. They can join again with the room code.') })}>{t('Remove player')}</button>}
      </div>)}
      {active && <p>{t('To change the player list, return to the lobby first.')}</p>}
    </div>
    <dialog ref={dialog} className="host-confirm-dialog" aria-labelledby={titleId} onClose={() => setPending(null)}>
      {pending && <><h2 id={titleId}>{pending.title}</h2><p>{pending.explanation}</p><div>
        <button type="button" autoFocus disabled={acting} onClick={() => setPending(null)}>{t('Cancel')}</button>
        <button type="button" disabled={acting} onClick={async () => { if (await sendAction(pending.action, { targetId: pending.targetId })) setPending(null); }}>{acting ? t('Saving…') : t('Confirm')}</button>
      </div></>}
    </dialog>
  </details>;
}
