"use client";

import { useState, useEffect } from 'react';

export default function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantData, setTenantData] = useState<any>(null);
  
  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;
    
    // Get tenant ID from localStorage
    const storedTenantId = localStorage.getItem('current_tenant_id');
    setTenantId(storedTenantId);
    
    // Get tenant data from localStorage if available
    const storedTenantData = localStorage.getItem('tenant_data');
    if (storedTenantData) {
      try {
        setTenantData(JSON.parse(storedTenantData));
      } catch (e) {
        console.error('Failed to parse tenant data:', e);
      }
    }
    
    // Add keyboard shortcut (Ctrl+Shift+D) to toggle debug panel
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-0 right-0 bg-black/80 text-white p-4 max-w-md max-h-96 overflow-auto z-50 text-xs font-mono">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div className="space-y-1">
        <p>Tenant ID: {tenantId || 'None'}</p>
        <p>Path: {window.location.pathname}</p>
        <p>Tenant Data: {tenantData ? 'Loaded' : 'None'}</p>
        {tenantData && (
          <pre className="text-xs overflow-auto max-h-32">
            {JSON.stringify(tenantData, null, 2)}
          </pre>
        )}
        <div className="space-x-2 mt-2">
          <button 
            onClick={() => {
              localStorage.removeItem('current_tenant_id');
              localStorage.removeItem('tenant_data');
              setTenantId(null);
              setTenantData(null);
              alert('Tenant data cleared');
            }}
            className="bg-red-500 text-white px-2 py-1 text-xs"
          >
            Clear Tenant Data
          </button>
          <button 
            onClick={() => {
              // Force reload the page
              window.location.reload();
            }}
            className="bg-blue-500 text-white px-2 py-1 text-xs"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
