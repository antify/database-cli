# Database CLI

It does:
- [x] Merges multiple schemas to one
- [x] Provide a client for each database
- [x] Make fixtures logic
- [x] Make seed logic
- [x] Make migration logic
- [x] Handle multiple migrations from different sources
- [x] Comes with a set of cli commands
- [x] Provides a core and tenant client
- [x] Handle multiple databases for one schema (tenancy)
- [x] Define how things can be extended trought different schemas
- [ ] Write docs
- [ ] Improve security (mongodb user per tenant)
- [ ] Make work with npx. Only works with yarn or pnpm exec
- [x] Add promps for load-migration and -fixtures to give the dev an abillity to exit before 
any code get exec.
- [ ] On load fixtures or migrations without database name, load everything
- [ ] Write tests. May with cypress?

TODO:
- [x] Rename nuxt namings
- [ ] Find a propper solution to call client.connect only once
- [ ] Write a preview command which show the migration state like so:
A
B <-- Missing
C <-- Current Version
D <-- Not executed

## Usage

Install the package with pnpm:

```bash
pnpm i -D @antify/database-cli --shamefully-hoist
```

Call the cli where the database.config.ts is located with pnpm:

```bash
pnpm exec db
```

or with npx

```bash
npx db
```

## Commands

Run `db <command> --help` for details. Global option: `--cwd <dir>` sets the project directory.

| Command | Purpose |
| --- | --- |
| `db status [databaseName] [--tenant]` | Show the migration status |
| `db migrate [databaseName] [--migration] [--tenant] [--down]` | Run migrations (`--down` requires `--migration`) |
| `db make-migration [databaseName] [migrationName]` | Generate a migration |
| `db make-fixture [databaseName] [fixtureName]` | Generate a fixture |
| `db load-fixtures [databaseName] [--tenant] [--yes]` | **Destructive, asks for confirmation.** Truncate, run migrations, load fixtures. Without a database name: all databases and tenants |
| `db truncate [databaseName] [--tenant] [--collections a,b] [--yes]` | **Destructive, asks for confirmation.** Empty collections (comma separated, no spaces). On a multi-tenant database without `--tenant` it empties ALL tenants |
| `db drop-database [databaseName] [--tenant] [--yes]` | **Destructive, asks for confirmation.** Drop the database (multi-tenant: all tenants) |
| `db help` | Show help |

> **Warning:** `load-fixtures`, `truncate` and `drop-database` delete data. The target is determined by the `.env` and `database.config.ts` in the working directory. Check the target before every run and never run them against a database you do not own or that holds production data.
>
> Before anything is deleted, these commands print what is affected (database names, host without credentials, tenants; "ALL tenants" for `truncate` without `--tenant`, all configured databases for `load-fixtures` without a database name) and ask `Continue? [y/N]` (default: no).
> `--yes` (`-y`) skips the question. Without `--yes` in a non-interactive shell (no TTY, e.g. CI) the command refuses to run, changes nothing and exits with code 1.
>
> **Upgrading:** scripts that call these commands non-interactively need `--yes` as of this version.
>
> A missing required argument, an unknown tenant or a declined confirmation exit with code 1.

## Migration naming

The sorting of the migration names is important. New migrations should be added to the end (sorted ASC).
Its recommended to keep the date at start of the name.

## Migration data access

Generated migrations receive a schema-independent migration context.
Use its raw collection access and helpers instead of current application models when old document fields need to be transformed.

```typescript
export default defineMigration({
  async up(context) {
    await context.renameField('cars', 'color', 'farbe');
  },

  async down(context) {
    await context.renameField('cars', 'farbe', 'color');
  },
});
```

## Development

- Run `CI=true pnpm install --frozen-lockfile` to install (Node `^22.14.0`, see `.nvmrc`).
- Run `pnpm build` before calling the CLI (`bin/db.mjs` loads `dist/`).
- Run `node bin/db.mjs` to call commands, e.g. against a disposable MongoDB.
- Run `pnpm lint` (or `pnpm lint:fix`) to lint.
- Merging to `main` publishes a new npm release automatically; never run `pnpm release` locally.

See [AGENTS.md](https://github.com/antify/database-cli/blob/main/AGENTS.md) for the full guide, including how the three repositories (`database`, `database-cli`, `database-module`) fit together.
