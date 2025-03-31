import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { database } from './app/netvend/firebase';
import { ref, get } from 'firebase/database';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;
  
  console.log("Middleware processing path:", pathname);
  
  // Skip middleware for API routes, static files, and admin routes
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname.startsWith('/static') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/netvend') ||
    pathname === '/favicon.ico'
  ) {
    console.log("Skipping middleware for path:", pathname);
    return NextResponse.next();
  }
  
  // Get hostname (e.g. subdomain.netvend.com or custom.domain.com)
  const hostname = request.headers.get('host') || '';
  
  // Check if this is a custom domain
  const tenantIdFromDomain = await getTenantIdFromDomain(hostname);
  
  if (tenantIdFromDomain) {
    // This is a custom domain
    const response = NextResponse.next();
    response.headers.set('x-tenant-id', tenantIdFromDomain);
    response.headers.set('x-tenant-type', 'domain');
    return response;
  }
  
  // Check if this is a subdomain
  const tenantIdFromSubdomain = await getTenantIdFromSubdomain(hostname);
  
  if (tenantIdFromSubdomain) {
    // This is a subdomain
    const response = NextResponse.next();
    response.headers.set('x-tenant-id', tenantIdFromSubdomain);
    response.headers.set('x-tenant-type', 'subdomain');
    return response;
  }
  
  // Check if this is a path-based tenant (e.g. netvend.com/tenant-id)
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length > 0) {
    const potentialTenantId = segments[0];
    console.log("Potential tenant ID from path:", potentialTenantId);
    
    // Check if this is a valid tenant ID
    const isTenantPath = await isTenantId(potentialTenantId);
    console.log("Is valid tenant ID:", isTenantPath);
    
    if (isTenantPath) {
      const response = NextResponse.next();
      response.headers.set('x-tenant-id', potentialTenantId);
      response.headers.set('x-tenant-type', 'path');
      console.log("Setting tenant headers for:", potentialTenantId);
      return response;
    }
  }
  
  // If no tenant is found, continue without setting tenant headers
  console.log("No tenant found for path:", pathname);
  return NextResponse.next();
}

// Helper function to check if a path segment is a valid tenant ID
async function isTenantId(id: string): Promise<boolean> {
  try {
    console.log("Checking if tenant ID exists:", id);
    const tenantRef = ref(database, `tenants/${id}`);
    const snapshot = await get(tenantRef);
    const exists = snapshot.exists();
    console.log("Tenant exists:", exists);
    return exists;
  } catch (error) {
    console.error('Error checking tenant ID:', error);
    return false;
  }
}

// Helper function to get tenant ID from domain
async function getTenantIdFromDomain(domain: string): Promise<string | null> {
  try {
    // Skip localhost and development domains
    if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
      return null;
    }
    
    const tenantsRef = ref(database, 'tenants');
    const snapshot = await get(tenantsRef);
    
    if (snapshot.exists()) {
      let foundTenantId: string | null = null;
      
      snapshot.forEach((childSnapshot) => {
        const tenantId = childSnapshot.key as string;
        const tenantData = childSnapshot.val();
        
        if (
          tenantData.config && 
          tenantData.config.domain === domain &&
          tenantData.config.active !== false
        ) {
          foundTenantId = tenantId;
          return true; // Break the forEach loop
        }
        
        return false;
      });
      
      return foundTenantId;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting tenant ID from domain:', error);
    return null;
  }
}

// Helper function to get tenant ID from subdomain
async function getTenantIdFromSubdomain(hostname: string): Promise<string | null> {
  try {
    // Extract subdomain from hostname
    if (!hostname.includes('.netvend.com') || hostname.startsWith('www.')) {
      return null;
    }
    
    const subdomain = hostname.split('.')[0];
    
    const tenantsRef = ref(database, 'tenants');
    const snapshot = await get(tenantsRef);
    
    if (snapshot.exists()) {
      let foundTenantId: string | null = null;
      
      snapshot.forEach((childSnapshot) => {
        const tenantId = childSnapshot.key as string;
        const tenantData = childSnapshot.val();
        
        if (
          tenantData.config && 
          tenantData.config.subdomain === subdomain &&
          tenantData.config.active !== false
        ) {
          foundTenantId = tenantId;
          return true; // Break the forEach loop
        }
        
        return false;
      });
      
      return foundTenantId;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting tenant ID from subdomain:', error);
    return null;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
