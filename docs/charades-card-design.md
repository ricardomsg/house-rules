# Mímica: original deck expansion

Date: 2026-10-05. Added 110 original bilingual prompts in `lib/charades-cards.ts`: 40 actions, 30 characters, 20 animals and 20 objects. The integrated deck has **173 cards**: the original 63 retain their indices and remain the prefix of the full deck.

## Research and game fit

House Rules is an independent project and is not affiliated with, endorsed by, or sponsored by the games or publishers named here.

The publisher's [Time's Up Deluxe rules](https://rnrgames.com/Content/RRGames/images/ProductRules/timeseupdeluxerules.pdf) describe short timed team turns, acting without words in the final round, moving quickly to another card when stuck, and distinct roles for actor and guessing team. Its final round permits sound effects and depends on earlier rounds' familiarity; those rules are not identical to this app. [Repos Production's official Time's Up Party page](https://www.rprod.com/en/games/times-up-party) provides the companion publisher reference. Sources consulted 5 October 2026.

For this app's stricter silent Mímica, every new prompt is designed to work from movement and expression alone on first encounter. No commercial cards were copied. No prompt requires spoken words, spelling, a number, recognising an obscure celebrity, playing a sound, handling a real prop, or performing a stunt. This is an editorial evaluation, not a claim that a physical group has verified every card.

## Selection criteria

A useful prompt gives the actor a recognisable base action and at most one complication: brushing teeth while answering the door, a spy losing a moustache, a toaster launching toast. The group should be able to recognise the central idea even if it describes the scene in different words. The actor and team judge successful guesses; exact sentence recitation should not be required.

The easy prompts rely on a familiar movement or silhouette. Medium prompts combine a familiar creature/person/object with a second action, or ask the actor to embody an object. Difficulty is an editorial estimate and does not alter scoring.

The comedy comes from physical inconvenience, failed dignity, romantic awkwardness, mildly dark fantasy characters, and absurd reversals. A chicken discovering a fried egg and the Grim Reaper mowing a lawn provide dark jokes without requiring violence or graphic content. Lipstick on a collar and checking one's breath before a kiss add adult social humour without explicit sexual instructions.

All actions are pretend. Falling, spinning chairs, heat, sharp tools, swallowing food, and actual contact are unnecessary: use hand movements and expressions to represent them. A seated interpretation is valid. Do not require players to imitate a protected group, a medical condition, or a real person's disability for laughs.

## Portuguese review

Prompts use Portuguese from Portugal: «edredão», «prenda», «sanita», «pequeno-almoço», «corta-relva», «auscultadores», «bolotas» for the squirrel's food, and familiar descriptions instead of English idioms. The cuckoo clock, miniature dog invitation, dental vampire and other situations retain recognisable visual hooks across languages. Compound English concepts are expanded when Portuguese needs the extra context, such as «caixa de surpresas» for the spring-loaded box toy.

## Validation and integration

Exports are `additionalCharadesCards` with the existing `{ prompt, category, difficulty }` shape and `charadesCardTranslations` with every prompt's Portuguese translation. Append the cards after the existing array and merge translations into the shared dictionary; the existing category and difficulty translations remain valid.

Automated review checks prompt uniqueness within the additions and against the existing deck, valid categories/difficulties, and complete Portuguese coverage. Full gameplay checks should cover pass, correct answer, turn expiry, end/restart, and deck exhaustion without redisplaying a previously seen card in the same room.

Physical playtesting remains outstanding. For a group of five or six, record cards requiring an explanation after a pass, cards consistently guessed immediately, and translations people paraphrase because the wording is unnatural. Object cards and two-part fantasy cards merit particular attention. Passing must remain immediate so an unfamiliar card never consumes the whole turn.
