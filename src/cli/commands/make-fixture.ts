import fs from 'fs';
import consola from 'consola';
import {join, resolve} from 'pathe';
import {defineDbCommand} from './index';
import {loadDatabaseConfig} from '../utils/load-database-config';

export default defineDbCommand({
  meta: {
    name: 'make-fixture',
    usage: 'db make-fixture [databaseName] [fixtureName]',
    description: 'Generates a fixture',
  },
  invoke(args) {
    const databaseName = args._[0]?.trim();
    const fixtureName = args._[1]?.trim();
    const absolutePath = resolve(args.cwd || '.');

    if (!databaseName) {
      return consola.error(`Missing required argument "databaseName"`);
    }

    if (!fixtureName) {
      return consola.error(`Missing required argument "fixtureName"`);
    }

    const databaseConfig = loadDatabaseConfig(
      databaseName,
      resolve(args.cwd || '.')
    );

    if (!databaseConfig) {
      return;
    }

    let relativeOutDir = `fixtures/${databaseConfig.name}`;

    if (databaseConfig.fixturesDir instanceof String) {
      relativeOutDir = databaseConfig.fixturesDir;
    } else if (Array.isArray(databaseConfig.fixturesDir) && databaseConfig.fixturesDir.length > 0) {
      relativeOutDir = databaseConfig.fixturesDir[0];
    }

    const absoluteOutDir = join(absolutePath, relativeOutDir);

    if (!fs.existsSync(absoluteOutDir)) {
      fs.mkdirSync(absoluteOutDir, {recursive: true});
    }

    const fileName = `${fixtureName}.ts`;

    fs.writeFileSync(
      join(absoluteOutDir, fileName),
      `import { defineFixture } from "@antify/database";

export default defineFixture({
  async load(client) {

  },

  dependsOn() {
    return [];
  }
});`
    );

    consola.info(`Created: ${join(relativeOutDir, fileName)}`);
  },
});
