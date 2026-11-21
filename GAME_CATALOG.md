# House Rules: Game Catalog

Last updated: 4 October 2026

This is the morning-after guide to everything currently playable in House Rules. You should be able to understand the full experience without opening a room or playing a round.

## What House Rules is

House Rules is a mobile-first game-night hub. One person creates a room and shares its four-letter code or direct link. Everyone joins from a browser. Phones deliver private information, collect simultaneous answers or votes, and keep score; the important part of every game still happens between the people in the room.

The current release supports 3–10 active players depending on the game. A ten-player table has been exercised across every game that supports ten, including concurrent room joins, private views, answer submission, voting, timed team turns, reveals, scoring, and repeat rounds. Secret Settlers is separately exercised at its six-player maximum.

## Testing by yourself

The room host can use **Solo Playtest** without gathering other people or opening private browser windows:

1. Create a normal room.
2. Under the player list, expand **Testing by yourself?** and choose **Fill to 5 players**. Four simulated phones join, which is enough to start every current game.
3. Start a game normally.
4. Use the yellow **View phone** switcher at the top of the page to move between the host and each simulated player. Take the action shown on each phone, then switch to the next one.
5. Switch back to the host for host-only actions such as advancing or ending a game.
6. After ending the game, choose **Clear simulated players** in the lobby.

**Fill to 10** is available for checking crowded layouts and maximum-size rounds. Secret Settlers supports no more than six players, so clear the simulated players and fill only to five before starting it.

Solo Playtest uses the real multiplayer and private-view logic; the difference is that one person controls every phone. It is useful for checking rules and mechanics, but cannot replace a real group when judging whether a game is funny, clear, or well-paced.

## Quick chooser

| Game | Players | Mood | Choose it when… |
| --- | ---: | --- | --- |
| Devil’s Advocate | 3–10 | Absurd persuasion, dark humour | Everyone wants one minute to defend a terrible opinion |
| Scene Stealer | 4–10 | Physical improvisation | People are willing to stand up or mime badly |
| Alibi Club | 4–10 | Verbal deduction | The group enjoys bluffing and suspicious questions |
| House Rule | 4–10 | Pattern recognition | You want a lighter, conversational deduction game |
| Head Fake | 4–10 | Fast physical comedy | You want the shortest explanation and quickest laughs |
| Same Page | 3–10 | Simultaneous social guessing | You want everyone involved without putting one person on stage |
| Charades | 4–10 | Classic team acting | You want a familiar physical game with all the admin handled |
| Fishbowl | 4–10 | Escalating team clues | You want player-written prompts and jokes that build over three rounds |
| Who Am I? | 3–10 | Classic yes/no deduction | You want the sticky-note game without preparing any sticky notes |
| Categories | 3–10 | Timed word lists | You want a familiar pen-and-paper race with automatic duplicate scoring |
| Two Truths & a Lie | 3–10 | Personal bluffing | You want stories, interrogation, and a turn in the hot seat for everyone |
| Signal Lost | 3–10 | Cooperative word clues | You want simultaneous clues, suspense, and one shared table score |
| Writer’s Room | 3–10 | Anonymous creative pitching | You want fast improvised stories without performing or drawing |
| Doodle Relay | 4–10 | Drawing telephone | You want everyone creating at once and a reveal full of accumulated mistakes |
| Night Shift | 5–10 | Full hidden-role deduction | You want evolving evidence, team votes, and no player elimination |
| Human Scale | 3–10 | Cooperative clue ordering | You want the room working together and moving around |
| Secret Settlers | 3–6 | Long-form secret objectives | You are already playing a resource-trading board game |

## Shared conventions

- The host chooses and advances the game.
- Each private brief is hidden behind a deliberate reveal button, can be hidden again, and closes automatically when the phase changes.
- A player may change a vote until the host reveals it.
- Deduction votes clearly mark the selected person and show a public voted/waiting roster without exposing anyone's choice.
- If at least two votes are in, the host may reveal before everyone finishes; a confirmation explains exactly how many absent votes will be discarded.
- Phones poll the room automatically, so everyone moves into the next phase together.
- The score strip stays visible through the game.
- The host can end a game and return everyone to the shelf.
- An outsider earns 2 points for escaping. Correct voters earn 1 point when the outsider is caught.

## If someone gets stuck

The host can expand **Someone stuck?** below the current game to continue with received responses, skip an absent performer, or reveal a drawing relay early. The confirmation describes exactly what happens. Secret ballots remain private. A canceled Night Shift mission is retried with a new team; missing actions are not treated as successes or sabotage.

If the host has been offline for at least a minute, another seated player can choose **Take over hosting**. The returning host remains a player. A temporarily disconnected phone refreshes when it reconnects; keep using the same browser and room address to retain the seat.

