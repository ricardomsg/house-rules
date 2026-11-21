import fs from 'node:fs';
import { importTypeScript } from './load-typescript.mjs';
const content = await importTypeScript('lib/game-content.ts');
const { activeOutsiderCards } = await importTypeScript('lib/card-catalog.ts');
import { games } from '../lib/games.ts';
import { gameGuides } from '../lib/game-guides.ts';

const translations = JSON.parse(fs.readFileSync(new URL('../lib/pt-pt.json', import.meta.url), 'utf8'));
const missing = new Set();

function check(value) {
  if (typeof value === 'string') {
    if (/[A-Za-z]/.test(value) && !translations[value]) missing.add(value);
    return;
  }
  if (Array.isArray(value)) return value.forEach(check);
  if (value && typeof value === 'object') Object.values(value).forEach(check);
}

check(content);
check(games);
check(gameGuides);

if (missing.size) throw new Error(`Missing Portuguese copy for:\n${[...missing].join('\n')}`);

const sharedPortugueseTerms = new Set(['ANIMAL', 'lava', 'cinema', 'Wi-Fi', 'wifi', 'router', 'Piano', 'metal', 'Chocolate', 'Karaoke', 'lunar']);
const untranslatedContent = new Set();

function checkTranslated(value) {
  if (typeof value === 'string') {
    if (/[A-Za-z]/.test(value) && translations[value] === value && !sharedPortugueseTerms.has(value)) untranslatedContent.add(value);
    return;
  }
  if (Array.isArray(value)) return value.forEach(checkTranslated);
  if (value && typeof value === 'object') Object.values(value).forEach(checkTranslated);
}

const translatableContent = { ...content };
delete translatableContent.categoryLetters;
delete translatableContent.identityDeck;
checkTranslated(translatableContent);

if (untranslatedContent.size) throw new Error(`Game content still appears untranslated in Portuguese:\n${[...untranslatedContent].join('\n')}`);

const signalVocabulary = {
  plane: 'avião', keys: 'teclas', Honey: 'Mel', running: 'corrida', net: 'rede',
  Snowman: 'Boneco de neve', Sandcastle: 'Castelo de areia', Waterfall: 'Cascata',
  Notebook: 'Bloco de notas', Magnet: 'Íman', Camera: 'Câmara',
};

for (const [source, expected] of Object.entries(signalVocabulary)) {
  if (translations[source] !== expected) throw new Error(`Expected ${source} to use European Portuguese “${expected}”, received “${translations[source]}”.`);
}

const counts = {
  'Devil’s Advocate': content.devilsAdvocateStatements.length,
  'Scene Stealer': activeOutsiderCards('scene-stealer').length,
  'Alibi Club': activeOutsiderCards('alibi-club').length,
  'House Rule': activeOutsiderCards('house-rule').length,
  'Head Fake': activeOutsiderCards('head-fake').length,
  'Same Page': content.samePageQuestions.length,
  'Charades': content.charadesPrompts.length,
  'Fishbowl': 'player-written',
  'Who Am I?': content.identityDeck.length,
  'Categories': `${content.categorySets.length} sets × ${content.categoryLetters.length} letters`,
  'Two Truths & a Lie': 'player-written',
  'Signal Lost': content.signalDeck.length,
  'Writer’s Room': content.writersRoomDeck.length,
  'Doodle Relay': content.doodleRelayPrompts.length,
  'Night Shift': '2 roles / 5 missions',
  'Human Scale': content.humanScales.length,
  'Secret Settlers': content.settlerMissions.length,
};

console.log('Portuguese coverage complete.');
console.table(counts);

