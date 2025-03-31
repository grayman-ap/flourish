"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { database } from '../firebase';
import { ref, get } from 'firebase/database';
import { Tenant } from '@/app/netvend/types/tenant';
import { Loader2, Users, CreditCard, BarChart3, Settings, Upload, Plus, Ticket } from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalVouchers: 0,
    vouchersUsed: 0,
    recentPayments: 0
  });
  
  // Load dashboard stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        
        // Get tenants
        const tenantsRef = ref(database, 'tenants');
        const tenantsSnapshot = await get(tenantsRef);
        
        let totalTenants = 0;
        let activeTenants = 0;
        let totalVouchers = 0;
        let vouchersUsed = 0;
        let recentPayments = 0;
        
        if (tenantsSnapshot.exists()) {
          const tenants: Record<string, any> = tenantsSnapshot.val();
          
          totalTenants = Object.keys(tenants).length;
          
          // Count active tenants and collect tenant IDs
          const tenantIds: string[] = [];
          
          Object.entries(tenants).forEach(([id, data]: [string, any]) => {
            if (data.config && data.config.active !== false) {
              activeTenants++;
            }
            
            tenantIds.push(id);
          });
          
          // Count vouchers and usage for each tenant
          for (const tenantId of tenantIds) {
            // Count vouchers
            const vouchersRef = ref(database, `/netvend/app/tenants/${tenantId}/vouchers`);
            const vouchersSnapshot = await get(vouchersRef);
            
            if (vouchersSnapshot.exists()) {
              function countVouchers(snapshot: any) {
                let count = 0;
                
                snapshot.forEach((childSnapshot: any) => {
                  if (childSnapshot.val() === true) {
                    count++;
                  } else {
                    count += countVouchers(childSnapshot);
                  }
                });
                
                return count;
              }
              
              totalVouchers += countVouchers(vouchersSnapshot);
            }
            
            // Count voucher usage
            const usageRef = ref(database, `tenants/${tenantId}/voucher_usage`);
            const usageSnapshot = await get(usageRef);
            
            if (usageSnapshot.exists()) {
              const usage = usageSnapshot.val();
              vouchersUsed += Object.keys(usage).length;
            }
            
            // Count recent payments (last 30 days)
            const paymentsRef = ref(database, `/netvend/app/tenants/${tenantId}/payments`);
            const paymentsSnapshot = await get(paymentsRef);
            
            if (paymentsSnapshot.exists()) {
              const payments = paymentsSnapshot.val();
              const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
              
              Object.values(payments).forEach((payment: any) => {
                if (payment.timestamp && payment.timestamp > thirtyDaysAgo) {
                  recentPayments++;
                }
              });
            }
          }
        }
        
        setStats({
          totalTenants,
          activeTenants,
          totalVouchers,
          vouchersUsed,
          recentPayments
        });
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, []);
  
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
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Button onClick={() => router.push('/netvend/admin/tenants')}>
          Manage Tenants
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Tenants</p>
                <p className="text-2xl font-bold">{stats.totalTenants}</p>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {stats.activeTenants} active tenants
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-4">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Vouchers</p>
                <p className="text-2xl font-bold">{stats.totalVouchers}</p>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {stats.vouchersUsed} vouchers used
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-4">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Recent Payments</p>
                <p className="text-2xl font-bold">{stats.recentPayments}</p>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Last 30 days
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg mr-4">
                <Settings className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">System Status</p>
                <p className="text-2xl font-bold">Active</p>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              All systems operational
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center justify-center"
                onClick={() => router.push('/netvend/admin/tenants')}
                >
                  <Users className="h-6 w-6 mb-2" />
                  <span>Manage Tenants</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center justify-center"
                  onClick={() => router.push('/netvend/admin/tenants/new')}
                >
                  <Plus className="h-6 w-6 mb-2" />
                  <span>Create Tenant</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center justify-center"
                  onClick={() => router.push('/netvend/admin/vouchers')}
                >
                  <Ticket className="h-6 w-6 mb-2" />
                  <span>Voucher Management</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center justify-center"
                  onClick={() => router.push('/netvend/admin/payments')}
                >
                  <CreditCard className="h-6 w-6 mb-2" />
                  <span>Payment History</span>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* This would typically be populated with real data */}
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <div className="p-2 bg-blue-100 rounded-full mr-3">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">New tenant created</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <div className="p-2 bg-green-100 rounded-full mr-3">
                    <Upload className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Vouchers uploaded</p>
                    <p className="text-xs text-gray-500">5 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <div className="p-2 bg-purple-100 rounded-full mr-3">
                    <CreditCard className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Payment processed</p>
                    <p className="text-xs text-gray-500">Yesterday</p>
                  </div>
                </div>
                
                <Button 
                  variant="link" 
                  className="w-full justify-center"
                  onClick={() => router.push('/netvend/admin/activity')}
                >
                  View All Activity
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }