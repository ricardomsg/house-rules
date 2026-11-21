import { gameGuides } from '@/lib/game-guides';

export const metadata = {
  title: 'Game Library — House Rules',
  description: 'Browse every playable House Rules game and learn it before game night.',
};

export default function GamesPage() {
  return (
    <main className="library-shell">
      <nav className="site-nav">
        <a className="wordmark" href="/"><span className="logo-mark" aria-hidden="true"><i /><i /><i /></span> HOUSE RULES</a>
        <div className="nav-links"><a className="nav-link" href="/cards">Card library</a><a className="nav-link" href="/">Host a night</a></div>
      </nav>
      <header className="library-hero">
        <p className="eyebrow"><span /> THE GAME LIBRARY</p>
        <h1>{gameGuides.length} games.<br /><em>One table.</em></h1>
        <p>Learn the whole shelf before anyone arrives—or pick by mood and explain it in under a minute.</p>
      </header>
      <nav className="library-index" aria-label="Game library">
        {gameGuides.map((guide, index) => <a href={`#${guide.slug}`} key={guide.slug}><span>{String(index + 1).padStart(2, '0')}</span>{guide.title}</a>)}
      </nav>
      <section className="guide-list">
        {gameGuides.map((guide, index) => (
          <article className={`guide guide-${guide.color}`} id={guide.slug} key={guide.slug}>
            <header><span>{String(index + 1).padStart(2, '0')}</span><div><p>{guide.players} PLAYERS · {guide.time}</p><h2>{guide.title}</h2><strong>{guide.energy}</strong></div></header>
            <div className="guide-summary">{guide.summary}</div>
            <div className="guide-rules">
              <section><small>SETUP</small><p>{guide.setup}</p><small>SCORING</small><p>{guide.scoring}</p></section>
              <section><small>THE ROUND</small><ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol></section>
            </div>
            <blockquote><small>EXAMPLE</small>{guide.example}</blockquote>
            <a href="/#top">HOST THIS GAME ↗</a>
          </article>
        ))}
      </section>
    </main>
  );
}
