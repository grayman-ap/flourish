"use client"
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '../netvend/contexts/tenant-context';
import { TermsAndConditionsModal } from '@/components/ui/terms-modal';
import { MobileAppHeader } from '../netvend/components/ui/mobile-header';

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string };
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Suspense fallback={<div className="h-16 bg-slate-100 animate-pulse" />}>
        <TenantHeader tenant={params.tenant} />
      </Suspense>
      
      <main className="flex-grow">
        {children}
      </main>
      
      <TermsAndConditionsModal />
    </div>
  );
}

// Client component for tenant-specific header
function TenantHeader({ tenant }: { tenant: string }) {
  "use client";
  
  const { tenant: tenantData, isLoading } = useTenant();
  const router = useRouter()
  if (isLoading) {
    return <div className="h-16 bg-slate-100 animate-pulse" />;
  }
  
  if (!tenant) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-red-600">Tenant Not Found</h1>
        <p className="mt-2">The requested tenant does not exist or is not active.</p>
        <Button 
          onClick={() => router.push('/netvend/admin')}
          className="mt-4"
        >
          Back to Admin
        </Button>
      </div>
    );
  }
  
  return (
    <MobileAppHeader header={tenantData?.name || 'Network Accesss'} />
  );
}