// Check the effective dictionary and the actual room UI, including API errors.
const { translateCopy, localizeGameView } = await importTypeScript('lib/i18n.ts');
const { default: assert } = await import('node:assert/strict');
const { default: ts } = await import('typescript');
const untranslatedUI = new Set();
const sameCopy = new Set(['Banana ✓', 'EN', 'PT', 'PTS', 'S']);
function checkUI(copy) {
  const source = copy.trim();
  if (/[A-Za-z]/.test(source) && translateCopy(source, 'pt-PT') === source && !sameCopy.has(source)) untranslatedUI.add(source);
}
for (const file of ['app/page.tsx', 'app/room/[code]/GameRecovery.tsx', 'app/room/[code]/page.tsx', 'app/room/[code]/GameBoard.tsx', 'app/room/[code]/DevilsAdvocateBoard.tsx', 'app/room/[code]/GameHelp.tsx', 'app/room/[code]/HostControls.tsx', 'app/room/[code]/RoomScoreboard.tsx', 'app/api/rooms/[code]/game/route.ts', 'app/api/rooms/[code]/join/route.ts']) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function literal(node) {
    if (ts.isStringLiteral(node)) checkUI(node.text);
    else if (ts.isConditionalExpression(node)) { literal(node.whenTrue); literal(node.whenFalse); }
  }
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(tree) === 't' && node.arguments[0]) literal(node.arguments[0]);
    if (ts.isPropertyAssignment(node) && node.name.getText(tree) === 'error') literal(node.initializer);
    ts.forEachChild(node, visit);
  }
  visit(tree);
}
assert.deepEqual([...untranslatedUI], [], 'Untranslated room interface or errors');
const playerView = {
  game: { title: 'Signal Lost', slug: 'signal-lost', mode: 'signal', color: 'blue' },
  phase: 'signal-guess', players: [{ id: 'one', name: 'Honey', isHost: true }],
  receiverName: 'Camera', signalTarget: 'Honey', ownSignalClue: 'Camera',
  signalClues: [{ playerId: 'one', clue: 'Magnet' }], ownAnswer: 'Waterfall',
  ownPrompts: ['Honey', 'Camera'], fishbowlPrompt: 'Magnet', truthStatements: ['Honey', 'Camera', 'Magnet'],
  writersPitches: [{ playerId: 'one', pitch: 'Camera' }], ownWritersPitch: 'Honey',
  ownCategoryAnswers: ['Camera'], relaySourceText: 'Honey',
  relayRevealChain: { prompt: 'Honey', entries: [{ playerId: 'one', kind: 'guess', value: 'Camera' }] },
  result: { answerGroups: [{ answer: 'Honey', playerIds: ['one'] }], writersWinningPitch: 'Magnet', signalGuess: 'Camera' },
  nightVotes: [{ playerId: 'one', vote: 'approve' }], nightDebrief: { audit: { action: 'jam' } },
};
const localized = localizeGameView(playerView, 'pt-PT');
assert.equal(localized.game.title, 'Sinal Perdido');
assert.equal(localized.signalTarget, 'Mel');
for (const key of ['players', 'receiverName', 'ownSignalClue', 'signalClues', 'ownAnswer', 'ownPrompts', 'fishbowlPrompt', 'truthStatements', 'writersPitches', 'ownWritersPitch', 'ownCategoryAnswers', 'relaySourceText', 'result', 'nightVotes', 'nightDebrief']) assert.deepEqual(localized[key], playerView[key], `${key}: player input or game semantics must not change`);
assert.equal(localized.relayRevealChain.entries[0].value, 'Camera');
assert.deepEqual(localizeGameView(playerView, 'en'), playerView);
assert.equal(translateCopy('{name} gets top billing.', 'pt-PT', { name: 'Honey' }), 'Honey fica no topo dos créditos.');
assert.equal(translateCopy('Categories needs at least 3 players.', 'pt-PT'), 'Categorias precisa de pelo menos 3 jogadores.');
assert.equal(translateCopy('Night Shift supports up to 10 players.', 'pt-PT'), 'Turno da Noite permite no máximo 10 jogadores.');
assert.equal(translateCopy('Choose exactly 3 different players for this mission.', 'pt-PT'), 'Escolhe exatamente 3 jogadores diferentes para esta missão.');
for (const [source, target] of Object.entries({ 'SECONDS LEFT': 'SEGUNDOS RESTANTES', 'SUBMIT MY SHEET →': 'ENVIAR AS MINHAS RESPOSTAS →', 'THE LIE': 'A MENTIRA', 'JAMS': 'SABOTAGENS', 'A printer with a paper jam': 'Uma impressora com papel encravado', 'Bear ✓': 'Burro ✓' })) assert.equal(translateCopy(source, 'pt-PT'), target);
assert.equal(gameGuides.length, games.length);
for (const guide of gameGuides) {
  assert.ok(guide.steps.length >= 4 && guide.setup && guide.scoring && guide.example);
  for (const text of [guide.summary, guide.setup, guide.scoring, guide.example, ...guide.steps]) assert.ok(!/\b(gravata|compotas|empanada|arremesso|Crew|Saboteurs|Round|Bear|Crater|Pompeii)\b/.test(translateCopy(text, 'pt-PT')), `${guide.slug}: mistranslated guide`);
}
console.log('PASS: room interface, errors, all guides, interpolation, European Portuguese vocabulary and preservation of player-written text.');

const { recoveryOptions } = await importTypeScript('lib/game-recovery.ts');
for (const option of Object.values(recoveryOptions)) {
  assert.notEqual(translateCopy(option.label, 'pt-PT'), option.label);
  assert.notEqual(translateCopy(option.explanation, 'pt-PT'), option.explanation);
}
assert.equal(translateCopy("Who's hosting?", 'pt-PT'), 'Quem vai organizar?');
assert.equal(translateCopy("We only need a name. You'll get a room code to share with everyone else.", 'pt-PT'), 'Só precisamos do teu nome. Recebes um código de sala para partilhar com o grupo.');
