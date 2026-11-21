# Despista / Head Fake: movement-pair expansion

> Historical v0.2.0 design record. A later card-by-card review replaced this selection and supersedes its approval claims. Retired cards remain in source only for saved-session compatibility.

Date: 2026-10-05. Scope: 42 original English/European Portuguese action pairs in `lib/head-fake-cards.ts`. The integrated deck has **49 cards**. These are additions; retain the existing seven cards at their original indices so a deployment cannot change a persisted round's brief.

## What makes this game work

Players receive closely related actions and perform at the same time. The outsider has a real, playable action, not an instruction to watch until they can copy. A useful card has a shared physical shape and a difference that an attentive friend can spot. The joke should invite committed acting, but the explanation must remain short enough to remember after putting the phone down.

The publisher's [The Chameleon instructions](https://bigpotato.com/products/the-chameleon) establish a compact loop of shared knowledge, individual clues, blending in, and accusation. [Oink's A fake artist goes to New York](https://oinkgames.com/en/games/analog/a-fake-artist-goes-to-new-york/) is another publisher reference for observing a creative contribution to identify the uninformed participant. These are mechanism references, not sources of copied cards or evidence that our cards are playtested. Our design inference is to preserve ambiguity long enough for observation and discussion, using gestures instead of words or drawing. Both pages were consulted on 5 October 2026.

## Editorial decisions

- Both sides have a recognisable verb and an imaginary object. No obscure celebrity knowledge, Portuguese/English wordplay dependency, or instructions to imitate a disability.
- Humour comes from excessive seriousness, awkward dates, royal fussiness, hungover casino staff, a disastrous audition, and other small absurdities. The actions remain legible without explaining the joke aloud.
- Each pair shares at least one gesture. Differences can appear in grip, height, rhythm, direction, scale, or a follow-through action. An outsider is not exposed simply because their task requires a completely different posture.
- Everything can be mimed seated. No actual contact, equipment, swallowing, jumping, climbing, falling, or striking objects is required. The public instruction makes this explicit for the whole deck.
- Shared title and instruction reveal neither action. Neither contains a fixed duration: the host's configured clock governs the performance.
- Portuguese uses familiar local terms such as «comando», «telemóvel» where relevant, «cana de pesca», «gazua», «mata-moscas» and «corta-relva». English jokes are adapted for natural phrasing, not translated word for word.

## Pair-by-pair movement review

| Pair | Shared movement | Observable difference |
| --- | --- | --- |
| Iron / DJ | One hand sliding on a surface | Long pressing strokes versus small disc rotations |
| Bread / massage | Two hands pressing | Flat dough versus separate raised shoulders |
| Spaghetti / fishing | Winding one hand | Fork goes to mouth versus reel stays near body |
| Tyre pump / plunger | Repeated vertical push | Two-hand pump grip versus shaft and suction pull |
| Carrots / judge | Repeated downward hand | Chopping sequence versus single emphatic bangs |
| Puppet / laundry | Raised pinching fingers | String manipulation versus pegs placed along a line |
| Conductor / airport | Broad arm signals | Musical beat versus directional guidance |
| Toothbrush / lipstick | Hand near mouth | Repeated brushing versus tracing lips |
| Accordion / exercise band | Hands pull apart | Instrument held near torso versus stretching band |
| Bubbles / soup | Blowing toward one hand | Wand then catching versus spoon then tasting |
| Sun cream / vase | Rubbing strokes | Own arms versus an object held in space |
| Kite / dog | Holding an imaginary line | Upward gaze and spool versus low leash and tug |
| Camera / binoculars | Hands at eyes | Shutter and framing versus sustained two-eye viewing |
| Safe / oven | Turning small controls | Listening closely versus checking inside oven |
| Snow globe / cocktail | Shaking an object | Inspecting a scene versus pouring a drink |
| Confetti / pigeons | Scattering small pieces | Upward celebration versus low feeding |
| Detector / vacuum | Sweeping near ground | Side-to-side search versus push-pull cleaning |
| Sewing / tattoo | Fine close hand work | Pulling thread through versus guiding a tool |
| Light bulb / pepper | Repeated twisting | Turning a bulb upward versus grinding over a plate |
| Scarf / mummy | Wrapping an imaginary body | Neck loops versus repeated wrapping down torso |
| Balloon / trumpet | Blowing into hands | Expanding balloon and knot versus moving valve fingers |
| Lock / needle | Tiny precision work | Wrist turns inside lock versus feeding thread through eye |
| Bowling / curling | Gentle forward release | Swing and roll versus low flat slide |
| Plaster / toast | Spreading strokes | Vertical surface versus horizontal slice held in hand |
| Shoe / violin | Repeated lateral strokes | Low polishing versus raised bow and instrument |
| Hair / hedge | Small cutting gestures | Close head shape versus broader trimming outline |
| Typewriter / piano | Fingers on keys | Carriage return versus musical hand movement |
| Autograph / order | Writing while looking up | Handing paper back versus retaining a pad |
| Fan / fly swatter | Hand waving an object | Regular fanning versus tracking and stopping short |
| Balloon dog / earphones | Twisting between hands | Segment shaping versus separating tangled strands |
| Dealer / fines | Distributing flat objects | Dealing from a stack versus placing individual tickets |
| Banana / chocolate | Peeling a covering | Long strips versus wrapper and small break |
| Jar / robot | Repeated winding | Removing lid versus releasing and watching toy |
| Shirt / paper plane | Folding on an imaginary surface | Broad folds versus narrow triangular creases |
| Pastry / mower | Two hands moving forward/back | Short rolling strokes versus pushing a handle |
| Teacups / cards | Careful stacking | Rounded objects versus balancing flat edges |
| Scarf / tissues | Repeated pulling | Continuous strip from sleeve versus separate pieces from box |
| Racing car / ship | Turning a wheel | Small rapid corrections versus broad heavy turns |
| Butterfly / ice cream | Sweeping a handheld tool | Catching in air versus scooping from a container |
| Flowers / vegetables | Holding and arranging stems | Placing stems versus pulling them up |
| Remote / calculator | Thumb/finger button presses | Pointing away versus looking down at a display |
| Perfume / plant spray | Pressing a spray trigger | Checking scent near body versus aiming at leaves |

These are editorial distinctions, not requirements to perform one exact approved motion. A player may interpret the card differently; the ensuing argument is part of the game.

## Verification and remaining playtest

An automated content check confirmed 42 distinct regular briefs, 42 distinct outsider briefs, complete translations for every rendered field, different actions within each pair, and no fixed-second public instruction. The app integration must merge `headFakeCardTranslations` into its translation map and append `headFakeCards` after the existing cards.

No six-person physical playtest has been performed for this expansion. During one, flag pairs consistently solved before observation begins (too different), pairs nobody can distinguish even after discussion (too similar), and unfamiliar actions. The wrapping pair and bowling/curling pair are intentionally subtler and should receive particular attention. The host's skip control remains the immediate escape if a group does not recognise an action.
