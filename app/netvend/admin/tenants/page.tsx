"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { ref, get, push, set } from 'firebase/database';
import { Tenant } from '@/app/netvend/types/tenant';
import { Loader2, Plus, Search, ExternalLink } from 'lucide-react';
import { database } from '@/app/netvend/firebase';

export default function TenantsListPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Load tenants
  useEffect(() => {
    const loadTenants = async () => {
      try {
        setLoading(true);
        
        const tenantsRef = ref(database, 'tenants');
        const snapshot = await get(tenantsRef);
        
        if (snapshot.exists()) {
          const tenantsList: Tenant[] = [];
          
          snapshot.forEach((childSnapshot) => {
            const tenantId = childSnapshot.key as string;
            const tenantData = childSnapshot.val();
            
            if (tenantData.config) {
              tenantsList.push({
                id: tenantId,
                ...tenantData.config,
                active: tenantData.config.active !== false, // Default to true if not specified
                createdAt: tenantData.createdAt
              });
            }
          });
          
          setTenants(tenantsList);
        }
      } catch (error) {
        console.error('Error loading tenants:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadTenants();
  }, []);
  
  // Filter tenants based on search query
  const filteredTenants = tenants.filter((tenant) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      tenant.name.toLowerCase().includes(query) ||
      tenant.id.toLowerCase().includes(query) ||
      (tenant.subdomain && tenant.subdomain.toLowerCase().includes(query)) ||
      (tenant.domain && tenant.domain.toLowerCase().includes(query))
    );
  });
  
  // Create a new tenant
  const createTenant = async () => {
    try {
      const tenantName = prompt('Enter tenant name:');
      
      if (!tenantName) return;
      
      // Generate a tenant ID from the name
      const tenantId = tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Create a new tenant
    const tenantRef = ref(database, `tenants/${tenantId}`);
    
    // Check if tenant ID already exists
    const snapshot = await get(tenantRef);
    
    if (snapshot.exists()) {
      alert(`Tenant ID "${tenantId}" already exists. Please use a different name.`);
      return;
    }
    
    // Generate a default primary color
    const primaryColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    
    // Create the tenant
    await set(tenantRef, {
      config: {
        name: tenantName,
        primaryColor,
        contactEmail: '',
        active: true
      },
      createdAt: Date.now()
    });
    
    // Create default locations
    const locationsRef = ref(database, `tenants/${tenantId}/locations`);
    const mainLocationRef = push(locationsRef);
    
    await set(mainLocationRef, {
      key: 'main',
      value: 'Main Location'
    });
    
    // Add the new tenant to the list
    setTenants([
      ...tenants,
      {
        id: tenantId,
        name: tenantName,
        primaryColor,
        contactEmail: '',
        active: true,
        createdAt: Date.now()
      }
    ]);
    
    // Navigate to the tenant management page
    router.push(`/admin/tenants/${tenantId}`);
  } catch (error) {
    console.error('Error creating tenant:', error);
    alert('Failed to create tenant. Please try again.');
  }
};

if (loading) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );
}

return (
  <div className="container mx-auto p-4">
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold">Tenants</h1>
      <Button onClick={createTenant}>
        <Plus className="h-4 w-4 mr-2" />
        Create Tenant
      </Button>
    </div>
    
    <div className="mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search tenants..."
          className="w-full pl-10 pr-4 py-2 border rounded-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredTenants.length > 0 ? (
        filteredTenants.map((tenant) => (
          <Card 
            key={tenant.id}
            className={`cursor-pointer hover:shadow-md transition-shadow ${
              !tenant.active ? 'opacity-60' : ''
            }`}
            onClick={() => router.push(`/netvend/admin/tenants/${tenant.id}`)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{tenant.name}</CardTitle>
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: tenant.primaryColor }}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">ID: {tenant.id}</p>
                
                {tenant.subdomain && (
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 mr-1">Subdomain:</span>
                    <a 
                      href={`https://${tenant.subdomain}.netvend.com`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {tenant.subdomain}.netvend.com
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                )}
                
                {tenant.domain && (
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 mr-1">Domain:</span>
                    <a 
                      href={`https://${tenant.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {tenant.domain}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    tenant.active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {tenant.active ? 'Active' : 'Inactive'}
                  </span>
                  
                  <span className="text-xs text-gray-500">
                    Created: {new Date(tenant.createdAt || 0).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="col-span-full text-center py-12">
          <p className="text-gray-500">
            {searchQuery 
              ? 'No tenants found matching your search.' 
              : 'No tenants have been created yet.'}
          </p>
          {searchQuery && (
            <Button 
              variant="link" 
              onClick={() => setSearchQuery('')}
              className="mt-2"
            >
              Clear search
            </Button>
          )}
        </div>
      )}
    </div>
  </div>
);
}