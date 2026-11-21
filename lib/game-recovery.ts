export type RecoveryOption = { label: string; explanation: string };

// These are explicit host decisions, never automatic guesses on a player's behalf.
export const recoveryOptions: Record<string, RecoveryOption> = {
  performance: { label: 'Finish the performance early', explanation: 'Stop the timer and open voting now.' },
  'advocate-ready': { label: 'Skip this speaker', explanation: 'Move to the next speaker without a rating for this turn.' },
  'advocate-defense': { label: 'Finish the defense early', explanation: 'Finish the opening defense and move to questions, if enabled, or private ratings.' },
  'advocate-challenge': { label: 'Finish the questions early', explanation: 'Stop the questions and open private ratings now.' },
  'advocate-rating': { label: 'Continue with these ratings', explanation: 'Use only the ratings already received. With no ratings, this turn is unscored.' },
  vote: { label: 'Reveal the votes received', explanation: 'Close voting now. Missing votes are not counted.' },
  answering: { label: 'Reveal the answers received', explanation: 'Reveal the answers already sent, even if some players have not answered.' },
  'truths-vote': { label: 'Reveal the votes received', explanation: 'Close voting now. Missing votes are not counted.' },
  'truths-writing': { label: 'Skip this storyteller', explanation: 'Move to the next storyteller. Nobody scores for this skipped story.' },
  'signal-clue': { label: 'Use the clues received', explanation: 'Open the clues already sent. Duplicate clues still cancel each other out.' },
  'signal-guess': { label: 'Skip this guess', explanation: 'Reveal the word and move on without scoring this turn.' },
  'writers-writing': { label: 'Use the pitches received', explanation: 'Let the director choose from the pitches already sent. If none arrived, skip this scene.' },
  'writers-judging': { label: 'Skip this scene', explanation: 'Move to the next director without choosing a winner for this scene.' },
  'relay-drawing': { label: 'Reveal the drawings so far', explanation: 'Finish this relay early and show all the pages already sent. No invented drawings or guesses are added.' },
  'relay-guessing': { label: 'Reveal the drawings so far', explanation: 'Finish this relay early and show all the pages already sent. No invented drawings or guesses are added.' },
  'fishbowl-setup': { label: 'Start with the prompts received', explanation: 'Use the prompts already sent. If the bowl is empty, use a small house deck instead.' },
  'fishbowl-ready': { label: 'Skip this clue-giver', explanation: 'Pass the bowl to the next player. Team scores and remaining prompts stay unchanged.' },
  'fishbowl-turn': { label: 'Finish this turn', explanation: 'End the current timer and keep the points already earned.' },
  'charades-ready': { label: 'Skip this actor', explanation: 'Skip this turn without adding points, then continue to the next actor.' },
  'charades-turn': { label: 'Finish this turn', explanation: 'End the current timer and keep the points already earned.' },
  'identity-playing': { label: 'Pass to the next player', explanation: 'Keep the identities secret and let the next unsolved player take a turn.' },
  'categories-answering': { label: 'Finish with the sheets received', explanation: 'Stop the timer and score the answer sheets already sent.' },
  lineup: { label: 'Reveal the orders received', explanation: 'Finish with the private orders already submitted. Missing orders score zero.' },
  'night-proposing': { label: 'Pass leadership', explanation: 'Let the next player propose a team for the same mission.' },
  'night-voting': { label: 'Reveal the votes received', explanation: 'Use the votes already sent. A tie or no votes rejects the team.' },
  'night-mission': { label: 'Choose a new mission team', explanation: 'Cancel this attempt without revealing secret actions or awarding a win. A new leader chooses a team for the same mission.' },
};

export const HOST_TAKEOVER_DELAY = 60_000;
