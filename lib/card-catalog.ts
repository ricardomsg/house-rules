import { outsiderDecks } from './game-content';
import { retiredAlibiCardIndices } from './alibi-reviewed-cards';
import { retiredHouseRuleCardIndices } from './house-rule-reviewed-cards';
import { retiredHeadFakeCardIndices, headFakeTitleOverrides, reviewedHeadFakeCards } from './head-fake-reviewed-cards';

// Historical array positions are persisted in rooms. Retirement removes cards
// from future deals and the library without changing an already dealt incident.
const retired: Record<string, ReadonlySet<number>> = {
  'alibi-club': new Set(retiredAlibiCardIndices),
  'house-rule': new Set(retiredHouseRuleCardIndices),
  'head-fake': new Set(retiredHeadFakeCardIndices),
};
export function isRetiredCard(slug: string, index: number) {
  return retired[slug]?.has(index) ?? false;
}
export function outsiderCard(slug: string, index: number) {
  const card = outsiderDecks[slug][index];
  const title = slug === 'head-fake' ? headFakeTitleOverrides[index] : undefined;
  return slug === 'head-fake' ? { ...card, title: title ?? card.title, instruction: reviewedHeadFakeCards[0].instruction } : card;
}
export function activeOutsiderCards(slug: string) {
  return (outsiderDecks[slug] ?? []).flatMap((_, index) => isRetiredCard(slug, index) ? [] : [{ index, card: outsiderCard(slug, index) }]);
}
