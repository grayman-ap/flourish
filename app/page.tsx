"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";

// UI Components
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerHeader, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Icons
import { 
  AlertCircle, 
  Loader, 
  Wifi, 
  WifiOff, 
  Clock, 
  Package, 
  CreditCard, 
  ExternalLink,
  Ticket
} from "lucide-react";

// App-specific imports
import { useNetworkApi } from "./network.store";
import { fetchSubPlans, useSubscriptionPlans, checkVouchersAvailability } from "@/lib/db";
import { getPeriodLabel, parseToNaira } from '@/lib/helper';
import { AppHeader } from './header';
import { SubscriptionCardType, InitializeResponse } from '@/lib/types';
import { motion } from "framer-motion";
import { MobileAppHeader } from "@/components/ui/mobile-header";
import { TermsAndConditionsModal } from "@/components/ui/terms-modal";

// Helper function for formatting data plans
const formatDataplan = (data?: number, capacity?: string): string => 
  `${data}${capacity}`;

// Main Component
export default function Home() {
  return (
    <div className="flex justify-center bg-gradient-to-b from-blue-50 to-white min-h-screen">
       <TermsAndConditionsModal />
      <Toaster position="top-center" richColors />
      <MobileViewLayout />
    </div>
  );
}

// Mobile Layout Component
const MobileViewLayout = () => (
  <div className="fixed flex flex-col justify-center text-center w-full sm:w-4/6 md:w-3/6 lg:w-2/6 rounded-none shadow-lg gap-2 h-full bg-white">
    <MobileAppHeader header='Flourish Starlink Network'/>
    <SubscriptionPlan />
  </div>
);

// Subscription Plan Component
const SubscriptionPlan = () => (
  <Card className="flex items-center border-none shadow-custom rounded-md px-0  h-[100vh] overflow-y-scroll bg-white">
    <SubscriptionPlanTabs />
  </Card>
);

