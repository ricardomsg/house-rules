'use client';

import { useState } from 'react';
import { useLanguage } from '@/app/LanguageProvider';
import type { GameView } from './GameBoard';

const teamIds = ['blue', 'red', 'green', 'yellow', 'purple'];
const teamLabels: Record<string, string> = { blue: 'BLUE TEAM', red: 'RED TEAM', green: 'GREEN TEAM', yellow: 'YELLOW TEAM', purple: 'PURPLE TEAM' };
const teamColors: Record<string, string> = { blue: '#225b8b', red: '#9b3838', green: '#28603f', yellow: '#70560b', purple: '#69438a' };
export type CharadesView = Omit<GameView, 'teams' | 'teamScores' | 'actorTeam' | 'ownTeam' | 'result'> & {
  teams?: Record<string, string[]>;
  teamScores?: Record<string, number>;
  actorTeam?: string;
  ownTeam?: string;
  canEditTeams?: boolean;
  canControlPrompt?: boolean;
  deckExhausted?: boolean;
  result?: Omit<NonNullable<GameView['result']>, 'charadesWinner'> & { charadesWinner?: string };
};
type Props = { view: CharadesView; acting: boolean; remainingSeconds: number; sendAction: (action: string, payload?: Record<string, unknown>) => Promise<boolean> };

export default function CharadesBoard(props: Props) {
  // Updating the saved roster resets only its editor, never saving on mount.
  return <CharadesRound key={`${props.view.gameId}:${JSON.stringify(props.view.teams)}`} {...props} />;
}