Devil’s Advocate can continue with partial ratings. Its average uses only received ratings, and a turn with no ratings is shown as unrated. The host may also finish a defense early. Fishbowl can start with the prompts received, or a small Portuguese house deck if nobody submitted any. These are explicit ways to keep playing, not automatic changes to the normal rules.

## Languages and card inventory

Every built-in card is available in English and European Portuguese. The **EN / PT** control remembers the choice on each phone, so people in the same room may use different languages. Player-written answers, Fishbowl prompts, truths, clues, and pitches stay exactly as their authors entered them.

The complete collection is also browsable outside a room at the **`/cards`** page of your House Rules site. Use the game selector or search box to find a card quickly; answers and hidden-role material stay behind a spoiler button.

| Game | Built-in variants |
| --- | ---: |
| Scene Stealer | 8 scene pairs |
| Alibi Club | 9 incidents |
| House Rule | 7 hidden rules |
| Head Fake | 17 movement pairs |
| Same Page | 30 questions |
| Charades | 173 prompts |
| Fishbowl | Player-written: 2 prompts per player per match |
| Who Am I? | 142 identities |
| Categories | 12 category sets × 20 letters = 240 combinations |
| Two Truths & a Lie | Player-written: 3 statements per storyteller |
| Signal Lost | 50 targets |
| Writer’s Room | 42 scene setups |
| Doodle Relay | 60 opening phrases |
| Night Shift | 2 role cards; 5 fixed mission stages with player-count variants |
| Human Scale | 48 scales |
| Secret Settlers | 18 missions |
| Devil’s Advocate | 160 statements |

The built-in decks and both language versions are stored with the site’s versioned source, not in the live database. This makes every deployment reproducible and lets automated checks guarantee complete translation coverage. The database stores only live room data: players, selected card indices, private submissions, votes, scores, and round progress.

---

## 1. Scene Stealer

**Players:** 4–10  
**Typical time:** 10 minutes  
**Energy:** Physical, theatrical, suspicious

### The idea

Everyone performs the same scene simultaneously, except one player has received a related but different scene. The two situations are deliberately close enough to create plausible overlap.

### A round

1. Each player privately reveals a scene on their phone.
2. Everyone puts their phone down.
3. The group performs together for 15–20 seconds. The brief specifies whether speech or sound effects are allowed.
4. Players discuss gestures or reactions that did not belong.
5. Everyone votes privately for the suspected outsider.
6. The site reveals both scenes, the outsider, the vote tally, and updated scores.

### Example

The group sees: “You are conducting a dramatic orchestra.”  
The outsider sees: “You are controlling an unruly swarm of bees.”

Both produce wide arm movements, urgency, and attempts to control something. Small choices—using a baton, protecting one’s face, following a rhythm—create the evidence.

### Why it should work

The outsider is not left with a blank prompt, so they can perform confidently rather than freezing. The comedy comes from an interpretable mismatch instead of deliberate sabotage. It also recreates the spirit of the synchronized-headphones idea without requiring licensed music or perfect audio timing.

### Current content

Eight curated scene pairs, including orchestra/bees, chefs/surgeons, astronauts/submarine crew, and bomb squad/electricians.

---

## 2. Alibi Club

**Players:** 4–10  
**Typical time:** 12 minutes  
**Energy:** Conversational, deductive, bluff-heavy

### The idea

Most players share a vivid memory of a fictional incident: its location, what went wrong, and several strange details. One uninvited player sees none of it and must build an alibi from the group’s questions and answers.

### A round

1. Most players read the incident. The outsider learns only that they were not there.
2. Everyone puts their phone down.
3. Players question one another about the event without directly naming the location.
4. Innocent players balance two risks: vague answers look guilty; overly specific answers teach the outsider.
5. The table votes for the person whose story feels assembled rather than remembered.
6. The site reveals the full incident, outsider, votes, and scores.

### Example

“You were at an aquarium after midnight. The lights went out, an alarm sounded near the shark tunnel, and someone was carrying a red umbrella.”

Useful questions include “What could you hear?”, “Where would you least want to hide?”, and “Who looked most out of place?”

### Why it should work

The strange details give innocent players several ways to prove knowledge while producing memorable conversation. Unlike a pure location-guessing game, the shared event creates a tiny story that players elaborate together.

### Current content

Nine incidents, including a stopped heist, a funeral rehearsal, an invisible masterpiece, a familiar ghost, an anniversary ambush, and a forgotten microphone.

---

## 3. House Rule

**Players:** 4–10  
**Typical time:** 10 minutes  
**Energy:** Observational, verbal, quietly chaotic

### The idea

Almost everyone knows a conversational or behavioral rule. The outsider must identify the pattern and imitate it before the group notices they are learning in public.

### A round

1. The group privately reads the rule and starter question.
2. The outsider sees only the instruction to study and blend in.
3. Players take turns answering questions while obeying the rule.
4. The group watches wording, timing, gestures, and who appears to be copying whom.
5. Everyone votes for the person who never quite found the pattern.

### Example

