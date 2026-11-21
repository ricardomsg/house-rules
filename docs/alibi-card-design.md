# Alibi Club card design

> Historical v0.2.0 design record. A later card-by-card review replaced this selection and supersedes its approval claims. Retired cards remain in source only for saved-session compatibility.

Reviewed 5 October 2026. This is a content design note, not a record of live group playtesting.

## What makes these memories playable

The game is about proving that you share a memory without teaching the outsider the whole story. The new deck contains 40 original incidents, each with a setting, one disruption, and three concrete details. The English memories contain 25–30 words; the European Portuguese versions contain 24–32 words. That is a reading-load target for the requested ten-second reveal, not a guarantee that every player reads at the same speed.

Players can ask about a person, an object, a sound, a reaction, or the absurd incident. Each memory supplies specific answers while leaving room to invent a personal reaction. No card requires knowledge of a celebrity, historical trivia, a real confession, physical performance, or disclosure about another player. Forgetfulness is intended to create suspicion and comedy; it should not become proof of guilt.

The tone mixes mundane Portuguese situations with ridiculous escalation, mild adult innuendo, and non-graphic dark humour. Funerals involve slapstick administration; dating, divorce, and honeymoon jokes concern fictional situations. There are no explicit sexual descriptions, protected-group punchlines, or real tragedies. Not every card uses adult humour: variation prevents every round feeling like the same joke.

The Portuguese copy is adapted rather than mechanically literal: condomínio, repartição de finanças, agrafador, rececionista, casa de banho, and despedida de solteiro are examples. The prompts use brief declarative sentences and concrete visual hooks.

## Inspiration and differences

House Rules is an independent project and is not affiliated with, endorsed by, or sponsored by the games or publishers named here.

The official [Spyfall rulebook](https://cdn.shopify.com/s/files/1/0464/6961/1676/files/Spyfall1_Rules_compressed.pdf?v=1721920618), linked from [publisher Cryptozoic's product page](https://cryptozoic.com/products/spyfall-game), describes the useful tension between answers vague enough to protect the shared secret and specific enough to establish credibility. That principle informed the question prompts. The rulebook also removes a played location deck from the current game, supporting a no-repeat queue as a useful replayability approach.

These incident texts are original, not copied or translated commercial cards. Alibi Club's ten-second disappearing memory and editable voting during discussion are this app's requested rules, not claims about Spyfall's rules. The deck does not add Spyfall's location-guessing win condition.

## Preventing accidental clues

All 40 added cards deliberately share the neutral public title “A night to remember” / “Uma noite para recordar”. Their instruction and note are identical and do not mention the incident or any particular detail. A colourful incident title left on screen would let players reconstruct a memory after the reveal. Stable numbered titles would also allow experienced players to associate an identifier with its secret; this deck avoids that unnecessary clue.

Only `regular` contains the shared incident. `outsider` is identical across the deck. The runtime must hide and clear the regular prompt after the read phase, including after refresh/reconnect. This data module alone does not implement timed hiding or prevent a determined person from inspecting a publicly distributed source deck.

## Integration

`lib/alibi-cards.ts` exports `alibiCards` and `alibiCardTranslations`. The integration appends the 40 new cards after the original six in `lib/game-content.ts`, producing **46 cards**. Keeping the original prefix preserves the meaning of indices in saved rounds and room card history. Do not reorder or replace that prefix. The new translation mappings are merged into `lib/pt-pt.json`; the content module does not re-export the translation map.

The legacy six have incident-specific titles and notes. The route suppresses the Alibi title before results and suppresses the note throughout; it removes the private memory once briefing ends. That runtime boundary prevents the legacy metadata from refreshing the hidden memory during discussion. Results can reveal the incident after voting has finished. The 40 new incidents contribute 44 distinct translated strings because their other four fields are shared. Card identity and repeat tracking use stable indices, not title uniqueness.

Room repeat prevention is now implemented by `room_card_history` and migration `0004_room_card_history.sql`. It survives ending, restarting, and switching games within the same room. Cards used before this tracking existed, whose game state was already deleted, cannot be reconstructed.

## Review and validation

All 40 English and Portuguese incidents were reviewed for the setting/disruption/detail structure, natural European Portuguese, coherent imagery, a plausible indirect question, original wording, and the tone boundaries above. Automated inspection verified 40 unique English prompts, translations for every exported card field, and the word-count bounds above. This is content review, not empirical proof of fun; a real group should report any card that is confusing, too much to read, or flat.

After integration, run the repository's i18n check and gameplay tests. Specifically exercise a second round, host skip, exhaustion of the no-repeat queue, and reconnection after the memory timer expires. The content change itself does not implement those behaviours.
