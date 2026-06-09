// Mirrors com.cts.common.constants.Role
export type Role = 'ADMIN' | 'CUSTOMER' | 'DISPATCHER' | 'FLEET_MANAGER' | 'DRIVER' | 'AUDITOR' | 'USER';

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  CUSTOMER: 'Customer',
  DISPATCHER: 'Dispatcher',
  FLEET_MANAGER: 'Fleet Manager',
  DRIVER: 'Driver',
  AUDITOR: 'Auditor',
  USER: 'User'
};