Rule: “Every answer must include the name of something you could eat.”  
Question: “What would you do with a completely free Saturday?”

An innocent player might say, “Sleep late, make pancakes, and meet friends.” The outsider hears food appearing in answers and must decide whether it is the actual rule or coincidence.

### Why it should work

The rule gives every player an active performance constraint but still leaves room for natural conversation. Behavioral rules prevent the game from becoming only a word puzzle.

### Current content

Seven hidden rules set in everyday situations: the night bus, a spare key, a room with a view, a reunion, a long weekend, a new neighbour, and a winning ticket.

---

## 4. Head Fake

**Players:** 4–10  
**Typical time:** 8 minutes  
**Energy:** Physical, immediate, silly

### The idea

Everyone performs a synchronized movement. One player’s instruction describes a visually similar but mechanically different action.

### A round

1. Reveal your movement privately.
2. Start together and continue for the displayed time.
3. Watch the room without abandoning your own performance.
4. Repeat at a changed speed when instructed.
5. Vote for the movement that does not fit.

### Example

Most players mime pulling an extremely heavy rope. The outsider stretches an enormous elastic band. Both pull their hands apart and inward, but posture, resistance, and hand placement differ.

### Why it should work

It is explainable in seconds, creates almost no downtime, and makes accusation depend on physical evidence rather than verbal confidence. It is also friendly to groups who do not enjoy long rules explanations.

### Current content

Seventeen motion pairs built around physically related actions, such as crossed strings, a delicate balance, steady hands, and keeping something out of sight.

---

## 5. Same Page

**Players:** 3–10  
**Typical time:** 12 minutes  
**Energy:** Simultaneous, low-pressure, revealing

### The idea

Everyone privately answers an open-ended question. The goal is not originality—it is predicting what other people in this exact room will write.

### A round

1. Everyone reads the same question.
2. Players submit answers privately and may not negotiate.
3. The host reveals after enough answers are in.
4. The site groups answers while ignoring capitalization, accents, punctuation, and extra spaces.
5. Every player in the largest matching group earns 1 point. Tied largest groups both score. If every answer is unique, nobody scores.

### Example

Question: “What is the best food to eat at midnight?”  
Four players answer “pizza”, two answer “cereal”, and the remaining answers are unique. The pizza group scores.

### Why it should work

Everyone acts simultaneously, there is no trivia knowledge requirement, and the answers reveal how well the group understands itself. It scales cleanly because adding players does not add turn-by-turn downtime.

### Current content

Thirty curated questions spanning preferences, absurd situations, shared cultural assumptions, and observations about the people at the table.

---

## 6. Charades

**Players:** 4–10
**Typical time:** 15 minutes
**Energy:** Classic, physical, beginner-friendly

### The idea

Two teams take turns guessing silent performances. House Rules deals the prompts privately, runs the clock, alternates actors, and keeps score, so nobody needs to know how to organize the classic before the night begins.

### A match

1. The site divides the room into balanced Blue and Red teams. The seating order alternates teams automatically.
2. The host hands control to the next actor and starts a 60-second turn.
3. The actor and the opposing team can see the prompt. The actor’s teammates cannot, and call out as many guesses as they want.
4. The actor or an opposing player taps **Got it** for 1 team point or **Pass** for a fresh prompt, so the actor can keep performing. Passing has no penalty.
5. Every player acts once. The highest-scoring team wins; equal scores produce a draw.

The actor may move and gesture, but may not speak, mouth words, spell, make letter shapes, point at real objects, or search for clues. The other team watches quietly. These rules are repeated inside the handoff screen, so a first-time group does not need a separate explanation.

### Example

Prompt: “Trying to open a stuck jar.”

The actor can grip an imaginary lid, twist, strain, ask an imaginary person for help, and celebrate when it opens. The team keeps shouting until someone finds the exact idea or the actor passes.

### Why it should work

Charades has almost no intellectual barrier: the fun is imperfect physical communication, not knowing trivia or mastering a rulebook. The digital layer removes the awkward prompt-writing and timekeeping but leaves the performance face-to-face. Every player gets exactly one turn, and alternating teams prevents one side waiting through a long block of turns.

### Current content

173 original prompts across actions, characters, animals, objects, and places, labeled easy or medium. The deck is shuffled without repeats during a match, and the prompt is sent only to the current actor and the opposing team.

---

## 7. Fishbowl

**Players:** 4–10
**Typical time:** 30 minutes
**Energy:** Team-based, escalating, callback-heavy

### The idea

Every player secretly writes two recognizable names or phrases. That shared “bowl” is guessed three times: first with free description, then with exactly one clue word, and finally with silent acting. Because the answers repeat, the room’s memories and jokes from earlier rounds become clues of their own.

### Setup

