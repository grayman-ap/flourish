import { database } from '../firebase';
import { ref, get, set, push, query, orderByChild, equalTo, remove } from 'firebase/database';
import { NetworkLocation, Tenant, TenantConfig } from '../types/tenant';

// Get tenant by ID with improved error handling
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  try {
    console.log(`Looking up tenant with ID: ${tenantId}`);
    const tenantRef = ref(database, `tenants/${tenantId}`);
    const snapshot = await get(tenantRef);
    
    if (snapshot.exists()) {
      console.log(`Tenant found: ${tenantId}`, snapshot.val());
      const tenantData = snapshot.val();
      
      if (tenantData.config) {
        // Create a tenant object that matches your Tenant interface
        const tenant: Tenant = {
          id: tenantId,
          name: tenantData.config.name || 'Unknown Tenant',
          contactEmail: tenantData.config.contactEmail || '',
          primaryColor: tenantData.config.primaryColor || '#000000',
          secondaryColor: tenantData.config.secondaryColor || tenantData.config.primaryColor || '#000000',
          active: tenantData.config.active !== false, // Default to true if not specified
          createdAt: tenantData.createdAt || Date.now(),
          // Add any other required properties with defaults
        };
        
        console.log("Constructed tenant object:", tenant);
        return tenant;
      } else {
        console.error(`Tenant ${tenantId} exists but has no config object`);
      }
    } else {
      console.error(`Tenant not found: ${tenantId}`);
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting tenant ${tenantId}:`, error);
    return null;
  }
}

// Get tenant by subdomain
export async function getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  try {
    const tenantsRef = ref(database, 'tenants');
    const snapshot = await get(tenantsRef);
    
    if (snapshot.exists()) {
      let foundTenant: Tenant | null = null;
      
      snapshot.forEach((childSnapshot) => {
        const tenantId = childSnapshot.key as string;
        const tenantData = childSnapshot.val();
        
        if (
          tenantData.config && 
          tenantData.config.subdomain === subdomain &&
          tenantData.config.active !== false
        ) {
          foundTenant = {
            id: tenantId,
            ...tenantData.config,
            active: true,
            createdAt: tenantData.createdAt
          };
          return true; // Break the forEach loop
        }
        
        return false;
      });
      
      return foundTenant;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting tenant by subdomain:', error);
    return null;
  }
}

// Get tenant by domain
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  try {
    const tenantsRef = ref(database, 'tenants');
    const snapshot = await get(tenantsRef);
    
    if (snapshot.exists()) {
      let foundTenant: Tenant | null = null;
      
      snapshot.forEach((childSnapshot) => {
        const tenantId = childSnapshot.key as string;
        const tenantData = childSnapshot.val();
        
        if (
          tenantData.config && 
          tenantData.config.domain === domain &&
          tenantData.config.active !== false
        ) {
          foundTenant = {
            id: tenantId,
            ...tenantData.config,
            active: true,
            createdAt: tenantData.createdAt
          };
          return true; // Break the forEach loop
        }
        
        return false;
      });
      
      return foundTenant;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting tenant by domain:', error);
    return null;
  }
}

// Get tenant by any identifier (id, subdomain, or domain)
export async function getTenantByIdentifier(identifier: string): Promise<Tenant | null> {
  try {
    // First try to get by ID (most direct)
    const tenantById = await getTenantById(identifier);
    if (tenantById) {
      return tenantById;
    }
    
    // Then try by subdomain
    const tenantBySubdomain = await getTenantBySubdomain(identifier);
    if (tenantBySubdomain) {
      return tenantBySubdomain;
    }
    
    // Finally try by domain
    const tenantByDomain = await getTenantByDomain(identifier);
    if (tenantByDomain) {
      return tenantByDomain;
    }
    
    // No tenant found with this identifier
    return null;
  } catch (error) {
    console.error('Error getting tenant by identifier:', error);
    return null;
  }
}

// Create a new tenant
export async function createTenant(
  tenantId: string,
  config: TenantConfig
): Promise<Tenant | null> {
  try {
    // Check if tenant ID already exists
    const tenantRef = ref(database, `tenants/${tenantId}`);
    const snapshot = await get(tenantRef);
    
    if (snapshot.exists()) {
      throw new Error(`Tenant ID "${tenantId}" already exists.`);
    }
    
    // Create the tenant
    await set(tenantRef, {
      config,
      createdAt: Date.now()
    });
    
    // Create default locations
    const locationsRef = ref(database, `tenants/${tenantId}/locations`);
    const mainLocationRef = push(locationsRef);
    
    await set(mainLocationRef, {
      key: 'main',
      value: 'Main Location'
    });
    
    return {
      id: tenantId,
      ...config,
      active: true,
      createdAt: Date.now()
    };
  } catch (error) {
    console.error('Error creating tenant:', error);
    return null;
  }
}
// Update tenant config
export async function updateTenantConfig(
  tenantId: string,
  config: Partial<TenantConfig>
): Promise<boolean> {
  try {
    // Get current config
    const tenantRef = ref(database, `tenants/${tenantId}/config`);
    const snapshot = await get(tenantRef);
    
    if (!snapshot.exists()) {
      throw new Error(`Tenant ID "${tenantId}" not found.`);
    }
    
    const currentConfig = snapshot.val();
    
    // Update config
    await set(tenantRef, {
      ...currentConfig,
      ...config
    });
    
    return true;
  } catch (error) {
    console.error('Error updating tenant config:', error);
    return false;
  }
}

// Get current tenant ID (client-side)
export const getCurrentTenantId = (): string => {
  // In client components, get from tenant context or localStorage
  return localStorage.getItem('current_tenant_id') || 
         process.env.NEXT_PUBLIC_DEFAULT_TENANT || 
         'flourish';
};

// Tenant-aware location fetching
export const fetchTenantLocations = async (tenantId: string): Promise<NetworkLocation[]> => {
  const locationsRef = ref(database, `tenants/${tenantId}/locations`);
  const snapshot = await get(locationsRef);
  
  if (!snapshot.exists()) return [];
  
  return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
    key: data.key,
    value: data.value
  }));
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
