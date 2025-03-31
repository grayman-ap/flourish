// Re-export existing types we need
export * from '@/lib/types';
export * from './tenant';

// Add tenant-specific role types
export type UserRole = 'super_admin' | 'tenant_admin' | 'staff' | 'customer';

// Extend existing types to be tenant-aware
export interface TenantAwareNetworkLocation {
  tenantId: string;
  key: string;
  value: string;
}