// Subscription Plan Tabs
const SubscriptionPlanTabs = () => {
  const { payload, setNetworkPayload } = useNetworkApi();
  const router = useRouter();

  // Load selected tab from localStorage (if available), default to "hourly"
  const [selectedTab, setSelectedTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedTab") || "hourly";
    }
    return "hourly";
  });

  // Check if user has an active voucher
  const [hasActiveVoucher, setHasActiveVoucher] = useState(false);
  const [activeVoucher, setActiveVoucher] = useState<string | null>(null);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const voucher = localStorage.getItem("active_vc");
      setHasActiveVoucher(!!voucher);
      setActiveVoucher(voucher);
    }
  }, []);

  const { data: tab, isLoading, error } = useQuery({
    queryKey: ["subPlans"],
    queryFn: fetchSubPlans,
    gcTime: 1000 * 60 * 60,
    staleTime: 1000 * 60 * 5,
    retry: false,
    networkMode: "always",
  });

  // Save selectedTab to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedTab", selectedTab);
    }
  }, [selectedTab]);

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Unable to load subscription plans. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Tabs
      defaultValue={selectedTab}
      onValueChange={(value) => {
        setSelectedTab(value);
        setNetworkPayload("category", value);
      }}
      className="w-full px-4"
    >
      {/* Voucher Banner - only shown when an active voucher exists */}
      {hasActiveVoucher && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex">
              <Ticket className="mr-2" size={30} />
              <div>
                <h3 className="font-bold text-lg font-[family-name:var(--font-din-bold)]">You have an active voucher</h3>
                <p className="text-sm text-blue-100 font-[family-name:var(--font-din-bold)]">
                  {activeVoucher ? activeVoucher.substring(0, 4) + '...' : "View your voucher"}
                </p>
              </div>
            </div>
            <Button 
              onClick={() => router.push("/voucher")}
              variant="secondary"
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              <span className="mr-1">View</span>
              <ExternalLink size={16} />
            </Button>
          </div>
        </motion.div>
      )}
      
      <div className="mb-4 mt-2">
        <h2 className="text-lg font-bold text-gray-800 mb-2 font-[family-name:var(--font-din-bold)]">Choose Your Plan</h2>
        <p className="text-sm text-gray-500">Select a subscription period that works for you</p>
      </div>
      
      <TabsList className="flex flex-row justify-around w-full max-w-full overflow-x-auto mb-4 bg-gray-100 p-1 rounded-xl">
        {isLoading ? (
          <div className="flex items-center justify-center w-full py-4">
            <Loader className="animate-spin mr-2" size={16} />
            <span className="text-sm text-gray-500">Loading plans...</span>
          </div>
        ) : (
          (Array.isArray(tab) ? tab : []).map((value) => (
            <TabsTrigger
              key={value}
              value={value}
              className={`w-full px-4 py-2 text-sm font-bold  cursor-pointer capitalize rounded-lg transition-all duration-200 ${
                selectedTab === value 
                  ? "bg-blue-400 text-white shadow-md transform scale-105" 
                  : "hover:bg-gray-200"
              }`}
            >
            <span className={`${
                selectedTab === value 
                  ? "text-white" 
                  : "text-gray-700"
              }`}>{value}</span>
            </TabsTrigger>
          ))
        )}
      </TabsList>
      <TabsContent value={selectedTab} className="flex items-start p-3">
        <SubscriptionCard period={selectedTab} />
      </TabsContent>
    </Tabs>
  );
};
// Subscription Card Component
const SubscriptionCard = ({ period }: { period: string }) => {
  const { payload, setNetworkPayload } = useNetworkApi();
  const [open, setOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<SubscriptionCardType | null>(null);
  const { data: plans, isLoading, error } = useSubscriptionPlans(payload.network_location);
  
  const handleSelectPlan = (id?: string) => {
    const findPlan = plans?.find((item) => item.id === id);
    if (findPlan) {
      setActivePlan(findPlan);
      const [_, tab] = getPeriodLabel(findPlan.duration);
      setNetworkPayload('category', tab);
      setNetworkPayload("plan", {
        price: findPlan.price,
        duration: findPlan.duration,
        data_bundle: findPlan.data_bundle,
        capacity: findPlan.capacity,
      });
    }
  };

  const filteredPlans = useMemo(() => {
    return plans?.filter(({ duration }) => {
      const [, planTab] = getPeriodLabel(duration);
      return planTab === period;
    });
  }, [plans, period]);

  if (isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12">
        <Loader className="animate-spin mb-4 text-blue-600" size={32} />
        <p className="text-gray-600 font-[family-name:var(--font-din-normal)]">Loading available plans...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="w-full">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Unable to load plans. Please check your connection and try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!filteredPlans?.length) {
    return (
      <div className="w-full flex flex-col gap-4 justify-center items-center px-4">
        <WifiOff size={38} className="text-gray-400" />
        <h3 className="text-md font-bold text-gray-700 font-[family-name:var(--font-din-bold)]">No Plans Available</h3>
        <p className="text-gray-500 text-sm text-center font-[family-name:var(--font-din-normal)]">
          There are currently no plans available for this period. Please check back later or try a different subscription period.
        </p>
        <Button 
          variant="outline" 
          className="mt-4 font-[family-name:var(--font-din-normal)]"
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-4">
      {filteredPlans.map(({ id, data_bundle, capacity, duration, price }, idx) => {
        const [label, tab] = getPeriodLabel(duration);
        return (
          <ConfirmPlan
            key={id}
            planId={id}
            handleOpen={setOpen}
            phone_number={payload.phone_number}
            amount={activePlan?.price ?? price}
            duration={tab}
            network_provider={payload.network_provider}
            network_location={payload.network_location}
            capacity={capacity}
            data_bundle={activePlan?.data_bundle ?? data_bundle}
          >
            <button
              className={`w-full h-40 bg-white space-y-2 flex flex-col items-center justify-center rounded-xl border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md cursor-pointer active:scale-[1.05] transition-all duration-200 ease-in-out relative overflow-hidden ${
                idx % 3 === 0 ? 'bg-gradient-to-br from-blue-50 to-white' : 
                idx % 3 === 1 ? 'bg-gradient-to-br from-green-50 to-white' : 
                'bg-gradient-to-br from-purple-50 to-white'
              }`}
              onClick={() => {
                setOpen(true);
                handleSelectPlan(id);
              }}
            >
              <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                <div className={`absolute transform rotate-45 bg-opacity-90 text-white text-xs font-bold py-1 right-[-35px] top-[12px] w-[120px] text-center font-[family-name:var(--font-din-bold)]
                  ${idx % 3 === 0 ? 'bg-blue-500' : 
                    idx % 3 === 1 ? 'bg-green-500' : 
                    'bg-purple-500'}`}>
                  {tab}
                </div>
              </div>
              
              <Package className={`mb-1  ${
                idx % 3 === 0 ? 'text-blue-500' : 
                idx % 3 === 1 ? 'text-green-500' : 
                'text-purple-500'
              }`} size={20} />
              
              <p className="font-bold text-2xl text-gray-800 font-[family-name:var(--font-din-bold)]">
                {data_bundle}
                <span className="text-sm uppercase ml-1 font-[family-name:var(--font-din-normal)]">{capacity}</span>
              </p>
              
              <div className="flex items-center justify-center text-gray-600">
                <Clock size={14} className="mr-1" />
                <p className="font-medium text-sm font-[family-name:var(--font-din-normal)]">
                  {duration} {label}
                </p>
              </div>
              
              <p className="font-bold text-lg mt-1 font-[family-name:var(--font-din-bold)]">
                <span className={`${
                  idx % 3 === 0 ? 'text-blue-600' : 
                  idx % 3 === 1 ? 'text-green-600' : 
                  'text-purple-600'
                }`}>
                  {parseToNaira(price)}
                </span>
              </p>
            </button>
          </ConfirmPlan>
        );
      })}
    </div>
  );
};

// Confirm Plan Component Props
interface ConfirmPlanProps {
  planId?: string;
  amount: number;
  network_provider: string;
  network_location: string;
  phone_number: string;
  duration: string;
  capacity: string;
  data_bundle?: number;
  handleOpen: (open: boolean) => void;
  children: React.ReactNode;
}

// Confirm Plan Component
const ConfirmPlan: React.FC<ConfirmPlanProps> = ({
  planId,
  amount,
  phone_number,
  capacity,
  network_provider,
  network_location,
  duration,
  data_bundle,
  handleOpen,
  children,
}) => {
  const CONFIRM_PLAN_DATA = [
    { key: "network provider", value: network_provider, icon: <Wifi size={18} /> },
    { key: "network location", value: network_location, icon: <Wifi size={18} /> },
    { key: "phone number", value: phone_number, icon: <Package size={18} /> },
    { key: "data bundle", value: formatDataplan(data_bundle, capacity), icon: <Package size={18} /> },
    { key: "amount", value: parseToNaira(amount), icon: <CreditCard size={18} /> },
  ];
  
  const router = useRouter();
  const param = useSearchParams();
  const ref = param.get('reference');
  const { setVoucher } = useNetworkApi();
  const [response, setResponse] = useState<InitializeResponse | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [vouchersAvailable, setVouchersAvailable] = useState(false);
  const [checkingVouchers, setCheckingVouchers] = useState(false);
  const [hasCheckedVouchers, setHasCheckedVouchers] = useState(false);
  
  // Determine callback URL based on environment
  const callback_url = process.env.NODE_ENV === 'development' 
    ? process.env.NEXT_PUBLIC_DEV_URL 
    : process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_PROD_URL 
      : 'https://grayman.com.ng';
  
  // Check voucher availability when the drawer opens
  
  const initialCheckRef = useRef(false);

useEffect(() => {
  // Only check vouchers when all required parameters are available
  if (!network_location || !duration || !capacity || !data_bundle) {
    return;
  }

  // Skip if we're already checking or if we've already checked once (unless parameters changed)
  if (checkingVouchers || (initialCheckRef.current && hasCheckedVouchers)) {
    return;
  }

  const checkAvailability = async () => {
    setCheckingVouchers(true);
    try {
      const available = await checkVouchersAvailability(
        network_location,
        duration,
        capacity,
        data_bundle
      );
      
      setVouchersAvailable(available);
      
      // Only set hasCheckedVouchers to true if it's not already true
      if (!hasCheckedVouchers) {
        setHasCheckedVouchers(true);
        initialCheckRef.current = true;
      }
      
      // Only show toast if vouchers are not available and this isn't the first check
      if (initialCheckRef.current && !available) {
        toast.warning(`No vouchers available for ${data_bundle}${capacity} ${duration} plan`);
      }
    } catch (error) {
      console.error("Error checking voucher availability:", error);
      setVouchersAvailable(false);
      
      // Only show error toast if this isn't the first check
      if (initialCheckRef.current) {
        toast.error("Failed to check voucher availability");
      }
    } finally {
      setCheckingVouchers(false);
    }
  };

  checkAvailability();
  
  // Remove hasCheckedVouchers and checkingVouchers from dependencies
  // to prevent infinite loops
}, [network_location, duration, capacity, data_bundle]);

  const initializePayment = async (): Promise<InitializeResponse> => {
    setIsProcessing(true);
    try {
      // Store ALL parameters needed for voucher generation in localStorage
      const voucherData = {
        duration,
        capacity,
        bundle: data_bundle,
        network_location,
        timestamp: Date.now() // Add timestamp for security
      };
      
      // Store the voucher parameters in localStorage
      localStorage.setItem("voucher_params", JSON.stringify(voucherData));
  
      // Generate a transaction ID to link payment with voucher
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem("current_transaction", transactionId);
      const randomEmail = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 10)}@gmail.com`;
      const response = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: randomEmail,
          amount: amount * 100,
          metadata: {
            transaction_id: transactionId,
            voucher_data: voucherData
          },
          // Simplified callback URL - no parameters needed
          callback_url: `${callback_url}/voucher`,
        }),
      });
    
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize payment');
      }
    
      const data = await response.json();
      if (data.data) {
        // Store the payment reference for verification
        localStorage.setItem("payment_reference", data.data.reference);
        
        toast.success("Payment initialization successful");
        router.push(data.data.authorization_url);
      }
      return data;
    } catch (error: any) {
      toast.error(`Failed to initialize payment: ${error.message}`);
      throw new Error(`Failed to initialize payment: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  

  // Verify transaction
  const verifyTransaction = useCallback(async (): Promise<InitializeResponse | null> => {
    if (!ref) {
      return null;
    }
    try {
      setIsProcessing(true);
      const response = await fetch(`/api/payment/verify?reference=${ref}`);
    
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify payment');
      }
    
      const data = await response.json();
      if (data) {
        setResponse(data);
        toast.success("Payment verified successfully");
      }
      return data;
    } catch (error: any) {
      toast.error(`Failed to verify payment: ${error.message}`);
      throw new Error(`Failed to verify payment: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [ref]);

  // Handle pay button click
  const handlePay = async () => {
    // If we haven't checked for vouchers yet, do it now
    if (!hasCheckedVouchers) {
      setCheckingVouchers(true);
      try {
        const available = await checkVouchersAvailability(
          network_location,
          duration,
          capacity,
          data_bundle
        );
        setVouchersAvailable(available);
        setHasCheckedVouchers(true);
        
        if (!available) {
          toast.warning(`No vouchers available for ${data_bundle}${capacity} ${duration} plan`);
          return;
        }
      } catch (error) {
        console.error("Error checking voucher availability:", error);
        toast.error("Failed to check voucher availability");
        setVouchersAvailable(false);
        return;
      } finally {
        setCheckingVouchers(false);
      }
    }
    
    // Validate required fields
    if (!network_location) {
      toast.error("Please select a network location");
      return;
    }
    
    // Proceed with payment if vouchers are available
    if (vouchersAvailable) {
      await initializePayment();
    } else {
      toast.error("No vouchers available for this plan. Please try another plan.");
    }
  };
  
  // Verify transaction when reference is available
  useEffect(() => {
    const transaction_id = param.get("transaction_id");
    const tx_ref = param.get("tx_ref");
    
    if (ref || transaction_id || tx_ref) {
      verifyTransaction();
    }
  }, [ref, param, verifyTransaction]);

  return (
    <Drawer onOpenChange={handleOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="mx-auto sm:w-4/6 md:w-3/6 lg:w-2/6 text-center rounded-t-xl">
        <DrawerHeader className="border-b pb-4">
          <DialogTitle className="font-bold text-2xl text-gray-800 flex items-center justify-center">
            <span className="mr-2 font-[family-name:var(--font-din-bold)]">Plan Details</span>
          </DialogTitle>
          <p className="text-gray-500 text-sm mt-1">Review your selection before payment</p>
        </DrawerHeader>
        
        <div className="space-y-4 p-6">
          <div className="bg-blue-50 rounded-xl p-4 mb-6 flex flex-col items-center">
            <p className="text-sm text-blue-600 mb-1 font-[family-name:var(--font-din-bold)]">Total Amount</p>
            <p className="text-3xl font-bold text-blue-700  font-[family-name:var(--font-din-bold)]">{parseToNaira(amount)}</p>
            <p className="text-sm text-blue-600 mt-1 font-[family-name:var(--font-din-normal)]">
              {formatDataplan(data_bundle, capacity)} {duration} plan
            </p>
          </div>
          
          <div className="space-y-4 border rounded-xl p-4 bg-gray-50">
            {CONFIRM_PLAN_DATA.map((item, index) => (
              <div key={index} className="flex flex-row justify-between items-center">
                <div className="flex items-center">
                  <span className="mr-2 text-gray-500">{item.icon}</span>
                  <p className="capitalize font-medium text-gray-600  font-[family-name:var(--font-din-bold)]">
                    {item.key}
                  </p>
                </div>
                <p className="capitalize font-bold text-gray-800 font-[family-name:var(--font-din-normal)]">{item.value}</p>
              </div>
            ))}
          </div>
          
          {checkingVouchers && (
            <div className="flex items-center justify-center py-2">
              <Loader className="animate-spin mr-2" size={16} />
              <span className="text-sm text-gray-500">Checking voucher availability...</span>
            </div>
          )}
          
          {hasCheckedVouchers && !vouchersAvailable && !checkingVouchers && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-[family-name:var(--font-din-bold)]">No Vouchers Available</AlertTitle>
              <AlertDescription className="font-[family-name:var(--font-din-normal)]">
                There are currently no vouchers available for this plan. Please try another plan or check back later.
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={handlePay}
            disabled={isProcessing || checkingVouchers || (hasCheckedVouchers && !vouchersAvailable)}
            className={`w-full py-6 rounded-xl font-bold text-lg transition-all duration-200 ${
              isProcessing || checkingVouchers || (hasCheckedVouchers && !vouchersAvailable)
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <Loader className="animate-spin mr-2" size={16} />
                <span className="font-[family-name:var(--font-din-bold)]">Processing...</span>
              </div>
            ) : checkingVouchers ? (
              <span className="font-[family-name:var(--font-din-bold)]">Checking Availability...</span>
            ) : !vouchersAvailable && hasCheckedVouchers ? (
              <span className="font-[family-name:var(--font-din-bold)]">Payment Unavailable</span>
            ) : (
              <span className="text-md font-[family-name:var(--font-din-bold)]">Pay Now</span>
            )}
          </Button>
          
          <p className="text-xs text-gray-500 text-center mt-4 font-[family-name:var(--font-din-normal)]">
            By clicking "Pay Now", you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
