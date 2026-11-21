import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importTypeScript } from './load-typescript.mjs';

const directory = mkdtempSync(join(tmpdir(), 'gamenight-catalog-'));
process.env.DATABASE_PATH = join(directory, 'test.sqlite');
const { outsiderDecks } = await importTypeScript('lib/game-content.ts');
const { activeOutsiderCards, isRetiredCard } = await importTypeScript('lib/card-catalog.ts');
const { translateCopy } = await importTypeScript('lib/i18n.ts');
const { POST: create } = await importTypeScript('app/api/rooms/route.ts');
const { POST: joinRoom } = await importTypeScript('app/api/rooms/[code]/join/route.ts');
const { POST: game } = await importTypeScript('app/api/rooms/[code]/game/route.ts');
const { getDatabase } = await importTypeScript('db/index.ts');
const legacy = {
  'alibi-club': [46, 'b68ff93b2a077470837ffd4ebb3f21d1ff41f1f4a50378d3cb979285a0f9d69e'],
  'house-rule': [49, '7d27b737b99811e6e2aab79d6dc752d32fd06d9990b717bd49069efb17c9a0fa'],
  'head-fake': [49, 'f44f3c4755c62c540317164e10d5ffa93a9f5401cc61c7e6d96ec04896914cbe'],
};
async function send(handler, body, code = '', status = 200) {
  const response = await handler(new Request('http://localhost/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), { params: Promise.resolve({ code }) });
  const value = await response.json();
  assert.equal(response.status, status, `${body.action ?? 'room'}: ${value.error ?? response.status}`);
  return value;
}
try {
  for (const [slug, [count, hash]] of Object.entries(legacy)) {
    assert.equal(createHash('sha256').update(JSON.stringify(outsiderDecks[slug].slice(0, count))).digest('hex'), hash, `${slug}: saved historical card content changed`);
    const active = activeOutsiderCards(slug);
    assert.ok(active.length > 0);
    for (const locale of ['en', 'pt-PT']) {
      const titles = active.map(({ card }) => translateCopy(card.title, locale));
      assert.equal(new Set(titles).size, titles.length, `${slug}/${locale}: repeated active titles`);
      assert.ok(titles.every(title => !/^(House Conversation|Conversa da casa|Act natural|Age com naturalidade|A night to remember|Uma noite para recordar)(\s*\d+)?$/i.test(title)));
    }
    for (const { index, card } of active) {
      assert.equal(isRetiredCard(slug, index), false);
      for (const field of ['title', 'regular', 'outsider', 'instruction']) {
        assert.ok(card[field]?.trim());
        assert.notEqual(translateCopy(card[field], 'pt-PT'), card[field], `${slug}/${index}/${field}: untranslated`);
      }
    }
    for (const playerCount of [7, 8]) {
      const host = await send(create, { name: 'Catalog QA' });
      const seats = [host];
      for (let i = 1; i < playerCount; i++) seats.push(await send(joinRoom, { name: `Catalog ${i}` }, host.code));
      const action = (seat, action, value = {}, status = 200) => send(game, { token: seat.token, action, ...value }, host.code, status);
      let view = await action(host, 'start', { slug });
      const seen = new Set();
      for (let i = 0; i < active.length; i++) {
        const row = await getDatabase().prepare('SELECT state_json AS state FROM game_sessions WHERE id = ?').bind(view.gameId).first();
        const state = JSON.parse(row.state);
        assert.ok(active.some(c => c.index === state.contentIndex), `${slug}: retired card dealt`);
        assert.ok(!seen.has(state.contentIndex)); seen.add(state.contentIndex);
        const views = await Promise.all(seats.map(s => action(s, 'view')));
        const prompts = views.map(v => v.privatePrompt);
        const counts = [...new Set(prompts)].map(p => prompts.filter(v => v === p).length).sort((a,b)=>a-b);
        assert.deepEqual(counts, [1, playerCount - 1], `${slug}: role briefs mismatched`);
        if (i < active.length - 1) view = await action(host, 'skip-card', { gameId: view.gameId, version: view.version });
      }
      await action(host, 'skip-card', { gameId: view.gameId, version: view.version }, 409);
      await action(host, 'end');
      await action(host, 'start', { slug }, 409);
    }
  }
  console.log('PASS: preserved historical card payloads, unique EN/PT active titles, complete translations, and every approved card dealt exactly once with correct roles in 7/8-player rooms; retired cards never dealt.');
} finally { rmSync(directory, { recursive: true, force: true }); }
