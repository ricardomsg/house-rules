'use client';

import { useMemo, useState } from 'react';
import { activeOutsiderCards } from '@/lib/card-catalog';
import { useLanguage } from '@/app/LanguageProvider';
import {
  devilsAdvocateStatements,
  categoryLetters,
  categorySets,
  charadesPrompts,
  doodleRelayPrompts,
  humanScales,
  identityDeck,
  samePageQuestions,
  settlerMissions,
  signalDeck,
  writersRoomDeck,
} from '@/lib/game-content';
import { games, type GameColor } from '@/lib/games';

type CardField = { label: string; value: string };
type CatalogCard = { title: string; badge?: string; fields?: CardField[] };
type Collection = {
  slug: string;
  title: string;
  color: GameColor;
  count: string;
  description: string;
  cards: CatalogCard[];
  spoiler?: boolean;
  note?: string;
};

const game = (slug: string) => games.find((entry) => entry.slug === slug)!;

function outsiderCollection(slug: string): Collection {
  const definition = game(slug);
  const cards = activeOutsiderCards(slug);
  return {
    slug,
    title: definition.title,
    color: definition.color,
    count: `${cards.length} variants`,
    description: definition.description,
    spoiler: true,
    cards: cards.map(({ card }) => ({
      title: card.title,
      fields: [
        { label: 'Regular players', value: card.regular },
        { label: 'Outsider', value: card.outsider },
        { label: 'Instructions', value: card.instruction },
        ...(card.note ? [{ label: 'Host note', value: card.note }] : []),
      ],
    })),
  };
}

const collections: Collection[] = [
  {
    ...game('devils-advocate'),
    count: `${devilsAdvocateStatements.length} prompts`,
    cards: devilsAdvocateStatements.map(statement => ({ title: statement })),
  },
  ...['scene-stealer', 'alibi-club', 'house-rule', 'head-fake'].map(outsiderCollection),
  {
    ...game('same-page'),
    count: `${samePageQuestions.length} questions`,
    cards: samePageQuestions.map((question, index) => ({ title: `# ${String(index + 1).padStart(2, '0')}`, fields: [{ label: 'Question', value: question }] })),
  },
  {
    ...game('charades'),
    count: `${charadesPrompts.length} prompts`,
    cards: charadesPrompts.map((card) => ({ title: card.prompt, badge: `${card.category} · ${card.difficulty}` })),
  },
  {
    ...game('fishbowl'),
    count: 'Created by players',
    note: 'There is no fixed deck. Every player privately writes two prompts when the game begins, so each bowl belongs to that group.',
    cards: [],
  },
  {
    ...game('who-am-i'),
    count: `${identityDeck.length} identities`,
    cards: identityDeck.map((card) => ({
      title: card.name,
      badge: card.category,
      fields: card.aliases?.length ? [{ label: 'Accepted answers', value: card.aliases.join(' · ') }] : undefined,
    })),
  },
  {
    ...game('categories'),
    count: `${categorySets.length} sets × ${categoryLetters.length} letters = ${categorySets.length * categoryLetters.length} combinations`,
    note: `Every category set can appear with any of these ${categoryLetters.length} letters: ${categoryLetters.join(' · ')}.`,
    cards: categorySets.map((set, index) => ({
      title: `# ${String(index + 1).padStart(2, '0')}`,
      fields: set.map((category, categoryIndex) => ({ label: `${categoryIndex + 1}`, value: category })),
    })),
  },
  {
    ...game('two-truths'),
    count: 'Created by players',
    note: 'There is no fixed deck. The storyteller writes two true claims and one lie about themselves during their turn.',
    cards: [],
  },
  {
    ...game('signal-lost'),
    count: `${signalDeck.length} targets`,
    spoiler: true,
    cards: signalDeck.map((card) => ({
      title: card.target,
      badge: card.category,
      fields: [
        { label: 'Blocked words', value: card.blocked.join(' · ') },
        ...(card.aliases?.length ? [{ label: 'Accepted answers', value: card.aliases.join(' · ') }] : []),
      ],
    })),
  },
  {
    ...game('writers-room'),
    count: `${writersRoomDeck.length} scenes`,
    cards: writersRoomDeck.map((card) => ({
      title: card.genre,
      fields: [{ label: 'Setup', value: card.setup }, { label: 'Direction', value: card.direction }],
    })),
  },
  {
    ...game('doodle-relay'),
    count: `${doodleRelayPrompts.length} prompts`,
    cards: doodleRelayPrompts.map((prompt, index) => ({ title: `# ${String(index + 1).padStart(2, '0')}`, fields: [{ label: 'Draw', value: prompt }] })),
  },
  {
    ...game('night-shift'),
    count: '2 roles · 6 player-count setups',
    spoiler: true,
    note: 'Every match uses five missions. The first hidden side to win three missions wins the match.',
    cards: [
      { title: 'Crew', fields: [{ label: 'Goal', value: 'Help three missions succeed. On a mission, you can only stabilize.' }] },
      { title: 'Saboteur', fields: [{ label: 'Goal', value: 'Help three missions fail. On a mission, you may secretly stabilize or jam.' }] },
      { title: '5 players', fields: [{ label: 'Roles', value: '3 Crew · 2 Saboteurs' }, { label: 'Mission sizes', value: '2 · 3 · 2 · 3 · 3' }] },
      { title: '6 players', fields: [{ label: 'Roles', value: '4 Crew · 2 Saboteurs' }, { label: 'Mission sizes', value: '2 · 3 · 4 · 3 · 4' }] },
      { title: '7 players', fields: [{ label: 'Roles', value: '4 Crew · 3 Saboteurs' }, { label: 'Mission sizes', value: '2 · 3 · 3 · 4 · 4' }] },
      { title: '8 players', fields: [{ label: 'Roles', value: '5 Crew · 3 Saboteurs' }, { label: 'Mission sizes', value: '3 · 4 · 4 · 5 · 5' }] },
      { title: '9 players', fields: [{ label: 'Roles', value: '6 Crew · 3 Saboteurs' }, { label: 'Mission sizes', value: '3 · 4 · 4 · 5 · 5' }] },
      { title: '10 players', fields: [{ label: 'Roles', value: '6 Crew · 4 Saboteurs' }, { label: 'Mission sizes', value: '3 · 4 · 4 · 5 · 5' }] },
    ],
  },
  {
    ...game('human-scale'),
    count: `${humanScales.length} scales`,
    cards: humanScales.map((card) => ({
      title: card.topic,
      fields: [{ label: 'Left end', value: card.left }, { label: 'Right end', value: card.right }],
    })),
  },
  {
    ...game('secret-settlers'),
    count: `${settlerMissions.length} missions`,
    spoiler: true,
    cards: settlerMissions.map((card) => ({
      title: card.title,
      fields: [{ label: 'Mission', value: card.mission }, { label: 'Fine print', value: card.note }],
    })),
  },
];

