// Builds, migrates and deploys with the git-ignored wrangler.production.jsonc,
// so real Cloudflare IDs and hostnames never need to be committed.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import ts from 'typescript';

const config = 'wrangler.production.jsonc';
const wrangler = 'node_modules/wrangler/bin/wrangler.js';
const [command, ...extra] = process.argv.slice(2);

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function run(binary, args, env = process.env) {
  const result = spawnSync(binary, args, { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const reservedSuffixes = new Set(['alt', 'arpa', 'corp', 'domain', 'example', 'home', 'internal', 'intranet', 'invalid', 'lan', 'local', 'localdomain', 'localhost', 'localnet', 'onion', 'private', 'test', 'workgroup']);

// A bare https origin on a public domain name: no credentials, path, IP address or internal hostname.
function isPublicOrigin(value) {
  if (typeof value !== 'string') return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.origin !== value) return false;
  const labels = url.hostname.toLowerCase().split('.');
  if (labels.length < 2 || !labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return false;
  const suffix = labels.at(-1);
  return /^(?:[a-z]{2,}|xn--[a-z0-9-]+)$/.test(suffix) && !reservedSuffixes.has(suffix);
}

function build() {
  run('npm', ['run', 'build:cloudflare'], {
    ...process.env,
    HOUSE_RULES_WRANGLER_CONFIG: `./${config}`,
  });
}

if (!['build', 'migrate', 'deploy'].includes(command)) fail('Usage: node scripts/cloudflare-production.mjs <build|migrate|deploy> [wrangler arguments]');
if (!existsSync(config)) fail(`${config} is missing. Copy wrangler.jsonc to ${config} and add your Cloudflare values. See "Self-host on Cloudflare" in README.md.`);

const { config: settings, error } = ts.parseConfigFileTextToJson(config, readFileSync(config, 'utf8'));
if (error || !settings) fail(`${config} is not valid JSONC.`);
const databaseId = settings.d1_databases?.find(database => database.binding === 'DB')?.database_id;
if (typeof databaseId !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(databaseId)) fail(`${config} has no valid D1 database_id on the DB binding. Run "npx wrangler d1 create house-rules" and add the returned ID.`);
if (!isPublicOrigin(settings.vars?.SITE_ORIGIN)) fail(`${config} needs SITE_ORIGIN set to your public https origin, with no path or trailing slash.`);

if (command === 'build') build();
if (command === 'migrate') run(process.execPath, [wrangler, 'd1', 'migrations', 'apply', 'DB', '--remote', '--config', config, ...extra]);
if (command === 'deploy') {
  build();
  run(process.execPath, [wrangler, 'deploy', '--config', 'dist/server/wrangler.json', ...extra]);
}
