import { spawnSync } from 'node:child_process';
for (const count of [5, 6, 10]) {
  const result = spawnSync(process.execPath, ['scripts/load-test.mjs'], {
    env: { ...process.env, TEST_PLAYERS: String(count) }, stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
