"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useTenant } from "../netvend/contexts/tenant-context";
import { useRouter } from "next/navigation";

export default function TenantHomePage() {
  const { tenant, isLoading, error } = useTenant();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState("daily");
  const [redirectTimer, setRedirectTimer] = useState<NodeJS.Timeout | null>(null);
  
  console.log("Tenant page rendering with:", { tenant, isLoading, error });
  
  // Only redirect after a delay and if we're sure the tenant isn't loading
  useEffect(() => {
    // Clear any existing timer
    if (redirectTimer) {
      clearTimeout(redirectTimer);
    }
    
    // If we're still loading, don't do anything
    if (isLoading) {
      return;
    }
    
    // If tenant is null after loading is complete, redirect after a delay
    if (!tenant) {
      console.log("Tenant not found, will redirect after delay");
      const timer = setTimeout(() => {
        console.log("Redirecting to home now");
        router.push('/');
      }, 5000); // 5 second delay
      
      setRedirectTimer(timer);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isLoading, tenant, router, redirectTimer]);
  
  if (isLoading) {
    console.log("Tenant page showing loading state");
    return (
      <div className="container mx-auto p-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2 animate-pulse">
            Loading Tenant...
          </h1>
          <p className="text-gray-600">
            Please wait while we load the tenant information
          </p>
        </div>
        
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded-md w-3/4 mx-auto"></div>
          <div className="h-64 bg-gray-100 rounded-lg w-full mx-auto"></div>
        </div>
      </div>
    );
  }
  
  if (error || !tenant) {
    console.log("Tenant page showing error state:", error);
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600">Tenant Not Found</h1>
        <p className="mt-2">
          {error ? error.message : "The requested tenant does not exist or is not active."}
        </p>
        <p className="mt-4 text-gray-500">
          Redirecting to home page in a few seconds...
        </p>
        <Button 
          onClick={() => router.push('/')}
          className="mt-4"
        >
          Go to Home Now
        </Button>
      </div>
    );
  }
  
  console.log("Tenant page rendering with tenant:", tenant.name);
  
  // Plans would ideally come from the tenant configuration
  // This is just a placeholder
  const plans = {
    daily: [
      { id: "daily-1", name: "1 Day Pass", price: 500, duration: "1d", capacity: "1", bundle: "standard" },
      { id: "daily-2", name: "1 Day Premium", price: 800, duration: "1d", capacity: "1", bundle: "premium" }
    ],
    weekly: [
      { id: "weekly-1", name: "7 Day Pass", price: 2500, duration: "7d", capacity: "1", bundle: "standard" },
      { id: "weekly-2", name: "7 Day Premium", price: 3500, duration: "7d", capacity: "1", bundle: "premium" }
    ],
    monthly: [
      { id: "monthly-1", name: "30 Day Pass", price: 8000, duration: "30d", capacity: "1", bundle: "standard" },
      { id: "monthly-2", name: "30 Day Premium", price: 12000, duration: "30d", capacity: "1", bundle: "premium" }
    ]
  };

  const handlePlanSelect = (plan: any) => {
    // Store plan details in localStorage for payment processing
    localStorage.setItem("voucher_params", JSON.stringify({
      duration: plan.duration,
      capacity: plan.capacity,
      bundle: plan.bundle,
      network_location: localStorage.getItem(`${tenant.id}_network_location`) || "main"
    }));
    
    // Navigate to payment page with plan details
    router.push(`/${tenant.id}/payment?plan=${plan.id}&amount=${plan.price}`);
  };

  return (
    <div className="container mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2" style={{ color: tenant.primaryColor }}>
            {tenant.name} Network Access
          </h1>
          <p className="text-gray-600">
            Choose a plan that suits your needs
          </p>
        </div>

        <Card className="mx-auto max-w-md shadow-lg border-0">
          <CardHeader className="pb-2">
            <CardTitle>Select Your Plan</CardTitle>
            <CardDescription>
              Get online with our flexible plans
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs 
              defaultValue="daily" 
              value={selectedTab}
              onValueChange={setSelectedTab}
              className="w-full"
            >
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
              
              {Object.entries(plans).map(([period, periodPlans]) => (
                <TabsContent key={period} value={period} className="space-y-4">
                  {periodPlans.map((plan) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card 
                        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handlePlanSelect(plan)}
                      >
                        <div 
                          className="h-2"
                          style={{ backgroundColor: plan.bundle === "premium" ? tenant.secondaryColor : tenant.primaryColor }}
                        />
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-bold">{plan.name}</h3>
                              <p className="text-sm text-gray-500">
                                {plan.bundle === "premium" ? "High-speed access" : "Standard access"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">
                                ₦{plan.price.toLocaleString()}
                              </p>
                              <Button 
                                size="sm"
                                style={{ 
                                  backgroundColor: plan.bundle === "premium" ? tenant.secondaryColor : tenant.primaryColor 
                                }}
                                className="mt-2"
                              >
                                Select
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
