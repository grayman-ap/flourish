"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ref, get, set, push, remove } from 'firebase/database';
import { Tenant, NetworkLocation } from '@/app/netvend/types/tenant';
import { getTenantById } from '@/app/netvend/lib/tenant';
import { getTenantVoucherCount, getTenantVoucherUsageStats } from '@/app/netvend/lib/db';
import { Loader2, Plus, Trash, Upload, Download } from 'lucide-react';
import { database } from '@/lib/firebase';

export default function TenantManagementPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [locations, setLocations] = useState<NetworkLocation[]>([]);
  const [voucherCounts, setVoucherCounts] = useState<Record<string, number>>({});
  const [usageStats, setUsageStats] = useState<any>(null);
  
  // Load tenant data
  useEffect(() => {
    const loadTenant = async () => {
      try {
        setLoading(true);
        
        // Load tenant
        const tenantData = await getTenantById(tenantId);
        
        if (!tenantData) {
          router.push('/admin');
          return;
        }
        
        setTenant(tenantData);
        
        // Load locations
        const locationsRef = ref(database, `tenants/${tenantId}/locations`);
        const locationsSnapshot = await get(locationsRef);
        
        if (locationsSnapshot.exists()) {
          const locationsData: NetworkLocation[] = [];
          locationsSnapshot.forEach((childSnapshot) => {
            const location = childSnapshot.val();
            locationsData.push({
              key: location.key,
              value: location.value
            });
          });
          
          setLocations(locationsData);
        }
        
        // Load voucher counts
        const durations = ['1d', '7d', '30d'];
        const bundles = ['standard', 'premium'];
        
        const counts: Record<string, number> = {};
        
        for (const duration of durations) {
          for (const bundle of bundles) {
            const count = await getTenantVoucherCount(tenantId, duration, '1', bundle);
            counts[`${duration}-${bundle}`] = count;
          }
        }
        
        setVoucherCounts(counts);
        
        // Load usage stats
        const stats = await getTenantVoucherUsageStats(tenantId);
        setUsageStats(stats);
      } catch (error) {
        console.error('Error loading tenant data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadTenant();
  }, [tenantId, router]);
  
  // Add a new location
  const addLocation = async (key: string, value: string) => {
    try {
      const locationsRef = ref(database, `tenants/${tenantId}/locations`);
      const newLocationRef = push(locationsRef);
      
      await set(newLocationRef, {
        key,
        value
      });
      
      // Refresh locations
      setLocations([...locations, { key, value }]);
    } catch (error) {
      console.error('Error adding location:', error);
    }
  };
  
  // Delete a location
  const deleteLocation = async (locationKey: string) => {
    try {
      // Find the location in the database
      const locationsRef = ref(database, `tenants/${tenantId}/locations`);
      const locationsSnapshot = await get(locationsRef);
      
      if (locationsSnapshot.exists()) {
        locationsSnapshot.forEach((childSnapshot) => {
          const location = childSnapshot.val();
          
          if (location.key === locationKey) {
            // Delete the location
            const locationRef = ref(database, `tenants/${tenantId}/locations/${childSnapshot.key}`);
            remove(locationRef);
          }
        });
      }
      
      // Update the local state
      setLocations(locations.filter(location => location.key !== locationKey));
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };
  
  // Upload vouchers
  const uploadVouchers = async (
    vouchers: string[],
    duration: string,
    bundle: string,
    location: string
  ) => {
    try {
      // Construct the path to vouchers based on parameters
      const vouchersPath = `tenants/${tenantId}/vouchers/${duration}/1/${bundle}/${location}`;
      
      // Add each voucher
      const updates: Record<string, boolean> = {};
      
      vouchers.forEach((voucher) => {
        updates[`${vouchersPath}/${voucher}`] = true;
      });
      
      // Update the database
      const vouchersRef = ref(database);
      await set(vouchersRef, updates);
      
      // Log voucher addition
      const additionRef = ref(database, `tenants/${tenantId}/voucher_additions`);
      const newAdditionRef = push(additionRef);
      await set(newAdditionRef, {
        count: vouchers.length,
        duration,
        capacity: '1',
        bundle,
        networkLocation: location,
        timestamp: Date.now()
      });
      
      // Refresh voucher counts
      const count = await getTenantVoucherCount(tenantId, duration, '1', bundle, location);
      setVoucherCounts({
        ...voucherCounts,
        [`${duration}-${bundle}`]: count
      });
    } catch (error) {
      console.error('Error uploading vouchers:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (!tenant) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-red-600">Tenant Not Found</h1>
        <p className="mt-2">The requested tenant does not exist or is not active.</p>
        <Button 
          onClick={() => router.push('/admin')}
          className="mt-4"
        >
          Back to Admin
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <p className="text-gray-500">ID: {tenantId}</p>
        </div>
        <Button 
          onClick={() => router.push('/netvend/admin')}
          variant="outline"
        >
          Back to Tenants
        </Button>
      </div>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{tenant.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">
                    {tenant.active ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-red-600">Inactive</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Contact Email</p>
                  <p className="font-medium">{tenant.contactEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created At</p>
                  <p className="font-medium">
                    {tenant.createdAt 
                      ? new Date(tenant.createdAt).toLocaleDateString() 
                      : 'Unknown'}
                  </p>
                </div>
                {tenant.subdomain && (
                  <div>
                    <p className="text-sm text-gray-500">Subdomain</p>
                    <p className="font-medium">{tenant.subdomain}.netvend.com</p>
                  </div>
                )}
                {tenant.domain && (
                  <div>
                    <p className="text-sm text-gray-500">Custom Domain</p>
                    <p className="font-medium">{tenant.domain}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Voucher Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Daily Vouchers</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-500">Standard</p>
                        <p className="text-xl font-bold">{voucherCounts['1d-standard'] || 0}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-500">Premium</p>
                        <p className="text-xl font-bold">{voucherCounts['1d-premium'] || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Weekly Vouchers</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-500">Standard</p>
                        <p className="text-xl font-bold">{voucherCounts['7d-standard'] || 0}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-500">Premium</p>
                        <p className="text-xl font-bold">{voucherCounts['7d-premium'] || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Monthly Vouchers</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-500">Standard</p>
                        <p className="text-xl font-bold">{voucherCounts['30d-standard'] || 0}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-500">Premium</p>
                        <p className="text-xl font-bold">{voucherCounts['30d-premium'] || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                {usageStats ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-500">Total Vouchers Used</p>
                      <p className="text-xl font-bold">{usageStats.total || 0}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">By Duration</h3>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm text-gray-500">Daily</p>
                          <p className="text-lg font-bold">{usageStats.byDuration['1d'] || 0}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm text-gray-500">Weekly</p>
                          <p className="text-lg font-bold">{usageStats.byDuration['7d'] || 0}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm text-gray-500">Monthly</p>
                          <p className="text-lg font-bold">{usageStats.byDuration['30d'] || 0}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">By Bundle</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm text-gray-500">Standard</p>
                          <p className="text-lg font-bold">{usageStats.byBundle['standard'] || 0}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm text-gray-500">Premium</p>
                          <p className="text-lg font-bold">{usageStats.byBundle['premium'] || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No usage data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Network Locations</CardTitle>
            </CardHeader>
            <CardContent>
              {locations.length > 0 ? (
                <div className="space-y-2">
                  {locations.map((location) => (
                    <div 
                      key={location.key}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div>
                        <p className="font-medium">{location.value}</p>
                        <p className="text-sm text-gray-500">Key: {location.key}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteLocation(location.key)}
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No locations defined</p>
              )}
              
              <div className="mt-4">
                <Button 
                  className="w-full"
                  onClick={() => {
                    // This would typically open a modal or form
                    // For simplicity, we'll use prompt
                    const key = prompt('Enter location key (e.g., "main"):');
                    const value = prompt('Enter location name (e.g., "Main Office"):');
                    
                    if (key && value) {
                      addLocation(key, value);
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
                </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Vouchers Tab */}
        <TabsContent value="vouchers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voucher Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3">Upload Vouchers</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500 mb-4">
                      Upload vouchers in bulk by selecting a file or pasting a list of vouchers.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="text-sm font-medium block mb-1">Duration</label>
                        <select 
                          className="w-full p-2 border rounded-md"
                          id="duration-select"
                        >
                          <option value="1d">Daily (1 Day)</option>
                          <option value="7d">Weekly (7 Days)</option>
                          <option value="30d">Monthly (30 Days)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium block mb-1">Bundle</label>
                        <select 
                          className="w-full p-2 border rounded-md"
                          id="bundle-select"
                        >
                          <option value="standard">Standard</option>
                          <option value="premium">Premium</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium block mb-1">Location</label>
                        <select 
                          className="w-full p-2 border rounded-md"
                          id="location-select"
                        >
                          {locations.map((location) => (
                            <option key={location.key} value={location.key}>
                              {location.value}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="text-sm font-medium block mb-1">
                        Vouchers (one per line)
                      </label>
                      <textarea 
                        className="w-full p-2 border rounded-md h-32 font-mono text-sm"
                        placeholder="Enter vouchers, one per line"
                        id="vouchers-textarea"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <input 
                          type="file" 
                          id="voucher-file" 
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const content = event.target?.result as string;
                                const textarea = document.getElementById('vouchers-textarea') as HTMLTextAreaElement;
                                if (textarea) {
                                  textarea.value = content;
                                }
                              };
                              reader.readAsText(file);
                            }
                          }}
                        />
                        <Button 
                          variant="outline"
                          onClick={() => {
                            document.getElementById('voucher-file')?.click();
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload File
                        </Button>
                      </div>
                      
                      <Button 
                        onClick={() => {
                          const duration = (document.getElementById('duration-select') as HTMLSelectElement).value;
                          const bundle = (document.getElementById('bundle-select') as HTMLSelectElement).value;
                          const location = (document.getElementById('location-select') as HTMLSelectElement).value;
                          const textarea = document.getElementById('vouchers-textarea') as HTMLTextAreaElement;
                          
                          if (textarea.value.trim()) {
                            const vouchers = textarea.value
                              .split('\n')
                              .map(v => v.trim())
                              .filter(v => v);
                            
                            if (vouchers.length > 0) {
                              uploadVouchers(vouchers, duration, bundle, location);
                              textarea.value = '';
                              alert(`Uploaded ${vouchers.length} vouchers successfully!`);
                            }
                          }
                        }}
                      >
                        Upload Vouchers
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-3">Download Voucher Templates</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500 mb-4">
                      Download template files to help you format vouchers correctly.
                    </p>
                    
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-1">Tenant Name</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-md"
                        defaultValue={tenant.name}
                        id="tenant-name"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium block mb-1">Contact Email</label>
                      <input 
                        type="email" 
                        className="w-full p-2 border rounded-md"
                        defaultValue={tenant.contactEmail}
                        id="tenant-email"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-3">Branding</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-1">Primary Color</label>
                      <div className="flex items-center">
                        <input 
                          type="color" 
                          className="w-10 h-10 border-0"
                          defaultValue={tenant.primaryColor}
                          id="primary-color"
                        />
                        <input 
                          type="text" 
                          className="w-full p-2 border rounded-md ml-2"
                          defaultValue={tenant.primaryColor}
                          id="primary-color-text"
                          onChange={(e) => {
                            const colorInput = document.getElementById('primary-color') as HTMLInputElement;
                            if (colorInput) {
                              colorInput.value = e.target.value;
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium block mb-1">Secondary Color</label>
                      <div className="flex items-center">
                        <input 
                          type="color" 
                          className="w-10 h-10 border-0"
                          defaultValue={tenant.secondaryColor || tenant.primaryColor}
                          id="secondary-color"
                        />
                        <input 
                          type="text" 
                          className="w-full p-2 border rounded-md ml-2"
                          defaultValue={tenant.secondaryColor || tenant.primaryColor}
                          id="secondary-color-text"
                          onChange={(e) => {
                            const colorInput = document.getElementById('secondary-color') as HTMLInputElement;
                            if (colorInput) {
                              colorInput.value = e.target.value;
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-3">Domain Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-1">Subdomain</label>
                      <div className="flex items-center">
                        <input 
                          type="text" 
                          className="w-full p-2 border rounded-md"
                          defaultValue={tenant.subdomain || ''}
                          id="tenant-subdomain"
                          placeholder="e.g., mycompany"
                        />
                        <span className="ml-2 text-gray-500">.netvend.com</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium block mb-1">Custom Domain</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-md"
                        defaultValue={tenant.domain || ''}
                        id="tenant-domain"
                        placeholder="e.g., wifi.mycompany.com"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      if (confirm('Are you sure you want to deactivate this tenant? This will prevent users from accessing the tenant.')) {
                        // Deactivate tenant
                        const tenantRef = ref(database, `tenants/${tenantId}/config/active`);
                        set(tenantRef, false);
                        
                        // Update local state
                        setTenant({
                          ...tenant,
                          active: false
                        });
                      }
                    }}
                  >
                    {tenant.active ? 'Deactivate Tenant' : 'Tenant is Deactivated'}
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      // Get values from form
                      const name = (document.getElementById('tenant-name') as HTMLInputElement).value;
                      const email = (document.getElementById('tenant-email') as HTMLInputElement).value;
                      const primaryColor = (document.getElementById('primary-color-text') as HTMLInputElement).value;
                      const secondaryColor = (document.getElementById('secondary-color-text') as HTMLInputElement).value;
                      const subdomain = (document.getElementById('tenant-subdomain') as HTMLInputElement).value;
                      const domain = (document.getElementById('tenant-domain') as HTMLInputElement).value;
                      
                      // Update tenant in database
                      const tenantRef = ref(database, `tenants/${tenantId}/config`);
                      set(tenantRef, {
                        name,
                        contactEmail: email,
                        primaryColor,
                        secondaryColor,
                        subdomain,
                        domain,
                        active: tenant.active
                      });
                      
                      // Update local state
                      setTenant({
                        ...tenant,
                        name,
                        contactEmail: email,
                        primaryColor,
                        secondaryColor,
                        subdomain,
                        domain
                      });
                      
                      alert('Tenant settings updated successfully!');
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
