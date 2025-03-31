import { ref, get, remove, query, orderByChild, equalTo } from 'firebase/database';
import { NetworkLocation } from '../types';
import { database } from '../firebase';

// Get current tenant ID (client-side)
export const getCurrentTenantId = (): string => {
  // In client components, get from tenant context or localStorage
  return localStorage.getItem('current_tenant_id') || 
         process.env.NEXT_PUBLIC_DEFAULT_TENANT || 
         'flourish';
};

// Tenant-aware location fetching
export const fetchTenantLocations = async (tenantId: string): Promise<NetworkLocation[]> => {
  if (!tenantId) {
    console.error("No tenant ID provided to fetchTenantLocations");
    return [];
  }
  
  console.log("Fetching locations for tenant:", tenantId);
  
  try {
    const locationsRef = ref(database, `tenants/${tenantId}/locations`);
    const snapshot = await get(locationsRef);
    
    if (!snapshot.exists()) {
      console.log("No locations found for tenant:", tenantId);
      return [];
    }
    
    const locations: NetworkLocation[] = [];
    
    snapshot.forEach((childSnapshot) => {
      const locationData = childSnapshot.val();
      if (locationData && locationData.key && locationData.value) {
        locations.push({
          key: locationData.key,
          value: locationData.value
        });
      }
    });
    
    console.log("Fetched locations for tenant:", tenantId, locations);
    return locations;
  } catch (error) {
    console.error("Error fetching locations for tenant:", tenantId, error);
    return [];
  }
};

// Tenant-aware voucher generation
export const getTenantVoucherAndDelete = async (
  tenantId: string,
  duration: string,
  capacity: string,
  bundle: string,
  network_location: string
) => {
  // Query for available vouchers matching criteria
  const vouchersRef = ref(database, `tenants/${tenantId}/vouchers`);
  const voucherQuery = query(
    vouchersRef,
    orderByChild('isUsed'),
    equalTo(false)
  );
  
  const snapshot = await get(voucherQuery);
  if (!snapshot.exists()) return null;
  
  // Find matching vouchers
  const vouchers = Object.entries(snapshot.val())
    .filter(([_, data]: [string, any]) => 
      data.duration === duration &&
      data.capacity === capacity &&
      data.bundle === bundle &&
      data.locationId === network_location
    );
  
  if (vouchers.length === 0) return null;
  
  // Get a random voucher
  const randomIndex = Math.floor(Math.random() * vouchers.length);
  const [voucherId, voucherData]: [string, any] = vouchers[randomIndex];
  
  // Mark as used
  await remove(ref(database, `tenants/${tenantId}/vouchers/${voucherId}`));
  
  return voucherData.code;
};

// Get tenant configuration
export const getTenantConfig = async (tenantId: string) => {
  const configRef = ref(database, `tenants/${tenantId}/config`);
  const snapshot = await get(configRef);
  
  if (!snapshot.exists()) return null;
  
  return snapshot.val();
};

// Get count of available vouchers for a tenant
export async function getTenantVoucherCount(
  tenantId: string,
  duration: string,
  capacity: string = '1',
  bundle: string,
  location?: string
): Promise<number> {
  try {
    let path = `tenants/${tenantId}/vouchers/${duration}/${capacity}/${bundle}`;
    
    // If location is specified, count vouchers for that location only
    if (location) {
      path += `/${location}`;
    }
    
    const vouchersRef = ref(database, path);
    const snapshot = await get(vouchersRef);
    
    if (!snapshot.exists()) {
      return 0;
    }
    
    // If location is not specified, count vouchers across all locations
    if (!location) {
      let totalCount = 0;
      
      // Iterate through locations
      snapshot.forEach((locationSnapshot) => {
        // Count vouchers in this location
        totalCount += Object.keys(locationSnapshot.val() || {}).length;
      });
      
      return totalCount;
    }
    
    // Count vouchers in the specified location
    return Object.keys(snapshot.val() || {}).length;
  } catch (error) {
    console.error('Error getting voucher count:', error);
    return 0;
  }
}

// Get voucher usage statistics for a tenant
export async function getTenantVoucherUsageStats(tenantId: string) {
  try {
    const usageRef = ref(database, `tenants/${tenantId}/voucher_usage`);
    const snapshot = await get(usageRef);
    
    if (!snapshot.exists()) {
      return {
        total: 0,
        byDuration: { '1d': 0, '7d': 0, '30d': 0 } as Record<string, number>,
        byBundle: { 'standard': 0, 'premium': 0 } as Record<string, number>,
        byLocation: {} as Record<string, number>
      };
    }
    
    const usageData = snapshot.val();
    const usageEntries = Object.values(usageData) as any[];
    
    // Initialize statistics
    const stats = {
      total: usageEntries.length,
      byDuration: { '1d': 0, '7d': 0, '30d': 0 } as Record<string, number>,
      byBundle: { 'standard': 0, 'premium': 0 } as Record<string, number>,
      byLocation: {} as Record<string, number>
    };
    
    // Count usage by different dimensions
    usageEntries.forEach((entry) => {
      // Count by duration - only count valid durations
      if (entry.duration) {
        const duration = entry.duration as string;
        if (['1d', '7d', '30d'].includes(duration)) {
          stats.byDuration[duration] = (stats.byDuration[duration] || 0) + 1;
        }
      }
      
      // Count by bundle - only count valid bundles
      if (entry.bundle) {
        const bundle = entry.bundle as string;
        if (['standard', 'premium'].includes(bundle)) {
          stats.byBundle[bundle] = (stats.byBundle[bundle] || 0) + 1;
        }
      }
      
      // Count by location
      if (entry.networkLocation) {
        const location = entry.networkLocation as string;
        stats.byLocation[location] = (stats.byLocation[location] || 0) + 1;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting voucher usage stats:', error);
    return {
      total: 0,
      byDuration: { '1d': 0, '7d': 0, '30d': 0 },
      byBundle: { 'standard': 0, 'premium': 0 },
      byLocation: {}
    };
  }
}
