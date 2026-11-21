import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { importTypeScript } from './load-typescript.mjs';
const { completeOutcome, aggregateStandings, teamActor, equalTeamTurns } = await importTypeScript('lib/room-standings.ts');
const { default: RoomScoreboard } = await importTypeScript('app/room/[code]/RoomScoreboard.tsx');
const { default: LanguageProvider } = await importTypeScript('app/LanguageProvider.tsx');
const ids = ['a','b','c','d','e'];
const baseState = { slug: 'same-page', phase: 'results', playerIds: ids, scores: {a:2,b:2,c:0,d:0,e:0} };
assert.deepEqual(completeOutcome(baseState).awards.map(a=>a.points), [3,3,1,1,1]);
assert.equal(completeOutcome({...baseState,phase:'answering'}), null);
assert.ok(completeOutcome({...baseState,scores:{}}).awards.every(a=>!a.won && a.points===1));
for (const [slug,field] of [['two-truths','truthStorytellerIndex'],['writers-room','writersDirectorIndex'],['signal-lost','signalReceiverIndex']]) {
  assert.equal(completeOutcome({...baseState,slug,[field]:3}),null);
  assert.ok(completeOutcome({...baseState,slug,[field]:4}));
}
for (const count of [4,5,6,7,8,9,10]) {
  const players=Array.from({length:count},(_,i)=>String(i));
  const turns=equalTeamTurns(count);
  const actors=Array.from({length:turns},(_,i)=>teamActor(players,i));
  assert.equal(new Set(actors).size,count);
  assert.equal(actors.filter(id=>Number(id)%2===0).length, turns/2);
  for(let turn=0;turn<50;turn++) assert.equal(Number(teamActor(players,turn))%2,turn%2);
}
const teams=Object.fromEntries(ids.map((id,i)=>[id,i%2?'red':'blue']));
const teamOutcome=completeOutcome({...baseState,slug:'charades',charadesTeams:teams,charadesTeamScores:{blue:4,red:7}});
assert.deepEqual(teamOutcome.awards.filter(a=>a.won).map(a=>a.playerId),['b','d']);
assert.equal(completeOutcome({...baseState,slug:'signal-lost',signalReceiverIndex:4,signalCorrectCount:3}).awards.filter(a=>a.won).length,5);
assert.equal(completeOutcome({...baseState,slug:'signal-lost',signalReceiverIndex:4,signalCorrectCount:2}).awards.filter(a=>a.won).length,0);
assert.ok(completeOutcome({...baseState,slug:'doodle-relay',phase:'relay-final'}).awards.every(a=>a.points===1&&!a.won));
const night=completeOutcome({...baseState,slug:'night-shift',phase:'night-debrief',nightRoles:{a:'crew',b:'saboteur',c:'crew',d:'crew',e:'saboteur'},result:{nightWinner:'saboteur'}});
assert.deepEqual(night.awards.filter(a=>a.won).map(a=>a.playerId),['b','e']);

const base=process.env.TEST_BASE_URL??'http://localhost:3000';
async function post(path,body,status=200){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;}
const host=await post('/api/rooms',{name:'Honey'});
const guests=await Promise.all(['Camera','Guest Á','Guest Ç','Guest Õ'].map(name=>post(`/api/rooms/${host.code}/join`,{name})));
const seats=[host,...guests];
const action=(seat,action,payload={},status=200)=>post(`/api/rooms/${host.code}/game`,{token:seat.token,action,...payload},status);
async function board(){const r=await fetch(`${base}/api/rooms/${host.code}`);assert.equal(r.status,200);return (await r.json()).scoreboard;}
await action(host,'start',{slug:'same-page'});
await action(host,'end');
assert.equal((await board()).gamesPlayed,0,'unfinished game awarded points');
await action(host,'start',{slug:'same-page'});
await Promise.all(seats.map((seat,i)=>action(seat,'answer',{value:i<2?'maçã':`outra${i}`})));
await action(host,'advance');
assert.equal((await board()).gamesPlayed,0,'continuous game should remain provisional');
await action(host,'advance'); // Begin another round, then abandon it.
await action(guests[2],'answer',{value:'unfinished'});
await action(host,'end');
let scores=await board();
assert.equal(scores.gamesPlayed,1);
assert.equal(scores.standings.find(p=>p.id===host.playerId).points,3);
assert.equal(scores.standings.find(p=>p.id===guests[2].playerId).points,1);
assert.equal((await board()).gamesPlayed,1,'poll duplicated result');