function CharadesRound({ view, acting, remainingSeconds, sendAction }: Props) {
  const { t } = useLanguage();
  const teams = Object.keys(view.teams ?? {}).filter(team => (view.teams?.[team].length ?? 0) > 0);
  const players = view.players ?? [];
  const [teamCount, setTeamCount] = useState(teams.length || 2);
  const originalAssignments = Object.fromEntries(teams.flatMap(team => (view.teams?.[team] ?? []).map(id => [id, team])));
  const [assignments, setAssignments] = useState<Record<string, string>>(originalAssignments);
  const [editing, setEditing] = useState(false);
  const name = (id: string) => players.find(player => player.id === id)?.name ?? t('Unknown player');
  const label = (team: string) => t(teamLabels[team] ?? team);
  const selectedTeams = teamIds.slice(0, teamCount);
  const validTeams = selectedTeams.every(team => players.filter(player => assignments[player.id] === team).length >= 2) && players.every(player => selectedTeams.includes(assignments[player.id]));
  const randomize = (count = teamCount) => {
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setAssignments(Object.fromEntries(shuffled.map((player, index) => [player.id, teamIds[index % count]])));
  };
  const scoreCards = <div className="charades-score-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))' }}>{teams.map(team => <article key={team} style={{ borderTop: `5px solid ${teamColors[team] ?? '#555'}` }}>
    <small>{label(team)}</small><strong>{view.teamScores?.[team] ?? 0}</strong>
    <p>{view.teams?.[team].map(name).join(' · ')}</p>
  </article>)}</div>;
  const isActor = view.playerId === view.actorId;
  const canControl = !view.watching && Boolean(view.canControlPrompt) && (isActor || view.ownTeam !== view.actorTeam);
  const winner = view.result?.charadesWinner;

  return <section data-i18n-managed>
    {view.phase === 'charades-ready' && <>
      <p className="stage-label">{t('THE TEAMS')}</p>{scoreCards}
      {view.isHost && view.canEditTeams && <section style={{ marginBlock: '1rem' }}>
        {!editing ? <button type="button" disabled={acting} onClick={() => setEditing(true)}>{t('EDIT TEAMS')}</button> : <>
          <h3>{t('Build your teams')}</h3>
          <label>{t('Number of teams')} <select value={teamCount} disabled={acting} onChange={event => { const count = Number(event.target.value); setTeamCount(count); randomize(count); }}>{Array.from({ length: Math.max(1, Math.min(5, Math.floor(players.length / 2)) - 1) }, (_, index) => index + 2).map(count => <option key={count} value={count}>{count}</option>)}</select></label>
          <p>{t('Each team needs at least two players. Shuffle for balanced teams, then move anyone you want.')}</p>
          <button type="button" disabled={acting} onClick={() => randomize()}>{t('SHUFFLE TEAMS')}</button>
          <div style={{ display: 'grid', gap: '.75rem', marginBlock: '1rem' }}>{players.map(player => <label key={player.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem' }}><span translate="no">{player.name}</span><select style={{ minHeight: 44 }} aria-label={t('Team for {name}', { name: player.name })} disabled={acting} value={assignments[player.id] ?? selectedTeams[0]} onChange={event => setAssignments({ ...assignments, [player.id]: event.target.value })}>{selectedTeams.map(team => <option key={team} value={team}>{label(team)}</option>)}</select></label>)}</div>
          <p>{selectedTeams.map(team => `${label(team)}: ${players.filter(player => assignments[player.id] === team).length}`).join(' · ')}</p>
          {!validTeams && <p role="status">{t('Move players until every team has at least two.')}</p>}
          <button className="stage-action" type="button" disabled={acting || !validTeams} onClick={async () => { if (await sendAction('charades-teams', { value: assignments })) setEditing(false); }}>{t('SAVE TEAMS')}</button>
          <button type="button" disabled={acting} onClick={() => { setAssignments(originalAssignments); setTeamCount(teams.length); setEditing(false); }}>{t('CANCEL TEAM CHANGES')}</button>
        </>}
      </section>}
      <section className="charades-handoff">
        <p className="stage-label">{t('ACTING NEXT')}</p><h2><span translate="no">{view.actorName}</span> · {label(view.actorTeam ?? 'blue')}</h2>
        <p>{t('Only the acting team guesses. Mime without speaking, mouthing words, spelling or pointing at objects.')}</p>
        <p>{t('An opposing player can hold the phone with the card facing the actor and tap correct or pass. Keep it hidden from the guessing team. The actor can also use their own phone.')}</p>
        {view.deckExhausted ? <p role="status">{t('All cards in this room have been used. Choose another game; old cards will not be repeated.')}</p> : view.isHost ? <button className="stage-action" type="button" disabled={acting || editing} onClick={() => sendAction('advance')}>{t('START {seconds} SECONDS →', { seconds: view.turnSeconds ?? 60 })}</button> : <p>{t('WAITING FOR THE HOST')}</p>}
        {editing && <p>{t('Save or cancel team changes before starting.')}</p>}
      </section>
    </>}
    {view.phase === 'charades-turn' && <>
      <p className="stage-label"><span translate="no">{view.actorName}</span> · {label(view.actorTeam ?? 'blue')} · {remainingSeconds} {t('SECONDS LEFT')}</p>
      {canControl ? <section className="charades-prompt-card">
        <p className="stage-label">{isActor ? t('SHOW WITH ACTIONS—NEVER WORDS') : t('YOU CONTROL THE CARD FOR THE ACTOR')}</p>
        {!isActor && <p>{t('Show this card only to the actor. Do not say the answer or give hints. Tap correct when their team guesses it.')}</p>}
        <div><small>{view.prompt?.category} · {view.prompt?.difficulty}</small><h2>{view.prompt?.prompt}</h2></div>
        <div className="charades-controls"><button style={{ minHeight: 64 }} type="button" disabled={acting || !view.prompt || remainingSeconds <= 0} onClick={() => sendAction('charades-pass')}>{t('PASS')}</button><button style={{ minHeight: 64 }} type="button" disabled={acting || !view.prompt || remainingSeconds <= 0} onClick={() => sendAction('charades-correct')}>{t('GOT IT! +1')}</button></div>
      </section> : <section className="charades-wait-card"><h2>{t('Shout guesses. Keep going.')}</h2><p>{t('The answer stays hidden from your team. Watch the actor, not an opposing phone.')}</p></section>}
      {(isActor || view.isHost) && <button className="charades-end-turn" type="button" disabled={acting} onClick={() => sendAction('charades-finish')}>{t('END TURN EARLY')}</button>}
    </>}
    {view.phase === 'charades-recap' && <section className="results-stage charades-recap">
      <p className="stage-label">{view.deckExhausted ? t('DECK COMPLETE') : t('TIME')}</p>
      <h2>{t('{name} scored {score}.', { name: view.actorName, score: view.turnScore ?? 0 })}</h2>{scoreCards}
      {view.deckExhausted && <p>{t('All cards in this room have been used. Choose another game; old cards will not be repeated.')}</p>}
      {view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t(view.deckExhausted ? 'SHOW FINAL SCORES →' : 'PASS TO THE NEXT ACTOR →')}</button> : <p>{t('WAITING FOR THE NEXT TURN')}</p>}
    </section>}
    {view.phase === 'results' && <section className="results-stage charades-results">
      <p className="stage-label">{t('FINAL SCORE')}</p><h2>{winner === 'tie' ? t('A perfect draw.') : t('{team} wins!', { team: label(winner ?? '') })}</h2>{scoreCards}
      {view.deckExhausted ? <p>{t('All cards in this room have been used. Choose another game; old cards will not be repeated.')}</p> : view.isHost ? <button className="stage-action" type="button" disabled={acting} onClick={() => sendAction('advance')}>{t('PLAY ANOTHER MATCH →')}</button> : <p>{t('WAITING FOR THE HOST')}</p>}
    </section>}
    {view.isHost && !view.watching && <details style={{ marginBlock: '1rem' }}><summary>{t('CORRECT TEAM SCORES')}</summary><p>{t('Use this to settle a scoring mistake. Enter the new total, not the number to add.')}</p>{teams.map(team => <ScoreCorrection key={`${team}:${view.teamScores?.[team] ?? 0}`} team={team} label={label(team)} score={view.teamScores?.[team] ?? 0} acting={acting} sendAction={sendAction} />)}</details>}
  </section>;
}

function ScoreCorrection({ team, label, score, acting, sendAction }: { team: string; label: string; score: number; acting: boolean; sendAction: Props['sendAction'] }) {
  const { t } = useLanguage();
  const [value, setValue] = useState(String(score));
  const parsed = Number(value);
  const valid = value.trim() !== '' && Number.isInteger(parsed) && parsed >= 0 && parsed <= 999;
  return <form style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem', marginBlock: '.75rem' }} onSubmit={event => { event.preventDefault(); if (valid && !acting) void sendAction('charades-score', { value: { team, score: parsed } }); }}><label>{label} <input style={{ width: '5rem', minHeight: 44 }} aria-label={t('New total for {team}', { team: label })} type="number" inputMode="numeric" min={0} max={999} step={1} value={value} disabled={acting} onChange={event => setValue(event.target.value)} /></label><button type="submit" style={{ minHeight: 44 }} disabled={acting || !valid || parsed === score}>{t('SAVE SCORE')}</button></form>;
}