1. The site divides the room into alternating Blue and Red teams.
2. Every player adds two prompts privately. Good prompts are recognizable but interesting: a famous person, fictional character, object, place, action, or short phrase.
3. The host can lock the bowl only after every player has contributed. No prompt is shown publicly during setup.
4. The site shuffles the complete bowl and chooses the first clue-giver.

### The three rounds

1. **Describe it:** Speak freely, but do not say any part of the answer, spell it, or use “sounds like”.
2. **One word:** Say exactly one clue word for each prompt. You may repeat that word, but may not add another.
3. **Act it:** Use silent movement only—no speech, sounds, mouthing, spelling, or pointing at real objects.

During every 45-second turn, only the clue-giver sees the current prompt. Their team shouts unlimited guesses. **Got it** removes the prompt and awards 1 team point; **Pass** moves it to the back without a penalty. The next team continues with whatever remains. When the bowl empties, every prompt returns in a new shuffled order under the next round’s stricter rule.

### Example

Prompt: “Sherlock Holmes.”

- In **Describe it**, the clue-giver might say “A fictional British detective who lives with Doctor Watson.”
- In **One word**, “Watson” may be enough because everyone remembers the earlier description.
- In **Act it**, an exaggerated magnifying-glass mime can recall both earlier rounds.

### Why it should work

The first round teaches the whole table every answer, so beginners are not stranded when the constraints tighten. Repeated prompts create callbacks naturally, and writing the bowl together makes the material specific to the group without requiring a commercial card pack. Team turns provide a little competitive structure while everyone remains engaged by listening for clues they may need later.

### Current implementation

- Two private prompts per player, producing 8–20 prompts depending on room size.
- Balanced teams, 45-second server-backed turns, automatic timeout, pass-to-back behavior, persistent team score, and rotating clue-givers.
- Prompt text is sent only to the active clue-giver’s authenticated view.
- A full ten-player test clears 20 prompts in all three modes, for 60 successful guesses across the match.

---

## 8. Who Am I?

**Players:** 3–10
**Typical time:** 15 minutes
**Energy:** Classic, deductive, conversational

### The idea

Every player receives a familiar identity that everyone else can see. You narrow down your own hidden identity by asking the room one yes-or-no question at a time, or spend a turn attempting the exact guess.

This is the classic sticky-note-on-the-forehead game with the setup handled digitally. Phones still stay private: your screen shows everyone else’s identity, so angle it away from their owners.

### A round

1. The site deals a different identity to every player from a curated deck of musicians, athletes, historical figures, fictional characters, legends, game characters, and television personalities.
2. Everyone studies the other players’ cards. Their own slot contains only a question mark.
3. On the current player’s turn, they ask one question aloud that can be answered **yes**, **no**, or **not sure**—for example, “Am I fictional?”
4. The room agrees, and one other player taps the answer. The turn then moves clockwise so everyone participates evenly.
5. Instead of asking a question, the current player may type who they think they are. A wrong guess uses the turn; a correct guess marks them solved and skips them in future rotations.
6. The round ends when everyone has solved themselves. If the last few identities become frustrating, the host may reveal everyone and end the round.

### Example

Your identity is Sherlock Holmes.

- “Am I real?” — No.
- “Am I originally from a book?” — Yes.
- “Am I a detective?” — Yes.
- Guess: “Sherlock Holmes.” — Correct.

### Scoring

- Solve in 1–3 questions or guesses: **5 points**.
- Solve in 4–6: **3 points**.
- Solve in 7 or more: **1 point**.

Capitalization, punctuation, and accents do not matter. Familiar aliases such as “Ronaldo”, “CR7”, “Santa”, “007”, and “Sonic” are accepted where appropriate.

### Why it should work

Everyone learns the rules in one example question, and the turn rotation prevents one confident player from dominating the deduction. The site eliminates writing and attaching physical labels while preserving the key social behavior: the whole room knows something about you that you do not.

### Current content and reliability

142 curated identities with common alternate names. A ten-player privacy test confirms that each player receives one unique identity, every phone sees exactly nine others, group answers rotate correctly, solved players are skipped, guesses score correctly, and the host reveal route ends stuck rounds safely.

---

## 9. Categories

**Players:** 3–10
**Typical time:** 12 minutes
**Energy:** Classic, simultaneous, quick-thinking

### The idea

Everyone receives the same random letter and five categories. Write one fitting answer for each before ninety seconds expire—but common thinking is punished: only a valid answer nobody else wrote earns a point.

### A round

1. The host starts the round. The letter and five-category sheet appear simultaneously, so nobody gets an early thinking advantage.
2. Every answer must begin with the displayed letter. Blank fields are allowed when you are stuck.
3. Submit whenever you finish. A submitted sheet locks immediately so nobody can adapt after watching the room count.
4. Results appear automatically when every sheet arrives or the 90-second server clock expires.
5. For each category, capitalization, punctuation, accents, and extra spaces are ignored when comparing answers.
6. A valid, correctly lettered, unique answer earns 1 point. Matching answers, blanks, and wrong-letter answers earn 0.

