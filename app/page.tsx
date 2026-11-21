'use client';

import { browserStorage, joinRequestKey } from '@/lib/browser-storage';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { games } from '@/lib/games';
import { clientRequest } from '@/lib/client-request';
import { useLanguage } from './LanguageProvider';

const avatars = [
  { initials: 'A', color: 'blue' },
  { initials: 'B', color: 'red' },
  { initials: 'C', color: 'yellow' },
  { initials: '+', color: 'cream' },
];

export default function Home() {
  const { t } = useLanguage();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [notice, setNotice] = useState('');
  const [hostOpen, setHostOpen] = useState(false);
  const [hostName, setHostName] = useState('');
  const [creating, setCreating] = useState(false);

  function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length === 4) router.push(`/room/${code}`);
    else setNotice('Room codes have four letters.');
  }

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hostName.trim().length < 2) return;
    setCreating(true);
    try {
      const response = await clientRequest('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: hostName, requestKey: joinRequestKey('create', hostName) }),
      });
      const result = (await response.json()) as { code?: string; token?: string; playerId?: string; error?: string };
      if (!response.ok || !result.code || !result.token || !result.playerId) {
        setNotice(result.error ?? 'The room could not be created.');
        setHostOpen(false);
        return;
      }
      browserStorage.setItem(`house-rules:${result.code}`, JSON.stringify({ token: result.token, playerId: result.playerId, name: hostName.trim() }));
      browserStorage.removeItem(`house-rules-request:create:${hostName.trim().replace(/\s+/g, ' ').slice(0, 24)}`);
      router.push(`/room/${result.code}`);
    } catch {
      setNotice('The room could not be created. Try once more.');
      setHostOpen(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main>
      <nav className="site-nav" aria-label="Main navigation">
        <a className="wordmark" href="#top" aria-label="House Rules home">
          <span className="logo-mark" aria-hidden="true"><i /><i /><i /></span>
          HOUSE RULES
        </a>
        <div className="nav-links"><a className="nav-link" href="/games">Game library</a><a className="nav-link" href="/cards">Card library</a></div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> YOUR GAME NIGHT STARTS HERE</p>
          <h1>Phones down.<br /><em>Game on.</em></h1>
          <p className="hero-intro">
            One shared room for secret roles, wild accusations, and the stories
            you&apos;ll still be arguing about next week.
          </p>

          <div className="actions">
            <button className="primary-button" type="button" onClick={() => setHostOpen(true)}>
              HOST A GAME NIGHT <span aria-hidden="true">↗</span>
            </button>
            <span className="or">OR</span>
            <form className="join-form" onSubmit={handleJoin}>
              <label htmlFor="room-code">Join with a code</label>
              <div>
                <input
                  id="room-code"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.replace(/[^a-z]/gi, '').slice(0, 4))}
                  placeholder="ABCD"
                  autoCapitalize="characters"
                  autoComplete="off"
                  aria-describedby="join-notice"
                />
                <button type="submit" aria-label="Join room">→</button>
              </div>
            </form>
          </div>
          <p className="form-notice" id="join-notice" aria-live="polite">{notice}</p>
        </div>

        <div className="hero-art" aria-label="Example game night room">
          <div className="burst burst-one">✦</div>
          <div className="burst burst-two">✦</div>
          <div className="room-card">
            <div className="card-topline"><span>TONIGHT&apos;S ROOM</span><span className="live-dot">LIVE</span></div>
            <div className="room-code-display">KITE</div>
            <div className="room-rule" />
            <p>3 players at the table</p>
            <div className="avatar-row">
              {avatars.map((avatar) => (
                <span className={`avatar avatar-${avatar.color}`} key={`${avatar.initials}-${avatar.color}`}>
                  {avatar.initials}
                </span>
              ))}
            </div>
            <button type="button">CHOOSE A GAME</button>
          </div>
          <span className="meeple meeple-red" aria-hidden="true" />
          <span className="meeple meeple-blue" aria-hidden="true" />
          <span className="pawn" aria-hidden="true" />
        </div>
      </section>

      <section className="ticker" aria-label="What you need">
        <span>NO DOWNLOADS</span><b>◆</b><span>ONE ROOM CODE</span><b>◆</b>
        <span>EVERYONE PLAYS</span><b>◆</b><span>BAD BLUFFING WELCOME</span>
      </section>

      <section className="games-section" id="games">
        <div>
          <p className="eyebrow dark"><span /> THE FIRST GAMES</p>
          <h2>A growing shelf of trouble.</h2>
        </div>
        <p className="games-intro">
          We&apos;re starting with social games built for the same room. Your phone
          gives you the secret; your friends make it chaos.
        </p>
        <div className="game-grid">
          {games.map((game, index) => (
            <article className={`game-card game-${game.color}`} key={game.slug}>
              <span className="game-number">{String(index + 1).padStart(2, '0')}</span>
              <p>{game.eyebrow}</p>
              <h3>{game.title}</h3>
              <div className="game-description">{game.description}</div>
              <div className="game-meta"><span>{game.players} PLAYERS</span><span>{game.duration}</span></div>
              <small>{game.available ? 'PLAYABLE NOW' : 'COMING TO THE TABLE'}</small>
              {game.available && (
                <a
                  className="game-guide-link"
                  href={`/games#${game.slug}`}
                  aria-label={`How to play ${game.title}`}
                >
                  HOW TO PLAY <span aria-hidden="true">→</span>
                </a>
              )}
            </article>
          ))}
        </div>
      </section>

      {hostOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !creating && setHostOpen(false)}>
          <section data-i18n-managed="true" className="host-modal" role="dialog" aria-modal="true" aria-labelledby="host-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label={t("Close")} onClick={() => setHostOpen(false)}>×</button>
            <p className="eyebrow"><span /> {t('Take the first seat')}</p>
            <h2 id="host-title">{t("Who's hosting?")}</h2>
            <p>{t("We only need a name. You'll get a room code to share with everyone else.")}</p>
            <form onSubmit={createRoom}>
              <label htmlFor="host-name">{t("YOUR NAME")}</label>
              <input id="host-name" value={hostName} onChange={(event) => setHostName(event.target.value.slice(0, 24))} placeholder={t("e.g. Player 1")} autoFocus autoComplete="name" />
              <button type="submit" disabled={creating || hostName.trim().length < 2}>{creating ? t('SETTING THE TABLE…') : t('CREATE THE ROOM →')}</button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