await action(host,'start',{slug:'categories'});
const categories=await action(host,'advance');
await Promise.all(seats.map((seat,i)=>action(seat,'categories-submit',{value:Array(5).fill(i===0?`${categories.letter}única`:'')})));
for(let i=0;i<5;i++) await action(host,'category-score',{targetId:host.playerId,value:{categoryIndex:i,scored:false}});
await action(host,'end');
scores=await board();
assert.equal(scores.gamesPlayed,2);
assert.ok(scores.recent[0].awards.every(a=>a.points===1&&!a.won),'disputed scores not reflected');

const ready=await action(host,'start',{slug:'charades'});
const actingTeams=[];
for(let i=0;i<6;i++){
  const turn=await action(host,'advance');
  assert.equal(turn.phase,'charades-turn');
  actingTeams.push(turn.actorTeam);
  const actor=seats.find(seat=>seat.playerId===turn.actorId);
  if(turn.actorTeam==='red') await action(actor,'charades-correct');
  await action(actor,'charades-finish');
  await action(host,'advance');
}
assert.deepEqual(actingTeams,['blue','red','blue','red','blue','red']);
const final=await action(host,'view');
assert.equal(final.phase,'results');assert.equal(final.nightOutcomeSaved,true);
scores=await board();assert.equal(scores.gamesPlayed,3);
assert.deepEqual(scores.recent[0].awards.filter(a=>a.won).map(a=>a.playerId).sort(),ready.teams.red.slice().sort());
// Host transfer must not reshuffle teams on replay.
await action(host,'transfer-host',{targetId:guests[1].playerId});
const newHost=guests[1];
async function raceMove(actionName,view) {
  const replies=await Promise.all([0,1].map(()=>fetch(`${base}/api/rooms/${host.code}/game`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:newHost.token,action:actionName,gameId:view.gameId,version:view.version})})));
  assert.deepEqual(replies.map(r=>r.status).sort(),[200,409],`${actionName} must have exactly one winner`);
  return replies.find(r=>r.status===200).json();
}
const fresh=await raceMove('advance',final);
assert.deepEqual(fresh.teams,ready.teams);
assert.equal((await board()).gamesPlayed,3,'replay banked same result twice');
await raceMove('restart',fresh);await action(newHost,'end');
assert.equal((await board()).gamesPlayed,3,'unfinished replay awarded points');
await action(newHost,'remove-player',{targetId:host.playerId});
scores=await board();
assert.ok(scores.standings.find(p=>p.id===host.playerId&&!p.present),'removed player history vanished');
const markup=renderToStaticMarkup(React.createElement(LanguageProvider,null,React.createElement(RoomScoreboard,{data:scores,playerId:newHost.playerId,code:host.code})));
assert.ok(markup.includes('Classificação da noite')&&markup.includes('As histórias desta noite'));
assert.ok(markup.includes('Honey')&&markup.includes('Camera'),'player names were translated');
assert.ok(!markup.includes('undefined'));
const aggregate=aggregateStandings(scores.recent.slice().reverse(),[]);
assert.equal(aggregate.gamesPlayed,3);
assert.deepEqual(aggregate.standings.map(p=>p.points),scores.standings.map(p=>p.points));
console.log('PASS: persistent room standings, ties, completed/abandoned games, scoring corrections, automatic team results, odd-team fairness, replays, host transfer, removed players and Portuguese rendering.');