### Example

Letter: **B**
Category: **An animal**

- One player writes **Baboon**: +1 if nobody else did.
- Two players write **Bear**: both receive 0.
- One player writes **Cat**: 0 because the first letter is wrong.
- One player leaves the field blank: 0.

### Why it should work

Everyone plays at once, so ten players add no turn-by-turn downtime. The strategic tension is legible immediately: the obvious answer is easier to find but more likely to collide. It forms a deliberate opposite to Same Page, where agreement is the goal.

### Current content and reliability

Twenty approachable letters and twelve original five-category sheets create 240 possible letter-and-sheet combinations before repeat avoidance. The multiplayer harness submits ten sheets concurrently and verifies duplicate cancellation, letter validation, unique scoring, winner detection, score accumulation, automatic reveal, and the next round. The mobile browser playthrough also confirmed that the five inputs, locked sheet, timer, and full scoring table remain readable on a phone.

---

## 10. Two Truths & a Lie

**Players:** 3–10
**Typical time:** 20 minutes
**Energy:** Personal, deceptive, story-rich

### The idea

Every player takes one turn in the hot seat with three claims about themselves: two true and one invented. The room can interrogate the storyteller before everyone privately chooses the lie.

### A match

1. The current storyteller privately writes three distinct claims and marks exactly one as the lie.
2. Once the set is locked, all three statements appear for the room. The storyteller reads them aloud and answers questions without admitting which one is false.
3. The host opens voting after the discussion. Everyone except the storyteller privately chooses statement 1, 2, or 3.
4. The lie, every vote, and the points from that turn are revealed together.
5. The hot seat rotates automatically until every active player has told one story. The match then shows the final ranking.

### Scoring

Every detective who identifies the lie earns 1 point. The storyteller earns 1 point for each person they fooled into choosing a truth. This keeps both careful deduction and convincing storytelling valuable.

### Example

“I have slept in an airport”, “I once met a head of state”, and “I cannot ride a bicycle.” The dramatic claim may be true while the ordinary-sounding one is the lie, so the room has to question all three.

### Why it should work

The material comes from the people at the table, so no content deck can become stale. The structured writing, discussion, private vote, and reveal give first-time players enough guidance while leaving the important part—telling stories and reading friends—entirely face-to-face.

### Current implementation and reliability

The storyteller’s lie marker remains private until the reveal, storytellers cannot vote on their own set, and the server rejects phase-skipping or duplicate scoring. The multiplayer harness completes a full ten-player lap: ten writing phases, ninety private votes, ten reveals, automatic storyteller rotation, accumulated scores, and the final ranking.

---

## 11. Signal Lost

**Players:** 3–10
**Typical time:** 18 minutes
**Energy:** Cooperative, clever, suspenseful

### The idea

One player is the receiver. Everyone else sees the same target and privately sends exactly one clue word—but if two people think alike, every matching copy is cancelled before the receiver sees the clue board.

Signal Lost adds two “dead air” words to every target: the most obvious clues are forbidden from the start. That forces useful clues to spread out instead of turning the round into a race to type the same first association.

### A lap

1. The receiver looks away from the table. Every helper sees the target, its category, and two blocked words.
2. Each helper sends one private clue. It cannot be the target, part of the target, or either blocked word. Players may not discuss or watch one another type.
3. The clue board opens automatically when every helper submits. Capitalization, punctuation, and accents are ignored when checking duplicates. If two or more clues match, all matching copies vanish from the receiver’s view.
4. The receiver sees only the surviving clues and types one guess. Everyone else must avoid reactions or extra hints.
5. The reveal shows the target, the guess, every clue, its author, and which echoes were cancelled.
6. The next player becomes receiver. A full lap ends after everyone has received once.

### Example

Target: **Volcano**<br />
Dead air: **lava**, **eruption**

The helpers send “crater”, “Pompeii”, “ash”, “mountain”, and “mountain”. Crater, Pompeii, and ash reach the receiver. Both copies of mountain are cancelled, and the two blocked words could never be submitted.

### Scoring

A correct guess adds 1 shared point to every player. The final result is the number of successful connections out of the number of players—so a ten-player table is trying to go 10/10 rather than competing for an individual crown.

### Why it should work

Everyone except the receiver acts simultaneously, so large groups create more ideas without creating downtime. The duplicate rule rewards thinking about how friends will think, while the blocked words prevent the easiest associations from dominating. The reveal is social: surprising clue choices and accidental echoes are usually as entertaining as the guess itself.

### Current content and reliability

Fifty original targets span familiar objects, places, food, nature, people, activities, and fictional ideas. Each has two curated blocked clues and common answer aliases where useful. The multiplayer harness completes a ten-player lap with ninety concurrent clue submissions, verifies that repeated clues disappear only from the receiver’s view, rejects receiver and blocked-word submissions, checks every guess and shared score, and starts a fresh lap.

