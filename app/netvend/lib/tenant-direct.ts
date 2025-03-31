import { ref, get } from 'firebase/database';
import { database } from '../firebase';
import { Tenant } from '../types/tenant';

export async function getTenantDirectly(tenantId: string): Promise<Tenant | null> {
  try {
    console.log(`Direct lookup for tenant with ID: ${tenantId}`);
    
    // Get the tenant data from Firebase
    const tenantRef = ref(database, `tenants/${tenantId}`);
    const snapshot = await get(tenantRef);
    
    if (!snapshot.exists()) {
      console.error(`Tenant not found: ${tenantId}`);
      return null;
    }
    
    // Extract the tenant data
    const tenantData = snapshot.val();
    console.log(`Raw tenant data:`, tenantData);
    
    // Check if the tenant has a config object
    if (!tenantData.config) {
      console.error(`Tenant ${tenantId} has no config object`);
      return null;
    }
    
    // Create a tenant object
    const tenant: Tenant = {
      id: tenantId,
      name: tenantData.config.name || 'Unknown Tenant',
      contactEmail: tenantData.config.contactEmail || '',
      primaryColor: tenantData.config.primaryColor || '#000000',
      secondaryColor: tenantData.config.secondaryColor || tenantData.config.primaryColor || '#000000',
      active: tenantData.config.active !== false,
      createdAt: tenantData.createdAt || Date.now(),
    };
    
    console.log(`Created tenant object:`, tenant);
    
    // Store the tenant data in localStorage for debugging
    if (typeof window !== 'undefined') {
      localStorage.setItem('tenant_data', JSON.stringify(tenant));
    }
    
    return tenant;
  } catch (error) {
    console.error(`Error in direct tenant lookup:`, error);
    return null;
  }
}
