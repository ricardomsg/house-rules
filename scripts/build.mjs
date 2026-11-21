import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const hosted = process.env.CLOUDFLARE_BUILD === '1';
// Vinext generates Next-compatible declarations in .next/types. Preserve the
// local Next build's own declarations so either target can be built in any order.
const backup = hosted ? mkdtempSync(join(tmpdir(), 'gamenight-next-types-')) : null;
const hadTypes = existsSync('.next/types');
const nextEnv = existsSync('next-env.d.ts') ? readFileSync('next-env.d.ts') : null;
if (backup && hadTypes) cpSync('.next/types', join(backup, 'types'), { recursive: true });
let status = 1;
try {
  const binary = hosted ? 'node_modules/vinext/dist/cli.js' : 'node_modules/next/dist/bin/next';
  const result = spawnSync(process.execPath, [binary, 'build'], { stdio: 'inherit', env: process.env });
  status = result.status ?? 1;
} finally {
  if (backup) {
    rmSync('.next/types', { recursive: true, force: true });
    if (hadTypes) { mkdirSync('.next', { recursive: true }); cpSync(join(backup, 'types'), '.next/types', { recursive: true }); }
    if (nextEnv) writeFileSync('next-env.d.ts', nextEnv);
    else rmSync('next-env.d.ts', { force: true });
    rmSync(backup, { recursive: true, force: true });
  }
}
process.exit(status);