---

## 12. Writer’s Room

**Players:** 3–10
**Typical time:** 22 minutes
**Energy:** Creative, funny, low-pressure

### The idea

One player directs an imaginary scene while everyone else privately pitches what should happen next. The site shuffles the pitches and hides their writers, so the director chooses the continuation rather than the friend.

### A lap

1. Everyone sees an original genre, scene setup, and one creative question.
2. The director waits while every other player writes one short, specific pitch of up to 160 characters.
3. The pitch board opens automatically when every writer submits. The order is randomized and no author names are shown.
4. The director reads the pitches aloud, then chooses the one that best belongs in the imaginary movie—funniest, smartest, strangest, or simply their favorite.
5. The reveal shows every pitch and writer. The favorite earns 2 points.
6. The director role rotates until everyone has called one scene, then the credits show the final ranking.

### Example

Genre: **Space opera**<br />
Setup: “The captain prepares to press the button that saves the galaxy.”<br />
Direction: “What warning label do they notice at the last second?”

The room might pitch “Not compatible with this universe,” “Press twice for customer support,” or “Battery sold separately.” The director decides which continuation makes the movie.

### Why it should work

Everyone writes simultaneously, so a ten-player room produces more options rather than more waiting. The prompt supplies enough story structure for beginners, while the director’s subjective choice lets funny, clever, and dramatically satisfying answers all compete. Reading the anonymous pitches aloud keeps the important moment at the table instead of on ten separate screens.

### Current content and reliability

Forty-two original scenes span mysteries, heists, fantasy, horror, romantic comedy, sci-fi, workplace comedy, game shows, historical drama, and more. The multiplayer harness completes a ten-player lap with ninety private pitch submissions, verifies that the director cannot submit, confirms writer identities are absent during judging, tests all ten director choices and score awards, and starts a fresh lap.

---

## 13. Doodle Relay

**Players:** 4–10
**Typical time:** 25 minutes
**Energy:** Creative, simultaneous, gloriously inaccurate

### The idea

Every player starts one private message chain. A phrase becomes a drawing, the drawing becomes somebody else’s guess, that guess becomes a new drawing, and so on. Players see only the single page they must interpret; the completed chain stays secret until the table replays it together.

### A relay

1. The site gives every player a different original phrase and a touch-friendly drawing canvas.
2. Everyone draws simultaneously without using letters, numbers, speech, or showing their screen.
3. Each doodle moves to the next player, who privately writes what they think it depicts.
4. Those guesses move again and become the instructions for a fresh drawing.
5. The room keeps alternating for the smaller of the player count or six links. Four players make four contributions per chain; six to ten players make six.
6. The host reveals one full chain at a time, including every author. The final board compares each original with its latest written guess.

### Example

The phrase “A penguin delivering pizza on a skateboard” becomes a hurried drawing. The next player sees “a bird carrying a box”, which another player draws as a chicken moving house. By the reveal, everyone can point to the exact innocent line that changed the whole message.

### Why it should work

Everyone acts on every page, so the game scales without turn-by-turn waiting. Capping a chain at six contributions keeps a ten-player match moving while still allowing three drawings and three guesses to compound. There is no art skill requirement and no scoring pressure: ambiguous drawings are not failures; they are the engine of the reveal.

### Current content and reliability

Sixty original visual prompts combine familiar animals, jobs, objects, and absurd situations. Drawings are stored as bounded normalized vector strokes, not screenshots, so they remain crisp across phones while the server rejects oversized or malformed payloads. The ten-client harness completes all sixty simultaneous draw/guess submissions, checks chain routing and private source isolation, reveals all ten albums, and verifies a new relay begins with no stale pages.

---

## 14. Night Shift

**Players:** 5–10
**Typical time:** 30 minutes
**Energy:** Social deduction, strategic, accusation-heavy

### The idea

Everyone secretly belongs to the station Crew or a smaller cell of Saboteurs. A rotating shift lead proposes teams for five dangerous missions. The whole table votes on each proposal, then only the deployed players secretly act. Crew can only stabilize; Saboteurs can either stabilize to build trust or jam the mission.

Nobody is eliminated, no moderator is needed, and every player keeps voting and arguing until one hidden side wins three missions.

### A match

1. Reveal your role privately. Saboteurs learn the other Saboteurs; Crew members learn no identities.
2. The shift lead selects the exact mission crew size shown by the site.
3. Everyone privately approves or rejects the proposal. A strict majority approves; a tie rejects.
4. After two rejected proposals, the third leader’s crew deploys automatically so a table cannot stall forever.
5. Selected players privately stabilize or jam. One jam normally fails the mission.
6. Mission four is shielded in games of seven or more and needs two jams to fail.
7. The site reveals the number of jams but not their authors. Missions two and four also reveal one randomly audited player’s exact action.
8. The shift lead rotates. The first side to reach three mission wins takes the match, then every role is revealed.

