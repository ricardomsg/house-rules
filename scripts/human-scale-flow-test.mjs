import assert from 'node:assert/strict';
import { importTypeScript } from './load-typescript.mjs';
const { validateHumanScaleOrder, scoreHumanScaleOrder, scoreHumanScaleOrders } = await importTypeScript('lib/human-scale-flow.ts');
for (const n of [3, 5, 6, 10]) {
  const ids = Array.from({length:n}, (_,i)=>`p${i}`);
  const max = n*(n-1)/2;
  assert.deepEqual(scoreHumanScaleOrder(ids,ids), {correctPairs:max,totalPairs:max});
  assert.equal(scoreHumanScaleOrder([...ids].reverse(),ids).correctPairs,0);
  assert.equal(scoreHumanScaleOrder([...ids.slice(1),ids[0]],ids).correctPairs,max-(n-1),'moving first to last loses exactly its pairs');
  const adjacent=[...ids]; [adjacent[1],adjacent[2]]=[adjacent[2],adjacent[1]];
  assert.equal(scoreHumanScaleOrder(adjacent,ids).correctPairs,max-1,'one adjacent swap loses one pair');
  assert.equal(validateHumanScaleOrder([...ids.slice(1),ids[1]],ids),null);
  assert.equal(validateHumanScaleOrder(ids.slice(1),ids),null);
  assert.equal(validateHumanScaleOrder([...ids,'intruder'],ids),null);
  assert.equal(validateHumanScaleOrder(null,ids),null);
  const scored=scoreHumanScaleOrders(ids,Object.fromEntries(ids.map((id,i)=>[id,i+1])),{[ids[0]]:ids,[ids[1]]:adjacent,foreign:ids});
  assert.deepEqual(scored.actualOrder,ids);
  assert.equal(scored.lineupResults.length,2);
  assert.equal(scored.roundScores[ids[0]],max);
  assert.equal(scored.roundScores[ids[1]],max-1);
  assert.equal(scored.roundScores[ids[2]],0);
  assert.equal(scored.roundScores.foreign,undefined);
}
assert.throws(()=>scoreHumanScaleOrders(['a','b'],{a:1,b:1},{}));
assert.throws(()=>scoreHumanScaleOrder(['a','a'],['a','b']));
console.log('PASS: Human Scale complete permutations, pairwise scoring, reversals, adjacent swaps, moved endpoints, missing submissions and invalid ranks.');
