import assert from 'node:assert/strict';
import { importTypeScript } from './load-typescript.mjs';
const { createRefreshOrder } = await importTypeScript('lib/refresh-order.ts');

// Model real overlapping polls: round 2 has rendered, then round 1 arrives late.
const order = createRefreshOrder();
let screen = { round: 1, draft: '' };
const oldPoll = order.begin();
const currentPoll = order.begin();
if (order.accept(currentPoll)) screen = { round: 2, draft: '' };
screen.draft = 'The player is already answering round two';
if (order.accept(oldPoll)) screen = { round: 1, draft: '' };
assert.deepEqual(screen, { round: 2, draft: 'The player is already answering round two' });
assert.equal(order.accept(currentPoll), false);

// Starting a new poll must not starve a valid earlier response on a slow network.
const slowPoll = order.begin();
const newerPendingPoll = order.begin();
assert.equal(order.accept(slowPoll), true);
assert.equal(order.accept(newerPendingPoll), true);
// A late failure cannot replace a newer success with an obsolete error.
const failingPoll = order.begin();
const successfulPoll = order.begin();
assert.equal(order.accept(successfulPoll), true);
assert.equal(order.accept(failingPoll), false);
console.log('PASS: delayed polls cannot rewind the screen or discard the new draft; slow networks keep making progress.');
