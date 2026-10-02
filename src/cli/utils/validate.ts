import consola from 'consola';
import { DatabaseConfigurationTenant } from '@antify/database';

/**
 * Reports an input error and marks the process as failed (exit code 1).
 * Returns void so callers can keep using `return fail(...)` / `if (!validate...()) return;`.
 */
export const fail = (message: string): void => {
  consola.error(message);
  process.exitCode = 1;
};

export const validateDatabaseName = (databaseName: string): true | void => {
  if (!databaseName) {
    return fail(`Missing required argument "databaseName"`);
  }

  return true;
};

export const validateHasTenantId = (
  tenants: DatabaseConfigurationTenant[],
  tenantId: string
): true | void => {
  if (!tenants.some((tenant) => tenant.id === tenantId)) {
    return fail(`Tenant with id ${tenantId} does not exists`);
  }

  return true;
};
