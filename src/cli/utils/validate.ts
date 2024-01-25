import consola from 'consola';
import { DatabaseConfigurationTenant } from '@antify/database';

export const validateDatabaseName = (databaseName: string): true | void => {
  if (!databaseName) {
    return consola.error(`Missing required argument "databaseName"`);
  }

  return true;
};

export const validateHasTenantId = (
  tenants: DatabaseConfigurationTenant[],
  tenantId: string
): true | void => {
  if (!tenants.some((tenant) => tenant.id === tenantId)) {
    return consola.error(`Tenant with id ${tenantId} does not exists`);
  }

  return true;
};
