import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importTypeScript } from './load-typescript.mjs';
const directory = mkdtempSync(join(tmpdir(), 'house-rules-expanded-'));
process.env.DATABASE_PATH = join(directory, 'test.sqlite');
const realNow = Date.now;
let now = realNow();
Date.now = () => now;
const { POST: create } = await importTypeScript('app/api/rooms/route.ts');
const { POST: joinRoom } = await importTypeScript('app/api/rooms/[code]/join/route.ts');
const { POST: game } = await importTypeScript('app/api/rooms/[code]/game/route.ts');
const { GET: room } = await importTypeScript('app/api/rooms/[code]/route.ts');
const { getDatabase } = await importTypeScript('db/index.ts');
const { default: HumanScaleBoard } = await importTypeScript('app/room/[code]/HumanScaleBoard.tsx');
const { default: LanguageProvider } = await importTypeScript('app/LanguageProvider.tsx');
function boardMarkup(view) { return renderToStaticMarkup(React.createElement(LanguageProvider, null, React.createElement(HumanScaleBoard, {code:'TEST',view,acting:false,sendAction:async()=>true}))); }
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
  const {host,seats,action}=await table(6);
  let view=await action(host,'start',{slug:'human-scale'});
  assert.equal(view.phase,'lineup');
  const privateViews=await Promise.all(seats.map(seat=>action(seat,'view')));
  assert.deepEqual(privateViews.map(v=>v.targetPosition).sort((a,b)=>a-b),[1,2,3,4,5,6]);
  for(const v of privateViews){assert.equal(v.lineupRanks,undefined);assert.equal(v.result,undefined);assert.equal(v.ownOrder,undefined);}
  const actual=[...privateViews].sort((a,b)=>a.targetPosition-b.targetPosition).map(v=>v.playerId);
  for(const value of [actual.slice(1),[...actual.slice(1),actual[1]],actual.map((id,i)=>i===0?'intruder':id),null])await action(host,'order',{value},400);
  const first=await action(host,'order',{value:actual});
  assert.equal(first.phase,'lineup'); assert.deepEqual(first.ownOrder,actual);
  const guest=await action(seats[1],'view');
  assert.equal(guest.ownOrder,undefined);assert.equal(guest.result,undefined);
  assert.equal(guest.submissionStatus.filter(s=>s.submitted).length,1);
  const reverse=[...actual].reverse();
  await action(seats[1],'order',{value:reverse});
  const moved=[...actual.slice(1),actual[0]];
  await action(seats[2],'order',{value:moved});
  await Promise.all(seats.slice(3).map(seat=>action(seat,'order',{value:actual})));
  view=await action(host,'view');assert.equal(view.phase,'results');
  assert.deepEqual(view.result.actualOrder,actual);
  const results=new Map(view.result.lineupResults.map(r=>[r.playerId,r]));
  assert.equal(results.size,6);assert.equal(results.get(host.playerId).correctPairs,15);
  assert.equal(results.get(seats[1].playerId).correctPairs,0);
  assert.equal(results.get(seats[2].playerId).correctPairs,10);
  assert.ok([...results.values()].every(r=>r.totalPairs===15));
  for(const player of view.players)assert.equal(player.score,results.get(player.id).correctPairs);
  const hostMarkup=boardMarkup(view);
  assert.match(hostMarkup, /<button[^>]*>(?:PRÓXIMA ESCALA|NEXT SCALE) →<\/button>/, 'host must have a visible way to play the next round');
  assert.ok(!boardMarkup({...view,isHost:false}).match(/(?:PRÓXIMA ESCALA|NEXT SCALE) →/), 'players cannot advance everyone');
  assert.match(boardMarkup({...view,phase:'briefing'}), /<button[^>]*>(?:ABRIR ORDENAÇÃO INDIVIDUAL|OPEN PRIVATE ORDERING) →<\/button>/, 'an existing pre-update briefing can still start');
  await action(host,'order',{value:actual},409);
  // The next round retains scores but accepts no old-round submission.
  const next=await action(host,'advance');assert.equal(next.phase,'lineup');
  await action(host,'order',{value:actual,gameId:view.gameId,version:view.version},409);
  const fresh=await Promise.all(seats.map(seat=>action(seat,'view')));
  const actual2=[...fresh].sort((a,b)=>a.targetPosition-b.targetPosition).map(v=>v.playerId);
  await action(host,'order',{value:actual2});
  const partial=await action(host,'view');
  await action(seats[1],'recover',{gameId:partial.gameId,version:partial.version},403);
  const override=await action(host,'recover',{gameId:partial.gameId,version:partial.version});
  assert.equal(override.phase,'results');assert.equal(override.result.lineupResults.length,1);
  assert.equal(override.result.roundScores[host.playerId],15);
  for(const seat of seats.slice(1))assert.equal(override.result.roundScores[seat.playerId],0);
  assert.equal(override.players.find(p=>p.id===host.playerId).score,30);
  console.log('PASS: six-player Human Scale private values/orders, complete-order validation, automatic final reveal, pairwise scoring, stale moves and host override.');
} finally {Date.now=realNow;getDatabase().close();rmSync(directory,{recursive:true,force:true});}