function searchable(collection: Collection) {
  return [collection.title, collection.description, collection.note, ...collection.cards.flatMap((card) => [card.title, card.badge, ...(card.fields?.flatMap((field) => [field.label, field.value]) ?? [])])]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
}

export default function CardLibrary() {
  const { locale, localize, t } = useLanguage();
  const [selected, setSelected] = useState('all');
  const [query, setQuery] = useState('');
  const [spoilersVisible, setSpoilersVisible] = useState<Record<string, boolean>>({});
  const localized = useMemo(() => localize(collections), [localize]);
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const visible = localized.filter((collection) => {
    if (selected !== 'all' && collection.slug !== selected) return false;
    return !normalizedQuery || searchable(collection).includes(normalizedQuery);
  });

  return (
    <main className="cards-shell">
      <nav className="site-nav cards-nav" aria-label={t('Main navigation')}>
        <a className="wordmark" href="/"><span className="logo-mark" aria-hidden="true"><i /><i /><i /></span> HOUSE RULES</a>
        <div className="nav-links"><a className="nav-link active" href="/cards" aria-current="page">Card library</a><a className="nav-link" href="/games">Game library</a></div>
      </nav>

      <header className="cards-hero">
        <p className="eyebrow"><span /> EVERY CARD, IN ONE PLACE</p>
        <h1>Open the<br /><em>card box.</em></h1>
        <p>Browse every built-in prompt, role, mission, and setup. Switch to PT below for the complete European Portuguese collection.</p>
      </header>

      <section className="cards-toolbar" aria-label={t('Card filters')}>
        <label><span>{t('Choose a game')}</span><select value={selected} onChange={(event) => setSelected(event.target.value)}><option value="all">{t('All games')}</option>{localized.map((collection) => <option value={collection.slug} key={collection.slug}>{collection.title} — {collection.count}</option>)}</select></label>
        <label><span>{t('Search cards')}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Try “penguin”, “casamento”, or “mission”…')} type="search" /></label>
        <div className="cards-language-note"><span>{locale === 'pt-PT' ? 'PT-PT' : 'EN'}</span><p>{locale === 'pt-PT' ? 'A mostrar a coleção completa em português europeu.' : 'Use the EN / PT switch to see every card in European Portuguese.'}</p></div>
      </section>

      <section className="cards-results">
        <header className="cards-results-heading"><p>{visible.length} {t(visible.length === 1 ? 'game shown' : 'games shown')}</p>{normalizedQuery && <button type="button" onClick={() => setQuery('')}>{t('Clear search')} ×</button>}</header>
        {visible.map((collection) => {
          const concealed = Boolean(collection.spoiler) && !spoilersVisible[collection.slug];
          return <article className={`card-collection collection-${collection.color}`} id={collection.slug} key={collection.slug}>
            <header>
              <div><p>{collection.count}</p><h2>{collection.title}</h2></div>
              <a href={`/games#${collection.slug}`}>{t('How to play')} →</a>
            </header>
            <p className="collection-description">{collection.description}</p>
            {collection.note && collection.cards.length > 0 && <aside>{collection.note}</aside>}
            {collection.spoiler && <div className="spoiler-control"><div><strong>{t('Secret content')}</strong><span>{t('These are answers or private roles. Hide them before game night if you want to be surprised.')}</span></div><button type="button" aria-expanded={!concealed} onClick={() => setSpoilersVisible((current) => ({ ...current, [collection.slug]: concealed }))}>{concealed ? t('Reveal cards') : t('Hide cards')}</button></div>}
            {!concealed && collection.cards.length > 0 && <div className="catalog-grid">{collection.cards.map((card, index) => <section className="catalog-card" key={`${card.title}-${index}`}>
              <span>{String(index + 1).padStart(2, '0')}{card.badge ? ` · ${card.badge}` : ''}</span>
              <h3>{card.title}</h3>
              {card.fields?.map((field, fieldIndex) => <div className="catalog-field" key={`${field.label}-${fieldIndex}`}><small>{t(field.label)}</small><p>{field.value}</p></div>)}
            </section>)}</div>}
            {!concealed && collection.cards.length === 0 && <div className="player-written"><strong>{t('No fixed cards')}</strong><p>{collection.note}</p></div>}
          </article>;
        })}
        {visible.length === 0 && <div className="cards-empty"><h2>{t('No cards found.')}</h2><p>{t('Try another word or choose all games.')}</p><button type="button" onClick={() => { setQuery(''); setSelected('all'); }}>{t('Reset filters')}</button></div>}
      </section>
    </main>
  );
}
