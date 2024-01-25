import consola from 'consola';
import {defineAntDbCommand} from './index';
import {resolve} from 'pathe';
import {getAbsoluteFixturesDirs} from '@antify/database';
import {join} from 'pathe';
import fs from 'fs';
import {loadDatabaseConfig} from '../utils/load-database-config';

export default defineAntDbCommand({
    meta: {
        name: 'make-fixture',
        usage: 'db make-fixture [databaseName] [fixtureName]',
        description: 'Generates a fixture',
    },
    invoke(args) {
        const databaseName = args._[0]?.trim();
        const fixtureName = args._[1]?.trim();

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

        const absoluteOutDir = getAbsoluteFixturesDirs(
            databaseConfig,
            resolve(args.cwd || '.')
        );

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

        consola.info(`Created: ${databaseConfig.fixturesDir}/${fileName}`);
    },
});