### Example

A four-person crew includes Player A, Player B, Player C, and Player D. The mission returns one jam and fails. That proves at least one of those four can sabotage—but not whether there were multiple Saboteurs and one chose to stabilize. On a later mission, the black box reports that Player A stabilized. Player A might be loyal, or a Saboteur who deliberately helped to manufacture trust.

### Why it should work

Team proposals create public commitments, private votes create bluffing evidence, and mission outcomes gradually narrow the possible hidden teams. The black-box audit gives beginners one concrete fact to discuss without directly revealing allegiance. Because Saboteurs may help and Crew never leaves the game, evidence remains useful but never mechanically conclusive.

### Current implementation and reliability

Role counts and mission crew sizes adjust from five through ten players. Votes remain private until a proposal resolves, mission actions remain private permanently except for the named audit, loyal players are server-blocked from jamming, and only the active leader can submit a valid crew. The multiplayer harness completes both the rejection/emergency-dispatch path and full matches at ten players, checks role privacy, team size enforcement, action permissions, the shielded fourth mission, audits, win conditions, role reveal, and a clean rematch.

---

## 15. Human Scale

**Players:** 3–10
**Typical time:** 12 minutes
**Energy:** Cooperative, interpretive, physical

### The idea

Every player receives a unique secret position on the same scale. Each person gives an example that belongs at their position, and the room tries to arrange the players from one extreme to the other.

### A round

1. The site deals every number from one through the player count exactly once.
2. Each player gives one example for their position without saying a number or repeating either endpoint.
3. The room discusses the examples and physically lines up.
4. The host taps names into the agreed left-to-right order.
5. The site reveals the real order and calculates pairwise accuracy. At 80% or better, everyone scores 1 point.

### Example

Scale: “a minor inconvenience” to “a complete disaster.”
Topic: “something going wrong on holiday.”

Clues might include “the hotel Wi-Fi is slow”, “the airline lost one suitcase”, and “the hotel does not exist”. The group must decide how far apart those examples belong.

### Why it should work

Every player contributes one clue, discussion is cooperative rather than accusatory, and the physical lineup gets people out of their seats. Pairwise scoring gives useful partial credit even if one difficult clue is misplaced.

### Current content

Forty-eight curated scales covering holidays, dates, meals, social mistakes, game nights, pets, dares, and board-game moves.

---

## 16. Secret Settlers

**Players:** 3–6  
**Typical time:** Runs alongside a full resource-trading board game  
**Energy:** Strategic, secretive, long-form

### The idea

Secret Settlers adds a private secondary objective to a long physical game without changing that game’s points or winner. Its missions reward interesting trades, timing, and resource situations rather than deliberately bad play.

### A round

1. Start Secret Settlers before beginning the physical board game.
2. Each player privately receives a different mission.
3. Return to the board and pursue the mission without explaining suspicious behavior.
4. Mark the mission complete when its condition occurs. This is honor-system scoring and can be undone before the reveal.
5. After the physical game, the host reveals every mission and who completed theirs.
6. A completed mission earns 2 House Rules points. The physical game’s result remains untouched.

### Example

Mission: “Have one offer rejected, revise it, and complete the revised trade with the same player.”

A surprisingly persistent negotiation now has a second reason, but the player still needs to make a trade useful enough for their main strategy.

### Why it should work

The companion layer lasts for hours without demanding constant phone attention. It creates stories and suspicious behavior while preserving the integrity of the board game everyone sat down to play.

### Current content

Eighteen missions covering player trades, hand composition, ports, building rhythms, public predictions, comeback play, and resource timing. Missions are shuffled and dealt without duplicates in a room.

## Research notes

House Rules is an independent project. It is not affiliated with, endorsed by, or sponsored by any game, publisher, or trademark owner named in this document; those names belong to their respective owners.

The current designs were informed by several proven patterns:

