import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TEST_BASE_URL ?? 'http://localhost:3102';
async function post(path, body) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const value = await response.json();
  assert.equal(response.status, 200, JSON.stringify(value));
  return value;
}

const host = await post('/api/rooms', { name: 'Charades browser test' });
const seats = [host];
const action = (seat, action, payload = {}) => post(`/api/rooms/${host.code}/game`, { token: seat.token, action, ...payload });
let browser;
const heldRoutes = [];
try {
  for (let i = 1; i < 4; i++) seats.push(await post(`/api/rooms/${host.code}/join`, { name: `Browser guest ${i}` }));
  await action(host, 'start', { slug: 'charades' });
  const turn = await action(host, 'advance');
  const actor = seats.find(seat => seat.playerId === turn.actorId);
  assert.ok(actor);
  browser = await chromium.launch({
    executablePath: process.env.TEST_CHROMIUM_PATH || undefined,
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ code, seat }) => {
    localStorage.setItem(`house-rules:${code}`, JSON.stringify({ token: seat.token, playerId: seat.playerId, name: 'Actor' }));
  }, { code: host.code, seat: actor });
  await page.goto(`${base}/room/${host.code}`);
  const prompt = page.locator('.charades-prompt-card h2');
  await prompt.waitFor();

  // The legacy site awaited this background request before unlocking controls.
  // Hold it indefinitely: the actor must still pass and score multiple cards.
  await page.route(`**/api/rooms/${host.code}`, route => { heldRoutes.push(route); });
  const seen = new Set([await prompt.innerText()]);
  for (const name of ['PASSAR', 'ACERTARAM! +1', 'PASSAR', 'ACERTARAM! +1']) {
    const previous = await prompt.innerText();
    const button = page.getByRole('button', { name, exact: true });
    await button.click({ timeout: 2000 });
    await page.waitForFunction(previous => document.querySelector('.charades-prompt-card h2')?.textContent !== previous, previous);
    await page.waitForFunction(() => [...document.querySelectorAll('.charades-controls button')].every(button => !button.disabled), undefined, { timeout: 2000 });
    const next = await prompt.innerText();
    assert.ok(!seen.has(next), 'a passed or scored card repeated before the deck was exhausted');
    seen.add(next);
  }
  assert.ok(heldRoutes.length, 'the stalled background refresh was not exercised');
  const current = await action(actor, 'view');
  assert.equal(current.turnScore, 2);
  assert.equal(current.turnEndsAt, turn.turnEndsAt, 'card changes must not restart the timer');
  const others = await Promise.all(seats.filter(seat => seat.playerId !== actor.playerId).map(seat => action(seat, 'view')));
  const teammates = others.filter(view => view.ownTeam === view.actorTeam);
  const opponents = others.filter(view => view.ownTeam !== view.actorTeam);
  assert.ok(teammates.length > 0 && opponents.length > 0, 'the room must have a teammate and an opponent');
  for (const view of teammates) assert.equal(view.prompt, undefined, 'the actor’s card leaked to the guessing team');
  for (const view of opponents) assert.deepEqual(view.prompt, current.prompt, 'the opposing team must see the card to run the buttons');
  assert.deepEqual(errors, []);
  await action(actor, 'charades-finish');
  await action(host, 'advance');
  const nextTurn = await action(host, 'advance');
  const nextActor = seats.find(seat => seat.playerId === nextTurn.actorId);
  assert.ok(nextActor);
  const nextPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await nextPage.addInitScript(({ code, seat }) => {
    localStorage.setItem(`house-rules:${code}`, JSON.stringify({ token: seat.token, playerId: seat.playerId, name: 'Next actor' }));
  }, { code: host.code, seat: nextActor });
  await nextPage.goto(`${base}/room/${host.code}`);
  const nextPrompt = nextPage.locator('.charades-prompt-card h2');
  await nextPrompt.waitFor();
  assert.ok(!seen.has(await nextPrompt.innerText()), 'the next team was shown a card from the previous turn');
  console.log('PASS: Mímica advances through five private cards while the room refresh is stalled, scores correctly, and shows the next team a fresh card.');
} finally {
  for (const route of heldRoutes) await route.abort().catch(() => {});
  await browser?.close();
  await action(host, 'end');
  await action(host, 'remove-playtesters', { value: seats.slice(1).map(seat => seat.playerId) });
}
