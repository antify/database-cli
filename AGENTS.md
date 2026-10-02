# AGENTS.md

Guidance for coding agents (and humans) working in this repository.

## Purpose

`@antify/database-cli` provides the `db` command line tool for the Antify database layer (MongoDB): create and run migrations, create and load fixtures, show migration status, truncate and drop databases. It is a thin shell: the logic lives in `@antify/database`, this repo only parses arguments, loads `database.config.ts` and calls the core functions. Published to npm as `@antify/database-cli`.

## Prerequisites

- Node `^22.14.0` (CI uses 22.14.0, see `.nvmrc`; newer Node only prints an "unsupported engine" warning).
- pnpm `10.10.0` (`packageManager` in `package.json`).
- For running the CLI against a database: a MongoDB you may freely destroy (see "Destructive commands").

## Commands

All commands were run in a fresh worktree on 2026-10-02 (Node 24.19, pnpm 10.10.0).

| Command | Purpose | Duration |
| --- | --- | --- |
| `CI=true pnpm install --frozen-lockfile` | Install, non-interactive | ~1-4 s |
| `pnpm build` | Build `dist/` with unbuild (required before running `bin/db.mjs`) | ~4 s |
| `pnpm lint` | ESLint (flat config `eslint.config.js`), no auto-fix | ~3 s |
| `pnpm lint:fix` | ESLint with `--fix` | ~3 s |
| `node bin/db.mjs` | Print the list of commands (after `pnpm build`) | <1 s |

Fastest check after a change: `pnpm build` (there are no tests), then `pnpm lint` and compare against the baseline below.

There is no `test` script. `pnpm dev` runs `vitest dev`, but vitest is not installed, so it does not work.

### Running the CLI locally against a throw-away MongoDB

1. Start a disposable MongoDB on a free port, e.g. `docker run -d --rm --name dbcli-smoke -p 127.0.0.1:27099:27017 mongo:7`.
2. Create a scratch directory (inside the repo use the git-ignored `.tmp/`) with a `database.config.ts` that points to that instance and uses relative `migrationDir`/`fixturesDir` (`fixturesDir` is an array):

   ```ts
   import {defineDatabaseConfig} from '@antify/database';
   export default defineDatabaseConfig({
     core: {
       databaseUrl: 'mongodb://127.0.0.1:27099/core?directConnection=true',
       isSingleConnection: true,
       migrationDir: './migrations',
       fixturesDir: ['./fixtures'],
     },
   });
   ```
3. Run e.g. `node bin/db.mjs status core --cwd .tmp/smoke`. `--cwd` sets the project directory.
4. Remove the container afterwards: `docker rm -f dbcli-smoke`.

Verified this way: `make-migration`, `make-fixture`, `status`, `migrate` (up), `truncate`, `load-fixtures`, `drop-database`. Not executed: `--tenant` variants, `--collections`, `migrate --down` (which requires `--migration`).

The repo's own `database.config.ts` is a playground config pointing at `mongodb://localhost:27017` without credentials. Do not run destructive commands with it unless you know what listens on that port.

## Destructive commands

**`drop-database`, `truncate` and `load-fixtures` delete data without any confirmation prompt.**

- `drop-database <db>` drops the database (for multi-tenant databases: all tenants).
- `truncate <db>` empties all collections (or the ones in `--collections`).
- `load-fixtures` truncates, runs migrations, then loads fixtures. **Without a database name it hits every configured database and tenant.**
- The target is decided by `.env` (loaded from the working directory via dotenv) and `database.config.ts` in the working directory (or `--cwd`). Before every run, read the `databaseUrl` in that config and make sure it is a local or disposable database.
- Never run these against a foreign or production database. `db status <db>` is read-only and a safe first look.
- Exit code: a missing required argument (e.g. `db migrate` without a database name) prints an error but exits with code **0**. Do not rely on the exit code to detect that. Unknown commands and unknown database configs exit with 1.

## Structure

- `bin/db.mjs`: executable, loads `dist/cli.mjs`.
- `src/cli.ts`: dispatcher (argument parsing with `mri`, output with `consola`).
- `src/cli/commands/*.ts`: one file per command, each `defineDbCommand({meta, invoke})`; registered in `src/cli/commands/index.ts`.
- `src/cli/utils/`: validation, config loading (`database.config.ts` via jiti), help, engines.
- `src/run.ts`, `src/index.ts`: programmatic entry and library export.
- `playground/{core,tenant}/{migrations,fixtures,schemas}` plus `database.config.ts`: example setup.
- `docker-compose.yml`, `docker/`: local MongoDB Atlas image for development.

Adding a command: create `src/cli/commands/<name>.ts` following an existing file (for example `status.ts`), add a lazy import entry in `src/cli/commands/index.ts`, rebuild, check with `node bin/db.mjs <name>`.

## CLI commands

| Command | Purpose |
| --- | --- |
| `db status [databaseName] [--tenant]` | Show the migration status (read-only) |
| `db migrate [databaseName] [--migration] [--tenant] [--down]` | Run migrations |
| `db make-migration [databaseName] [migrationName]` | Generate a migration file `YYYYMMDDHHMMSS-name.ts` (UTC) |
| `db make-fixture [databaseName] [fixtureName]` | Generate a fixture file |
| `db load-fixtures [databaseName] [--tenant]` | DESTRUCTIVE: truncate, migrate, load fixtures |
| `db truncate [databaseName] [--tenant] [--collections a,b]` | DESTRUCTIVE: empty collections |
| `db drop-database [databaseName] [--tenant]` | DESTRUCTIVE: drop database |
| `db help` | Show help |

Global option: `--cwd <dir>`.

## How the three repositories fit together

`@antify/database` (core: clients, migrations, fixtures) <- `@antify/database-cli` (this repo, `db` binary) <- `@antify/database-module` (Nuxt module).

- This repo depends on `@antify/database` with an exact version (`dependencies`). `database-module` pins the core (runtime) and this CLI (dev dependency) exactly as well.
- All links go over the npm registry with exact versions. There is no local linking and no automation that bumps the pins.
- Release order: 1. `database` is published; 2. here, raise the `@antify/database` pin and merge, which publishes `database-cli`; 3. `database-module` raises its pins. Each step needs the previous version to exist on npm, otherwise `pnpm install` fails.

## Commits and releases

- Conventional Commits (`feat:`, `fix:`, `chore:`, `feat!:` for breaking), in English. `standard-version` derives version and CHANGELOG from them.
- **Merging to `main` publishes a new npm release automatically** (`.github/workflows/release.yml`: version bump, tag, `npm publish`). This also applies to docs and chore merges. Only merge when a release is intended.
- Never run `pnpm release` or `pnpm publish` locally.
- Pull requests run `pr.yml` (install, build; lint is informational for now).

## Known state (2026-10-02)

- No tests exist.
- `pnpm lint` runs and currently reports 18 errors in 11 files (mostly `no-explicit-any`, `consistent-type-imports`, `no-invalid-void-type`; 7 auto-fixable). Rule: no new lint errors in files you touch. Do not loosen rules to hide errors.
- `typescript` is pinned to `~6.0.3` because `typescript-eslint` does not support TypeScript 7 yet.
- `npx tsc --noEmit` fails (also on TS 6): `tsconfig.json` uses `moduleResolution: node10`, which TypeScript deprecates. Not changed here, because it can alter the build. Do not add new type errors.
- `build.config.ts` has `failOnWarn: false`.
