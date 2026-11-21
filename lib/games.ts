export type GameColor = 'red' | 'blue' | 'yellow' | 'green' | 'purple';

export type GameDefinition = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  players: string;
  minPlayers: number;
  maxPlayers: number;
  duration: string;
  color: GameColor;
  available: boolean;
  mode: 'outsider' | 'answers' | 'missions' | 'lineup' | 'charades' | 'fishbowl' | 'identity' | 'categories' | 'truths' | 'signal' | 'writers' | 'relay' | 'night' | 'advocate';
};

export const games: GameDefinition[] = [
  {
    slug: 'devils-advocate', title: 'Devil’s Advocate', eyebrow: 'DEFEND · RATE · REVEAL',
    description: 'Defend the indefensible in 60 seconds. Absurd claims, dark humour, secret ratings, and one final reckoning.',
    players: '3–10', minPlayers: 3, maxPlayers: 10, duration: '8–20 min', color: 'red', available: true, mode: 'advocate',
  },
  {
    slug: 'scene-stealer',
    title: 'Scene Stealer',
    eyebrow: 'ACT · WATCH · ACCUSE',
    description: 'Perform the same scene together—except one of you rehearsed the wrong movie.',
    players: '4–10', minPlayers: 4, maxPlayers: 10, duration: '10 min', color: 'red', available: true, mode: 'outsider',
  },
  {
    slug: 'alibi-club',
    title: 'Alibi Club',
    eyebrow: 'QUESTION · BLUFF · EXPOSE',
    description: 'Everyone remembers the incident. The uninvited guest has to invent an alibi.',
    players: '4–10', minPlayers: 4, maxPlayers: 10, duration: '12 min', color: 'blue', available: true, mode: 'outsider',
  },
  {
    slug: 'house-rule',
    title: 'House Rule',
    eyebrow: 'NOTICE · ADAPT · SURVIVE',
    description: 'Keep a strange conversational rule hidden from the one person trying to learn it.',
    players: '4–10', minPlayers: 4, maxPlayers: 10, duration: '10 min', color: 'yellow', available: true, mode: 'outsider',
  },
  {
    slug: 'head-fake',
    title: 'Head Fake',
    eyebrow: 'MOVE · COPY · CATCH',
    description: 'Perform a synchronized action and spot the player following a suspiciously different brief.',
    players: '4–10', minPlayers: 4, maxPlayers: 10, duration: '8 min', color: 'green', available: true, mode: 'outsider',
  },
  {
    slug: 'same-page',
    title: 'Same Page',
    eyebrow: 'PREDICT · MATCH · REVEAL',
    description: 'Answer for the room, not yourself. Matching minds score together.',
    players: '3–10', minPlayers: 3, maxPlayers: 10, duration: '12 min', color: 'purple', available: true, mode: 'answers',
  },
  {
    slug: 'charades',
    title: 'Charades',
    eyebrow: 'ACT · GUESS · SCORE',
    description: 'The classic, ready to play: private prompts, balanced teams, timed turns, and no rules expert required.',
    players: '4–10', minPlayers: 4, maxPlayers: 10, duration: '15 min', color: 'red', available: true, mode: 'charades',
  },
  {
    slug: 'fishbowl',
    title: 'Fishbowl',
    eyebrow: 'DESCRIBE · ONE WORD · ACT',
    description: 'Write the bowl together, then guess the same phrases through three increasingly impossible rounds.',
    players: '4–10', minPlayers: 4, maxPlayers: 10, duration: '30 min', color: 'blue', available: true, mode: 'fishbowl',
  },
  {
    slug: 'who-am-i',
    title: 'Who Am I?',
    eyebrow: 'ASK · DEDUCE · GUESS',
    description: 'Everyone can see your secret identity except you. Ask the room yes-or-no questions until it clicks.',
    players: '3–10', minPlayers: 3, maxPlayers: 10, duration: '15 min', color: 'yellow', available: true, mode: 'identity',
  },
  {
    slug: 'categories',
    title: 'Categories',
    eyebrow: 'THINK · WRITE · STAND APART',
    description: 'One letter, five categories, ninety seconds. Matching someone else is the only wrong answer.',
    players: '3–10', minPlayers: 3, maxPlayers: 10, duration: '12 min', color: 'purple', available: true, mode: 'categories',
  },
  {
    slug: 'two-truths',
    title: 'Two Truths & a Lie',
    eyebrow: 'WRITE · QUESTION · DECEIVE',
    description: 'Take the hot seat with three claims about yourself. Everyone else has to find the fiction.',
    players: '3–10', minPlayers: 3, maxPlayers: 10, duration: '20 min', color: 'green', available: true, mode: 'truths',
  },
  {
    slug: 'signal-lost',
    title: 'Signal Lost',
    eyebrow: 'CLUE · CANCEL · CONNECT',
    description: 'Send one-word clues without echoing the room. Matching signals vanish before the receiver guesses.',
    players: '3–10', minPlayers: 3, maxPlayers: 10, duration: '18 min', color: 'blue', available: true, mode: 'signal',
  },
  {
    slug: 'writers-room',
    title: 'Writer’s Room',
    eyebrow: 'WRITE · PITCH · REVEAL',
    description: 'One player directs the scene. Everyone else secretly pitches the next twist; the favorite gets the credit.',
    players: '3–10', minPlayers: 3, maxPlayers: 10, duration: '22 min', color: 'red', available: true, mode: 'writers',
  },
  {
    slug: 'doodle-relay',
    title: 'Doodle Relay',
    eyebrow: 'READ · DRAW · MISUNDERSTAND',
    description: 'Pass a phrase around the table by alternating drawings and guesses, then replay exactly where it went off the rails.',
    players: '4–10', minPlayers: 4, maxPlayers: 10, duration: '25 min', color: 'yellow', available: true, mode: 'relay',
  },
  {
    slug: 'night-shift',
    title: 'Night Shift',
    eyebrow: 'PROPOSE · TRUST · SABOTAGE',
    description: 'Build mission crews around the table while hidden saboteurs decide whether to help—or quietly break the station.',
    players: '5–10', minPlayers: 5, maxPlayers: 10, duration: '30 min', color: 'purple', available: true, mode: 'night',
  },
  {
    slug: 'human-scale',
    title: 'Human Scale',
    eyebrow: 'CLUE · COMPARE · LINE UP',
    description: 'Give an example for your secret position, then arrange the whole room from one extreme to the other.',
    players: '3–10', minPlayers: 3, maxPlayers: 10, duration: '12 min', color: 'green', available: true, mode: 'lineup',
  },
  {
    slug: 'secret-settlers',
    title: 'Secret Settlers',
    eyebrow: 'TRADE · SCHEME · SETTLE',
    description: 'Private side missions for your longest game of the night.',
    players: '3–6', minPlayers: 3, maxPlayers: 6, duration: 'Companion', color: 'yellow', available: true, mode: 'missions',
  },
];

export const playableGames = games.filter((game) => game.available);

export function getGame(slug: string) {
  return games.find((game) => game.slug === slug);
}
