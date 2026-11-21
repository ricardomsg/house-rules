# House Rule deck design

> Historical v0.2.0 design record. A later card-by-card review replaced this selection and supersedes its approval claims. Retired cards remain in source only for saved-session compatibility.

Date: 2026-10-05. Original bilingual English / European Portuguese writing. These cards add 42 conversational rules after the seven-card starter deck, producing **49 cards**; they do not copy commercial cards.

## Why these rules

The intended pleasure is noticing a pattern while trying to sound like everyone else, then accusing someone who is improvising without the pattern. The funny answer should do double duty: obey a simple rule and create a ridiculous image. A rule must be observable in a spoken answer, have many possible answers, and be possible to explain in one sentence. Each private regular-player prompt contains one example; players are explicitly told to invent different answers.

The publisher's [The Chameleon explanation](https://bigpotato.com/products/the-chameleon) describes shared secret information, spoken contributions and a player trying to blend in. [Looney Labs' Zendo explanation](https://www.looneylabs.com/games/zendo) explains learning a secret rule from examples and testing guesses. These sources informed the inference loop, not this deck's wording or scenarios. Neither source establishes that our cards are playtested or balanced.

## Content decisions

- Public titles are neutral numbered conversations, so titles do not disclose a category or secret rule. On replay the host should skip remembered cards; persistent repeat avoidance belongs in the game engine.
- Rules cover semantic categories, sentence structure, time, grammatical perspective, sounds, invented words, and rhetorical moves. They avoid subjective personality impersonation, exact letter counts, dependence on previous questions, physical gestures and detailed memory.
- Starter questions are fictional and deliberately fertile: haunted hotels, incompetent heroes, awkward romance, bureaucracy and petty villains. Nobody needs to disclose sexual experiences or embarrass another player. Adult innuendo and mild dark humour remain possible without making every answer a sex joke.
- Portuguese examples were authored for Portuguese rather than translated mechanically: pastel de nata, livro de reclamações, piaçaba, autorização da câmara and desavacalhómetro. The rhyme card uses a Portuguese rhyme, not an English sound dependency.
- All cards use one common flow: a first lap with the starter question, then follow-ups. The host does not need to invent a new exercise for each card.
- Most categorical rules allow subtle answers; a smaller set of repeated-phrase rules is intentionally easy. At five or six players, a full lap gives the outsider useful evidence. More experienced groups can skip rules they find obvious. Voting should not require declaring the exact rule.

## Integration

Append `houseRuleCards` after the original seven cards in `lib/game-content.ts` for `outsiderDecks['house-rule']`. Preserve the original indices so saved rounds and persistent room card history keep referring to the same rule. Merge `houseRulePtPT` into the Portuguese translation dictionary in `lib/i18n.ts` (or serialize those mappings into `lib/pt-pt.json`). The type-only import of `OutsiderCard` is erased at runtime, avoiding a runtime circular dependency.

Validate that all five displayed fields translate, the private example remains private until the reveal, and neutral titles do not accidentally get replaced with secret hints. The legacy seven retain their original rules; the 42 additions each have a private example. The route suppresses public titles before results. Host skipping and persistent room repeat avoidance are integrated engine changes; migration `0004_room_card_history.sql` stores room history. Previously ended games whose state was deleted before tracking began cannot be reconstructed.

## Review limits

Reviewed for distinct rules, single-turn execution, readable Portuguese, matching examples and open-ended starters. This is editorial review, not evidence from a live group. A five/six-player playtest should check whether outsiders receive enough examples before everyone votes, whether the rhyme card slows people down, and whether the more abstract sales-pitch and disclaimer rules need shortening. No production changes or live messages were made for this deck task.
