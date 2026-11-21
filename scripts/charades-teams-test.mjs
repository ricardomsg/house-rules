import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importTypeScript } from './load-typescript.mjs';
const directory = mkdtempSync(join(tmpdir(), 'house-rules-expanded-'));
process.env.DATABASE_PATH = join(directory, 'test.sqlite');
const realNow = Date.now;
const realError = console.error;
// Expected optimistic-lock conflicts otherwise print megabytes of data-URL source.
console.error = (...args) => { if (args[0] === 'game action failed' && args[1] instanceof Error && args[1].message === 'ROUND_CHANGED') return; realError(...args); };
let now = realNow();
Date.now = () => now;
const { POST: create } = await importTypeScript('app/api/rooms/route.ts');
const { POST: joinRoom } = await importTypeScript('app/api/rooms/[code]/join/route.ts');
const { POST: game } = await importTypeScript('app/api/rooms/[code]/game/route.ts');
const { GET: room } = await importTypeScript('app/api/rooms/[code]/route.ts');
const { getDatabase } = await importTypeScript('db/index.ts');
async function send(handler, body, code = '', expected = 200) {
  const response = await handler(new Request('http://localhost/api/rooms', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{params:Promise.resolve({code})});
  const value=await response.json();
  if(expected!==null)assert.equal(response.status,expected,JSON.stringify(value));
  return expected===null ? {status:response.status,value} : value;
}
async function table(count) {
  now++;
  const host=await send(create,{name:'Host'}); const seats=[host];
  for(let i=1;i<count;i++){now++;seats.push(await send(joinRoom,{name:`Player ${i}`},host.code));}
  const action=(seat,action,payload={},status=200)=>send(game,{token:seat.token,action,...payload},host.code,status);
  const board=async()=>{const r=await room(new Request('http://localhost/api/rooms'),{params:Promise.resolve({code:host.code})});assert.equal(r.status,200);return (await r.json()).scoreboard;};
  return {host,seats,action,board};
}
try {
  for(const count of [6,10]) {
    const {host,seats,action,board}=await table(count);
    let view=await action(host,'start',{slug:'charades'});
    const ids=['blue','red','green','yellow','purple'].slice(0,count/2);
    const assignments=Object.fromEntries(seats.map((s,i)=>[s.playerId,ids[Math.floor(i/2)]]));
    await action(seats[1],'charades-teams',{value:assignments},403);
    await action(host,'charades-teams',{value:{}},400);
    await action(host,'charades-teams',{value:{...assignments,[host.playerId]:'orange'}},400);
    await action(host,'charades-teams',{value:{...assignments,[host.playerId]:'red'}},400);
    view=await action(host,'charades-teams',{value:assignments});
    assert.equal(Object.keys(view.teams).length,count/2);assert.ok(Object.values(view.teams).every(ids=>ids.length===2));
    const turns=[]; const usedPrompts=new Set();
    for(let i=0;i<count;i++) {
      const turn=await action(host,'advance');turns.push(turn.actorTeam);
      const actor=seats.find(s=>s.playerId===turn.actorId);
      const teammate=seats.find(s=>s!==actor&&assignments[s.playerId]===turn.actorTeam);
      const opponents=seats.filter(s=>assignments[s.playerId]!==turn.actorTeam);
      const actorView=await action(actor,'view');assert.ok(actorView.prompt);
      assert.ok(!usedPrompts.has(actorView.prompt.prompt),'card repeated between turns');usedPrompts.add(actorView.prompt.prompt);
      assert.equal((await action(teammate,'view')).prompt,undefined);
      for(const other of opponents){const v=await action(other,'view');assert.equal(v.canControlPrompt,true);assert.deepEqual(v.prompt,actorView.prompt);}
      await action(teammate,'charades-correct',{},403);await action(teammate,'charades-pass',{},403);
      await action(host,'charades-teams',{value:assignments},409);
      if(i===0){
        const snapshot=await action(actor,'view');
        const before=JSON.parse((await getDatabase().prepare('SELECT state_json AS state FROM game_sessions WHERE id = ?').bind(snapshot.gameId).first()).state);
        const race=await Promise.all([actor,opponents[0]].map(seat=>action(seat,'charades-correct',{gameId:snapshot.gameId,version:snapshot.version},null)));
        assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
        const after=JSON.parse((await getDatabase().prepare('SELECT state_json AS state FROM game_sessions WHERE id = ?').bind(snapshot.gameId).first()).state);
        assert.equal(after.charadesPromptCursor,before.charadesPromptCursor+1);assert.equal(after.charadesTeamScores[turn.actorTeam],1);
        await action(opponents.at(-1),'charades-pass');
        await action(actor,'charades-correct');
      }
      await action(actor,'charades-finish');
      view=await action(host,'advance');assert.equal(view.phase,i===count-1?'results':'charades-ready');
    }
    for(const team of ids)assert.equal(turns.filter(t=>t===team).length,2);
    assert.equal((await board()).gamesPlayed,1);
    await action(seats[1],'charades-score',{value:{team:ids.at(-1),score:9}},403);
    for(const score of [-1,1000,1.5,'8'])await action(host,'charades-score',{value:{team:ids.at(-1),score}},400);
    await action(host,'charades-score',{value:{team:'orange',score:8}},400);
    view=await action(host,'charades-score',{value:{team:ids.at(-1),score:999}});
    assert.equal(view.result.charadesWinner,ids.at(-1));assert.equal(view.teamScores[ids.at(-1)],999);
    const scores=await board();assert.equal(scores.gamesPlayed,1);
    assert.deepEqual(scores.recent[0].awards.filter(a=>a.won).map(a=>a.playerId).sort(),view.teams[ids.at(-1)].slice().sort(),'banked standings must reflect host correction');
    await action(host,'charades-score',{value:{team:ids.at(-1),score:0}});
    const savedTeams=view.teams;
    // Changing host must not change the configured roster or team count on replay.
    await action(host,'transfer-host',{targetId:seats[1].playerId});
    const nextHost=seats[1];
    const replay=await action(nextHost,'advance');
    assert.deepEqual(replay.teams,savedTeams,'replay preserves configured teams after host transfer');
    assert.ok(Object.values(replay.teamScores).every(score=>score===0));
    assert.equal(Object.keys(replay.teamScores).length,count/2);
    assert.equal(replay.canEditTeams,true);
    await action(nextHost,'charades-score',{value:{team:ids.at(-1),score:7}});
    const restarted=await action(nextHost,'restart');
    assert.deepEqual(restarted.teams,savedTeams,'restart preserves configured teams');
    assert.ok(Object.values(restarted.teamScores).every(score=>score===0));
    assert.equal((await board()).gamesPlayed,1,'replay/restart must not duplicate the completed match');
    await action(nextHost,'end');
  }
  // A 2/4 split gets four turns per team: the smaller team repeats actors fairly.
  const uneven=await table(6);let v=await uneven.action(uneven.host,'start',{slug:'charades'});
  const split=Object.fromEntries(uneven.seats.map((seat,i)=>[seat.playerId,i<2?'blue':'red']));
  await uneven.action(uneven.host,'charades-teams',{value:split});const turns=[];
  for(let i=0;i<8;i++){const turn=await uneven.action(uneven.host,'advance');turns.push(turn.actorTeam);await uneven.action(uneven.seats.find(s=>s.playerId===turn.actorId),'charades-finish');v=await uneven.action(uneven.host,'advance');assert.equal(v.phase,i===7?'results':'charades-ready');}
  assert.equal(turns.filter(t=>t==='blue').length,4);assert.equal(turns.filter(t=>t==='red').length,4);
  // Make only the last existing card remain in this isolated test database.
  await uneven.action(uneven.host,'end');v=await uneven.action(uneven.host,'start',{slug:'charades'});
  const db=getDatabase();const row=await db.prepare('SELECT state_json AS state FROM game_sessions WHERE id = ?').bind(v.gameId).first();const state=JSON.parse(row.state);
  state.charadesPromptCursor=state.charadesPromptOrder.length-1;
  await db.prepare('UPDATE game_sessions SET state_json = ? WHERE id = ?').bind(JSON.stringify(state),v.gameId).run();
  const turn=await uneven.action(uneven.host,'advance');const actor=uneven.seats.find(s=>s.playerId===turn.actorId);
  const recap=await uneven.action(actor,'charades-correct');assert.equal(recap.phase,'charades-recap');assert.equal(recap.deckExhausted,true);
  const final=await uneven.action(uneven.host,'advance');assert.equal(final.phase,'results');assert.equal(final.deckExhausted,true);
  const stored=JSON.parse((await db.prepare('SELECT state_json AS state FROM game_sessions WHERE id = ?').bind(v.gameId).first()).state);
  assert.equal(stored.charadesPromptCursor,stored.charadesPromptOrder.length,'last card must not wrap');
  console.log('PASS: Charades three/five teams, invalid rosters, actor/opponent controls, teammate privacy, version race, equal uneven-team turns, score corrections/standings and deck exhaustion.');
} finally {console.error=realError;Date.now=realNow;getDatabase().close();rmSync(directory,{recursive:true,force:true});}
