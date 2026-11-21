# House Rules

House Rules is a multiplayer party-game web app for people in the same room. One person creates a room and shares a four-letter code or link. Everyone joins from a phone browser, with no account or app install. Phones handle private information, voting, timers and scores, so the group can keep its attention on each other.

It includes 17 games for 3 to 10 players:

| Game | Players | Style |
| --- | ---: | --- |
| Devil's Advocate | 3–10 | Absurd persuasion |
| Scene Stealer | 4–10 | Physical improvisation |
| Alibi Club | 4–10 | Verbal deduction |
| House Rule | 4–10 | Pattern recognition |
| Head Fake | 4–10 | Fast physical comedy |
| Same Page | 3–10 | Simultaneous social guessing |
| Charades | 4–10 | Team acting |
| Fishbowl | 4–10 | Escalating team clues |
| Who Am I? | 3–10 | Yes/no deduction |
| Categories | 3–10 | Timed word lists |
| Two Truths & a Lie | 3–10 | Personal bluffing |
| Signal Lost | 3–10 | Cooperative word clues |
| Writer's Room | 3–10 | Anonymous creative pitching |
| Doodle Relay | 4–10 | Drawing telephone |
| Night Shift | 5–10 | Hidden-role deduction |
| Human Scale | 3–10 | Cooperative clue ordering |
| Secret Settlers | 3–6 | Secret objectives alongside a resource-trading board game |

Rules, examples and card counts are in the [game catalog](GAME_CATALOG.md). House Rules is an independent project and is not affiliated with, endorsed by, or sponsored by any commercial game or publisher mentioned in this repository.

## How it runs

The same code has two targets:

- **Local:** Next.js with Node's built-in SQLite. It needs no account, API key or internet connection once dependencies are installed.
- **Cloudflare:** Vinext on Cloudflare Workers with a D1 database.

The two targets use separate databases. A room created on one does not exist on the other.

## Run locally

You need Node.js 22.16 or later. The version used for development is in [`.nvmrc`](.nvmrc).

```sh
npm ci
npm run build
npm start
```

Open <http://localhost:3000>. Keep the terminal open while you play, and press `Ctrl+C` to stop. For development with automatic reload, use `npm run dev`.

### Play with phones on the same Wi-Fi

`npm start` prints the addresses available on your network, and `npm run addresses` prints them again. Open one of those addresses, such as `http://192.168.1.20:3000`, **on the host's computer as well as on the phones**, so the room's share link works on other devices. `localhost` always means the device you are using.

Guest Wi-Fi networks often block devices from reaching each other. You do not need to forward any router ports. When the browser cannot copy to the clipboard over plain HTTP, the share button shows the link for manual copying.

### Data and backups

Rooms, players, games in progress and results are stored in `data/house-rules.sqlite`, which is created automatically and ignored by Git. To use another path, copy `.env.example` to `.env.local` and set `DATABASE_PATH`.

```sh
npm run db:backup
# Or choose a destination that does not exist yet:
npm run db:backup -- /path/to/copy.sqlite
```

Backups use SQLite's backup API and are safe while the server is running. To restore one, stop the server and point `DATABASE_PATH` at the copy. Do not copy only the `.sqlite` file from a running server, because recent changes may still be in the `-wal` file.

### When someone gets stuck

During a game, the host can open **Someone stuck?** below the board to continue with the answers received or skip a turn. If the host is offline for a minute, other players can take over hosting. A player who loses their seat can pick their name under **Already at this table?** and show the matching code to the host, who approves the recovery.

## Self-host on Cloudflare

You need a Cloudflare account. Usage may be billed by Cloudflare, and budget alerts do not cap spending, so check the current [Workers](https://developers.cloudflare.com/workers/platform/pricing/) and [D1](https://developers.cloudflare.com/d1/platform/pricing/) pricing first. Each connected player polls the server about once per second.

[`wrangler.jsonc`](wrangler.jsonc) is a generic template with no account or database IDs. Your real values go in `wrangler.production.jsonc`, which Git ignores.

1. Install dependencies, sign in and create a D1 database:

   ```sh
   npm ci
   npx wrangler login
   npx wrangler d1 create house-rules
   cp wrangler.jsonc wrangler.production.jsonc
   ```

2. Edit `wrangler.production.jsonc`:

   - Add the returned `"database_id"` to the `d1_databases` entry.
   - Set `SITE_ORIGIN` to your public address, such as `https://house-rules.<your-subdomain>.workers.dev`.
   - If you have more than one Cloudflare account, add `"account_id"`.
   - To use your own domain, add `"routes": [{ "pattern": "games.example.com", "custom_domain": true }]`.

3. Apply the database migrations and deploy:

   ```sh
   npm run db:migrate:remote
   npm run deploy:cloudflare
   ```

Run the same two commands to publish an update. Apply migrations first when a release adds one. Arguments after `--` are passed to Wrangler, for example `npm run deploy:cloudflare -- --tag v1.0.0`. Merging to a Git branch does not deploy anything.

`npm run build:cloudflare` builds with the template and is meant for checks, so do not deploy its output. `npm run build:cloudflare:production` builds with your production config without deploying.

### Run the Worker locally

```sh
npm run db:migrate:local
npm run dev:cloudflare
```

This serves the app at <http://localhost:3102> with a local D1 database in `.wrangler/cloudflare-state`. It does not touch your deployed database. Use a separate working copy if you develop the Next.js and Vinext targets at the same time, because Vinext writes to `.next/types` during development.

## Portuguese support

The app is bilingual in English and European Portuguese (`pt-PT`). **A first visit opens in Portuguese.** The **EN / PT** control switches language and each phone remembers its own choice, so people in one room can use different languages. Text written by players is never translated.

English is the source language. Interface text goes through `t('English text')`, and translations are stored as English-to-Portuguese pairs, mainly in [`lib/pt-pt.json`](lib/pt-pt.json), with feature-specific files beside it in `lib/`. When you add or change English text, add its translation and run `npm run test:i18n`, which checks translation coverage.

## Tests

Most tests call a running server and create rooms, so run them against a separate instance and database:

```sh
npm run build
DATABASE_PATH=/tmp/house-rules-tests.sqlite PORT=3001 npm start

# In another terminal:
TEST_BASE_URL=http://localhost:3001 BASE_URL=http://localhost:3001 TEST_CONTINUITY_URL=http://localhost:3001 npm run test:games
npm run lint
npx tsc --noEmit
```

To run the suite against the local Worker, start it as above and point the same three variables at `http://localhost:3102`.

There is also a browser test for Charades, which needs Chromium (`npx playwright install chromium`):

```sh
TEST_BASE_URL=http://localhost:3001 npm run test:charades-browser
```

## License

House Rules is released under the [MIT License](LICENSE).

The Geist fonts are bundled in `public/fonts/` under the [SIL Open Font License](public/fonts/OFL.txt).
