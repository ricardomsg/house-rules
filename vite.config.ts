import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    resolve: { alias: [{ find: './local-sqlite', replacement: fileURLToPath(new URL('./db/cloudflare-d1.ts', import.meta.url)) }] },
    css: { postcss: { plugins: [tailwindcss()] } },
    plugins: [
      vinext(),
      cloudflare({
        configPath: process.env.HOUSE_RULES_WRANGLER_CONFIG || './wrangler.jsonc',
        persistState: { path: process.env.GAMENIGHT_D1_TEST_DIR || '.wrangler/cloudflare-state' },
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
      }),
    ],
  };
});
