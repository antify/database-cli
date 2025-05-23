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
- [ ] Add promps for load-migration and -fixtures to give the dev an abillity to exit before 
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

### TODO:: Describe commands in docs

## Migration naming

The sorting of the migration names is important. New migrations should be added to the end (sorted ASC).
Its recommended to keep the date at start of the name.

## Development

- Run `pnpm build` to generate type stubs.
- Run `node bin/db.mjs` to call commands.
