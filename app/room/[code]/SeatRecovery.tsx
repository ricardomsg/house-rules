'use client';

import { useCallback, useEffect, useState } from 'react';
import { browserStorage, newRequestKey } from '@/lib/browser-storage';
import { clientRequest } from '@/lib/client-request';
import { useLanguage } from '@/app/LanguageProvider';

export type SeatSession = { token: string; playerId: string; name: string };
type Pending = { requestKey: string; targetId: string };
type RecoveryRequest = { id: string; playerId: string; name: string; verificationCode: string };
async function recovery(code: string, body: Record<string, unknown>) {
  const response = await clientRequest(`/api/rooms/${code}/seat-recovery`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Could not recover the seat. Try again.');
  return result;
}

export function RecoverSeat({ code, players, onRecovered }: { code: string; players: { id: string; name: string }[]; onRecovered: (session: SeatSession) => void }) {
  const { t } = useLanguage();
  const storageKey = `house-rules-recovery:${code}`;
  const [pending, setPending] = useState<Pending | null>(() => {
    try {
      const saved = JSON.parse(browserStorage.getItem(storageKey) ?? 'null');
      return typeof saved?.requestKey === 'string' && typeof saved.targetId === 'string' ? saved : null;
    } catch { return null; }
  });
  const [targetId, setTargetId] = useState('');
  const [verification, setVerification] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const check = useCallback(async (request: Pending, action: 'request' | 'poll') => {
    const result = await recovery(code, { action, ...request });
    if (result.status === 'approved') {
      // Save credentials before removing the resumable request.
      onRecovered(result.session);
      browserStorage.removeItem(storageKey);
      setPending(null);
    } else if (result.status === 'rejected') {
      setError('The host declined this request. Check your seat with them and try again.');
      setPending(null);
      browserStorage.removeItem(storageKey);
    } else setVerification(result.verificationCode);
  }, [code, onRecovered, storageKey]);

  useEffect(() => {
    if (!pending) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { await check(pending, 'request'); } catch (cause) {
        if (!stopped) setError(cause instanceof Error ? cause.message : 'Could not recover the seat. Try again.');
      }
      if (!stopped) timer = setTimeout(poll, 2500);
    };
    timer = setTimeout(poll, 0);
    return () => { stopped = true; clearTimeout(timer); };
  }, [pending, check]);

  async function requestSeat() {
    setBusy(true); setError('');
    const request = { requestKey: newRequestKey(), targetId };
    browserStorage.setItem(storageKey, JSON.stringify(request));
    setPending(request);
    setBusy(false);
  }
  return <section className="seat-recovery" data-i18n-managed="true">
    <h3>{t('Already at this table?')}</h3>
    <p>{t('Lost your seat or changed phones? Ask the host to approve your return. Your role and game progress stay the same.')}</p>
    {!pending ? <>
      <label htmlFor="recover-player">{t('YOUR EXISTING SEAT')}</label>
      <select id="recover-player" value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">{t('Choose your name')}</option>{players.map(player => <option key={player.id} value={player.id}>{player.name}</option>)}</select>
      <button type="button" disabled={!targetId || busy} onClick={requestSeat}>{t('ASK HOST TO RESTORE MY SEAT')}</button>
    </> : <>
      <p>{t('Show this code to the host. They must match it before approving your new phone.')}</p>
      <strong className="recovery-code">{verification || '…'}</strong>
      <p role="status">{t('Waiting for host approval…')}</p>
      <button type="button" onClick={() => { browserStorage.removeItem(storageKey); setPending(null); setVerification(''); setError(''); }}>{t('CHOOSE AGAIN')}</button>
    </>}
    {error && <p role="alert">{t(error)}</p>}
  </section>;
}

export function HostSeatRecovery({ code, token }: { code: string; token: string }) {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { const result = await recovery(code, { action: 'list', token }); if (!stopped) setRequests(result.requests); } catch { /* Game connection controls handle outages. */ }
      if (!stopped) timer = setTimeout(poll, 4000);
    };
    timer = setTimeout(poll, 0);
    return () => { stopped = true; clearTimeout(timer); };
  }, [code, token]);
  async function decide(request: RecoveryRequest, action: 'approve' | 'reject') {
    if (action === 'approve' && !window.confirm(t('Does {name} show code {code} on their new phone? Approving disconnects their old phone.', { name: request.name, code: request.verificationCode }))) return;
    setBusy(true); setError('');
    try { await recovery(code, { action, token, requestKey: request.id }); setRequests(current => current.filter(entry => entry.id !== request.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not recover the seat. Try again.'); }
    finally { setBusy(false); }
  }
  if (!requests.length && !error) return null;
  return <aside className="seat-recovery host-seat-recovery" data-i18n-managed="true">
    <h3>{t('A player wants to reconnect')}</h3>
    <p>{t('Only approve after matching the code on that person’s new phone.')}</p>
    {requests.map(request => <div className="recovery-request" key={request.id}><strong>{request.name} · {request.verificationCode}</strong><div><button disabled={busy} onClick={() => decide(request, 'approve')}>{t('APPROVE NEW PHONE')}</button><button disabled={busy} onClick={() => decide(request, 'reject')}>{t('DISMISS')}</button></div></div>)}
    {error && <p role="alert">{t(error)}</p>}
  </aside>;
}
