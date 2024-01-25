import consola from 'consola';
import {
  DatabaseConfigurations,
  MultiConnectionDatabaseConfiguration,
  SingleConnectionDatabaseConfiguration,
  loadDatabaseConfiguration,
} from '@antify/database';

export const loadDatabaseConfig = (
  databaseName: string,
  projectRootDir: string
):
  | SingleConnectionDatabaseConfiguration
  | MultiConnectionDatabaseConfiguration
  | null => {
  let databaseConfig: DatabaseConfigurations;

  try {
    databaseConfig = loadDatabaseConfiguration(false, projectRootDir) || {};
  } catch (e) {
    consola.error(e.message);
    return null;
  }

  if (databaseConfig[databaseName] === undefined) {
    consola.error(
      `There exists no configuration for database "${databaseName}"`
    );
    return null;
  }

  return databaseConfig[databaseName];
};
