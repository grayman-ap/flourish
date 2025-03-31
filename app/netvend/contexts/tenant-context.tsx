"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tenant } from '../types/tenant';
import { getTenantById } from '../lib/tenant';
import { usePathname } from 'next/navigation';

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  error: Error | null;
  setTenant: (tenant: Tenant | null) => void;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isLoading: true,
  error: null,
  setTenant: () => {},
});

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;
    
    const loadTenant = async () => {
      try {
        console.log("Tenant context loading for path:", pathname);
        
        // Skip tenant loading for certain paths
        if (
          pathname === '/' ||
          pathname?.startsWith('/admin') ||
          pathname?.startsWith('/netvend')
        ) {
          console.log("Skipping tenant loading for path:", pathname);
          if (isMounted) setIsLoading(false);
          return;
        }

        // Get tenant ID from path
        let tenantId: string | null = null;
        
        if (pathname) {
          const segments = pathname.split('/').filter(Boolean);
          if (segments.length > 0) {
            tenantId = segments[0];
            console.log("Extracted tenant ID from path:", tenantId);
          }
        }
        
        if (tenantId) {
          console.log("Loading tenant with ID:", tenantId);
          
          // Store the tenant ID in localStorage for persistence
          if (typeof window !== 'undefined') {
            localStorage.setItem('current_tenant_id', tenantId);
            
            // Also set the tenant ID in the netvend network store
            const { useNetvendNetwork } = await import('../store/network.store');

            useNetvendNetwork.getState().setTenantId(tenantId);
          }
          
          try {
            // Use the direct method to get the tenant
            const { getTenantDirectly } = await import('../lib/tenant-direct');
            const tenantData = await getTenantDirectly(tenantId);
            
            if (tenantData && isMounted) {
              console.log("Tenant loaded successfully:", tenantData.name);
              setTenant(tenantData);
            } else if (isMounted) {
              console.error(`Tenant not found: ${tenantId}`);
              setError(new Error(`Tenant not found: ${tenantId}`));
            }
          } catch (err) {
            console.error("Error loading tenant:", err);
            if (isMounted) setError(err instanceof Error ? err : new Error(String(err)));
          }
        }
      } catch (err: any) {
        console.error('Error in tenant context:', err);
        if (isMounted) setError(err);
      } finally {
        // Always set loading to false when done
        if (isMounted) {
          console.log("Setting isLoading to false");
          setIsLoading(false);
        }
      }

    };    // Start loading the tenant
    loadTenant();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  // Add debugging for render
  console.log("TenantContext rendering with:", { tenant, isLoading, error });

  return (
    <TenantContext.Provider value={{ tenant, isLoading, error, setTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  console.log("useTenant hook called, returning:", context);
  return context;
};