- [Jackbox’s official joining flow](https://www.jackboxgames.com/how-to-play) demonstrates the value of a browser, four-letter room code, shared lobby, and phones used as private controllers.
- [Spyfall’s rules](https://www.cryptozoic.com/sites/default/files/icme/u30695/spy_rules_eng_0.pdf) show the tension created when informed players must prove knowledge without teaching an outsider.
- [The Chameleon](https://bigpotato.co.uk/products/the-chameleon) uses a very short clue from every informed player to surface an impostor.
- [Herd Mentality](https://bigpotato.com/products/herd-mentality) shows how simultaneous answers and rewarding agreement can scale to large groups without downtime.
- [Repos Production’s official Just One overview](https://www.rprod.com/index.php/en/games/just-one) confirms why private one-word clues and cancelling identical hints create a clean cooperative loop. Signal Lost adds curated blocked words, a full-table receiver rotation, per-player privacy, and an original target deck.
- [Jackbox’s official Quiplash overview](https://www.jackboxgames.com/games/quiplash) demonstrates how private phone-written responses can become shared party material. Writer’s Room uses original scene prompts, a rotating single director, and a directorial choice rather than copying Quiplash’s head-to-head prompts or audience vote.
- [Libellud’s official Dixit overview](https://www.libellud.com/en/our-games/dixit/) reinforces the social value of a rotating storyteller and hidden authorship. Writer’s Room applies those broad patterns to short written movie pitches with an original flow and content deck.
- [Gartic’s official Gartic Phone overview](https://gartic.com/garticphone) demonstrates the durable comedy of alternating private writing and drawing before replaying the transformed message. Doodle Relay uses an original prompt deck, a six-link cap for large in-person tables, bounded vector strokes, and its own reveal interface.
- [Indie Boards & Cards’ official Resistance overview](https://indieboardsandcards.com/our-games/the-resistance/) highlights the social-deduction value of repeated team missions, informed decisions, and no player elimination for five to ten people. Night Shift uses an original station setting, a three-proposal emergency rule, and named black-box action audits to give new groups more concrete evidence.
- [Bezier Games’ official One Night Ultimate Werewolf overview](https://beziergames.com/collections/one-night-ultimate-werewolf/products/one-night-ultimate-werewolf) reinforces the value of moderator-free hidden roles and keeping every player involved. Night Shift applies those accessibility goals to a longer evidence-building mission arc rather than reproducing One Night’s roles or night actions.
- [Monikers](https://monikersgame.com/) shows how repeating familiar material under different performance constraints produces escalating comedy.
- Multiple descriptions of the folk game [Fishbowl](https://officialgamerules.org/game-rules/fishbowl/) preserve the core pattern of replaying one shared set of prompts through three clue restrictions. House Rules uses the beginner-friendly order “describe, one word, act” and states every restriction in the interface because informal versions vary.
- [Wavelength’s rules](https://www.wavelength.zone/pages/rules) illustrate how a simple shared prompt can turn subjective interpretation into the whole game.
- [Charades](https://en.wikipedia.org/wiki/Charades) is a long-lived informal game with many local rule variations; House Rules therefore makes its specific no-speech and turn rules explicit instead of assuming prior knowledge.
- Descriptions of the classic [Who Am I?](https://groupgames101.com/who-am-i-game/) consistently center on hidden identities and clockwise yes-or-no questions. House Rules adopts a one-question-per-turn version to keep participation even and makes “not sure” explicit for identities whose details are genuinely ambiguous.
- The traditional [Categories word game](https://en.wikipedia.org/wiki/Categories_%28game%29) pairs a random letter with timed category lists and rewards answers according to how the group overlaps. House Rules uses the cleanest party version: one point only for a valid unique answer.

House Rules uses these as genre research, not as content to reproduce. All released names, prompts, incidents, motion pairs, questions, interface flow, and scoring decisions were written for this project.

## Reliability notes

- Room and game state are stored in the hosted database rather than one player’s browser.
- Private game views are generated per player session.
- Concurrent submissions are stored independently, avoiding a “last write wins” race when ten phones answer together.
- The host’s round advance uses a version check to prevent two simultaneous transitions.
- Duplicate submissions update the player’s own vote or answer rather than creating extra votes.
- A permanent multiplayer harness completes every playable game at its supported maximum—including entire ten-player Charades, Two Truths, Signal Lost, Writer’s Room, Doodle Relay, and Night Shift matches—and can be rerun after future changes.


## Devil’s Advocate

**3–10 players · about 8–20 minutes · 160 built-in statements**

Each player gets one turn in lobby order. The host reveals a randomly dealt statement and starts a full 60-second clock. The speaker must argue out loud that the statement is true. Every card gives the player a reality-based position to defend: a specific taste, a social rule, or an outrageous tradeoff. The mixed deck runs from pineapple pizza and petty preferences through relationships, work, and public life to dark moral dilemmas. No supernatural powers or invented future technology are needed. The player must adopt the position, invent the reasoning, and sell it with conviction, creativity, and humour; the card does not supply a finished joke. Statements never repeat within a match.

When the minute expires, everyone except the speaker privately submits an integer rating from 1 to 10. Rate the argument, delivery, and commitment to the premise. Each ballot is final; even the host cannot inspect another player’s ballot. Normally, once everyone has rated, the host starts the next turn. The recovery control also lets the host continue with only the ratings received. Scores remain hidden in both the interface and API until everyone has defended a statement.

The finale ranks average ratings out of 10 and names the winner and loser. Ties share a rank, including joint winners or losers; a full-table tie has no loser. Individual ballots remain private. The completed match automatically enters the night standings once: winners get 3 night points, other players get 1. An unfinished match awards no points. Replay deals a fresh shuffled deck.

Example: **“Every citizen should be allowed one legally forgiven crime, provided they declare it on their tax return.”** Build a one-minute case around honesty, paperwork, or second chances. The room judges how convincingly you sell the premise.
