import ptPT from './pt-pt.json';

export type Locale = 'en' | 'pt-PT';

// One reviewed dictionary for both UI copy and built-in game content.
const portuguese: Record<string, string> = ptPT;

function keepSpacing(source: string, translated: string) {
  const leading = source.match(/^\s*/)?.[0] ?? '';
  const trailing = source.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translated}${trailing}`;
}

export function translateCopy(value: string, locale: Locale, values?: Record<string, string | number | undefined>) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  let translated = locale === 'pt-PT' ? portuguese[trimmed] : undefined;
  if (!translated && locale === 'pt-PT') {
    const howTo = trimmed.match(/^How to play (.+)$/);
    if (howTo) translated = `Como jogar: ${portuguese[howTo[1]] ?? howTo[1]}`;
  }
  if (!translated && locale === 'pt-PT') {
    const patterns: Array<[RegExp, (...parts: string[]) => string]> = [
      [/^(.+) needs at least (\d+) players\.$/, (game, n) => `${portuguese[game] ?? game} precisa de pelo menos ${n} jogadores.`],
      [/^(.+) supports up to (\d+) players\.$/, (game, n) => `${portuguese[game] ?? game} permite no máximo ${n} jogadores.`],
      [/^Choose exactly (\d+) different players for this mission\.$/, (n) => `Escolhe exatamente ${n} jogadores diferentes para esta missão.`],
      [/^Waiting for (\d+) more answer sheets\.$/, (n) => `Faltam ${n} folhas de respostas.`],
      [/^The bowl needs all (\d+) players’ prompts\.$/, (n) => `Faltam desafios: os ${n} jogadores têm de enviar os seus.`],
    ];
    for (const [pattern, format] of patterns) {
      const match = trimmed.match(pattern);
      if (match) { translated = format(...match.slice(1)); break; }
    }
  }
  const copy = translated ? keepSpacing(value, translated) : value;
  return values ? copy.replace(/\{(\w+)\}/g, (placeholder, key: string) => values[key] === undefined ? placeholder : String(values[key])) : copy;
}

const semanticKeys = new Set([
  'gameId', 'vote', 'slug', 'color', 'mode', 'phase', 'id', 'playerId', 'actorId', 'actorTeam', 'ownTeam',
  'currentPlayerId', 'storytellerId', 'receiverId', 'directorId', 'nightRole', 'nightLeaderId',
  'nightOwnVote', 'nightOwnAction', 'kind', 'role', 'action', 'nightWinner', 'charadesWinner',
  'fishbowlWinner', 'outsiderId', 'writersWinnerId',
]);

export function localizeValue<T>(value: T, locale: Locale, key?: string): T {
  if (locale === 'en') return value;
  if (typeof value === 'string') return (key && semanticKeys.has(key) ? value : translateCopy(value, locale)) as T;
  if (Array.isArray(value)) return value.map((entry) => localizeValue(entry, locale, key)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entry]) => [entryKey, localizeValue(entry, locale, entryKey)])) as T;
  }
  return value;
}

// Translate built-in game copy only. Names and everything written by players are data.
const playerCopyKeys = new Set([
  'players', 'actorName', 'currentPlayerName', 'storytellerName', 'receiverName', 'directorName', 'nightLeaderName',
  'ownAnswer', 'answer', 'ownPrompts', 'fishbowlPrompt', 'ownCategoryAnswers', 'truthStatements',
  'ownSignalClue', 'clue', 'signalGuess', 'ownWritersPitch', 'pitch', 'writersWinningPitch',
  'ownRelayGuess', 'finalGuess', 'value',
]);
export function localizeGameView<T>(value: T, locale: Locale, key = ''): T {
  if (locale === 'en' || playerCopyKeys.has(key)) return value;
  if (key === 'relaySourceText') return value;
  if (Array.isArray(value)) return value.map((entry) => localizeGameView(entry, locale, key)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([entryKey, entry]) => [entryKey, localizeGameView(entry, locale, entryKey)])) as T;
  return localizeValue(value, locale, key);
}
