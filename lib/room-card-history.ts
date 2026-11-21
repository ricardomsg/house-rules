import { isRetiredCard } from './card-catalog';
import { getDatabase } from '@/db';
import { categoryLetters, categorySets, charadesPrompts, devilsAdvocateStatements, doodleRelayPrompts, humanScales, identityDeck, outsiderDecks, samePageQuestions, settlerMissions, signalDeck, writersRoomDeck } from './game-content';

type CardState = { slug: string; contentIndex: number; usedCardIndices?: number[]; missionIndices?: Record<string, number>; identityIndices?: Record<string, number>; categoryLetterIndex?: number; categorySetIndex?: number; advocatePromptOrder?: number[]; advocateIndex?: number; charadesPromptOrder?: number[]; charadesPromptCursor?: number; signalPromptOrder?: number[]; signalReceiverIndex?: number; writersPromptOrder?: number[]; writersDirectorIndex?: number; relayChains?: { prompt: string }[]; phase: string };
export function deckSize(slug: string) {
  return outsiderDecks[slug]?.length ?? ({ 'same-page': samePageQuestions.length, 'human-scale': humanScales.length, charades: charadesPrompts.length, 'who-am-i': identityDeck.length, categories: categoryLetters.length * categorySets.length, 'devils-advocate': devilsAdvocateStatements.length, 'secret-settlers': settlerMissions.length, 'signal-lost': signalDeck.length, 'writers-room': writersRoomDeck.length, 'doodle-relay': doodleRelayPrompts.length } as Record<string, number>)[slug];
}
export function seenCardIndices(s: CardState): number[] {
  let indices: (number | undefined)[] = [];
  if (outsiderDecks[s.slug]) indices = s.usedCardIndices ?? [s.contentIndex];
  else if (['same-page', 'human-scale'].includes(s.slug)) indices = [s.contentIndex];
  else if (s.slug === 'secret-settlers') indices = Object.values(s.missionIndices ?? {});
  else if (s.slug === 'who-am-i') indices = Object.values(s.identityIndices ?? {});
  else if (s.slug === 'categories') indices = [(s.categorySetIndex ?? 0) * categoryLetters.length + (s.categoryLetterIndex ?? 0)];
  else if (s.slug === 'devils-advocate') indices = s.advocatePromptOrder?.slice(0, (s.advocateIndex ?? 0) + (s.phase === 'advocate-ready' ? 0 : 1)) ?? [];
  else if (s.slug === 'charades') indices = s.charadesPromptOrder?.slice(0, (s.charadesPromptCursor ?? 0) + (s.phase === 'charades-turn' ? 1 : 0)) ?? [];
  else if (s.slug === 'signal-lost') indices = s.signalPromptOrder?.slice(0, (s.signalReceiverIndex ?? 0) + 1) ?? [];
  else if (s.slug === 'writers-room') indices = s.writersPromptOrder?.slice(0, (s.writersDirectorIndex ?? 0) + 1) ?? [];
  else if (s.slug === 'doodle-relay') indices = s.relayChains?.map(c => (doodleRelayPrompts as readonly string[]).indexOf(c.prompt)) ?? [];
  return [...new Set(indices.filter((i): i is number => typeof i === 'number' && i >= 0))];
}
export async function unseenCards(roomId: string, slug: string, previous?: CardState) {
  const size = deckSize(slug);
  if (!size) return [];
  const rows = await getDatabase().prepare('SELECT card_index AS cardIndex FROM room_card_history WHERE room_id = ? AND slug = ?').bind(roomId, slug).all<{ cardIndex: number }>();
  const seen = new Set([...rows.results.map(r => r.cardIndex), ...(previous?.slug === slug ? seenCardIndices(previous) : [])]);
  const remaining = Array.from({ length: size }, (_, i) => i).filter(i => !seen.has(i) && !isRetiredCard(slug, i));
  for (let i = remaining.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [remaining[i], remaining[j]] = [remaining[j], remaining[i]]; }
  return remaining;
}
export function cardHistoryStatement(roomId: string, state: CardState, sessionId: string, version: number) {
  const indices = seenCardIndices(state);
  if (!indices.length) return null;
  return getDatabase().prepare(`INSERT OR IGNORE INTO room_card_history (room_id, slug, card_index)
    SELECT ?, ?, CAST(value AS INTEGER) FROM json_each(?)
    WHERE EXISTS (SELECT 1 FROM game_sessions WHERE id = ? AND version = ?)`)
    .bind(roomId, state.slug, JSON.stringify(indices), sessionId, version);
}
