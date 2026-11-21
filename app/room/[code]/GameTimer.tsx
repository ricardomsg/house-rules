'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/app/LanguageProvider';
import styles from './GameTimer.module.css';

type Props = {
  gameId: string;
  phase: string;
  /** Absolute server deadline in milliseconds; null while no clock is running. */
  deadline?: number | null;
  /** Already translated name of the timed activity. */
  label: string;
};
type Clock = { key: string; deadline: number; label: string };
type Notice = { label: string; until: number };
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Keep mounted across phases, including untimed phases, to preserve sound activation. */
export default function GameTimer({ gameId, phase, deadline, label }: Props) {
  const { t } = useLanguage();
  const [now, setNow] = useState(() => Date.now());
  const [sound, setSound] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const context = useRef<AudioContext | null>(null);
  const enabled = useRef(false);
  const previous = useRef<Clock | null>(null);
  const initialized = useRef(false);
  const finished = useRef(new Set<string>());
  const validDeadline = typeof deadline === 'number' && Number.isFinite(deadline) ? deadline : null;

  const play = useCallback((ending: boolean, delay = 0) => {
    const audio = context.current;
    if (!enabled.current || !audio || audio.state !== 'running') return;
    // Short, soft musical cues; no files, network request, or speech over the game.
    const notes = ending ? [660, 520, 440] : [440, 660];
    notes.forEach((frequency, index) => {
      const start = audio.currentTime + delay + index * 0.16;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.15);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }, []);

  const expire = useCallback((clock: Clock, current: number) => {
    if (clock.deadline > current || finished.current.has(clock.key)) return;
    finished.current.add(clock.key);
    // Bound memory during a long night without losing the current clock's guard.
    if (finished.current.size > 100) finished.current.delete(finished.current.values().next().value!);
    setNotice({ label: clock.label, until: current + 6500 });
    play(true);
  }, [play]);

  useEffect(() => {
    const current = Date.now();
    const next = validDeadline === null ? null : {
      key: `${gameId}:${phase}:${validDeadline}`, deadline: validDeadline, label,
    };
    const old = previous.current;
    if (old?.key !== next?.key) {
      // A server poll can move directly into the next phase before our next tick.
      if (old) expire(old, current);
      if (initialized.current && next && next.deadline > current) play(false, old && old.deadline <= current ? 0.55 : 0);
      // Joining/reloading an already expired phase must not raise an old alarm.
      if (next && next.deadline <= current) finished.current.add(next.key);
    }
    previous.current = next;
    initialized.current = true;
  }, [gameId, phase, validDeadline, label, expire, play]);

  useEffect(() => {
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (previous.current) expire(previous.current, current);
      setNotice(value => value && value.until <= current ? null : value);
    };
    const interval = window.setInterval(tick, 200);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', tick); };
  }, [expire]);

  useEffect(() => () => {
    enabled.current = false;
    const audio = context.current;
    context.current = null;
    if (audio) { audio.onstatechange = null; void audio.close().catch(() => {}); }
  }, []);

  const toggleSound = async () => {
    if (sound) {
      enabled.current = false;
      setSound(false);
      return;
    }
    try {
      const Constructor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
      if (!Constructor) return;
      if (!context.current) {
        const created = new Constructor();
        created.onstatechange = () => setSound(enabled.current && created.state === 'running');
        context.current = created;
      }
      const audio = context.current;
      await audio.resume();
      enabled.current = audio.state === 'running';
      setSound(enabled.current);
      play(false); // A confirmation cue also lets the player check their volume.
    } catch {
      enabled.current = false;
      setSound(false);
    }
  };

  const seconds = validDeadline === null ? null : Math.max(0, Math.ceil((validDeadline - now) / 1000));
  const expired = seconds === 0;
  const value = seconds === null ? null : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return <>
    <div className={styles.space} aria-hidden="true" />
    <aside className={`${styles.overlay} ${seconds !== null && seconds <= 10 ? styles.urgent : ''}`} aria-label={t('Game timer')}>
      <div className={styles.row}>
        <div className={styles.clock}>
          <span className={styles.label}>{seconds === null ? t('No timer running') : label}</span>
          {value !== null && <strong role="timer" aria-live="off" aria-label={`${label}: ${value}`}>{value}</strong>}
        </div>
        <button type="button" className={styles.sound} onClick={() => void toggleSound()} aria-pressed={sound}>
          {sound ? t('Sound on · mute') : t('Enable timer sound')}
        </button>
      </div>
      <div className={styles.status} role="status" aria-live="polite" aria-atomic="true">
        {notice ? `${notice.label} — ${t('Time is up!')}` : expired ? t('Time is up!') : !sound ? t('Sound off — tap to enable alerts') : t('Sound enabled while this page is active')}
      </div>
    </aside>
  </>;
}
