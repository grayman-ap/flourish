/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { getDatabase, ref, onValue } from "firebase/database";
import axios from 'axios';
import React, { PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerHeader, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@radix-ui/react-dialog";
import { useNetworkApi } from "./network.store";
import { fetchSubPlans, useSubscriptionPlans, checkVouchersAvailability } from "@/lib/db";
import { database } from "@/lib/firebase";
import Link from "next/link";
import { api } from '@/lib/api';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getPeriodLabel, parseToNaira } from '@/lib/helper';
import { AppHeader } from './header';
import { PlanTab, SubscriptionCardType, InitializeResponse } from '@/lib/types';
import { AlertCircle, CheckCircle2, Loader, Wifi, WifiOff, Clock, Package, CreditCard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formatDataplan = (data?: number, capacity?: string) => `${data}${capacity}`;

// Main Component
export default function Home() {
  return (
    <div className="flex justify-center bg-gradient-to-b from-blue-50 to-white min-h-screen">
      <Toaster position="top-center" richColors />
      <MobileViewLayout />
    </div>
  );
}

// Mobile Layout Component
const MobileViewLayout = () => (
  <div className="fixed flex flex-col justify-center text-center w-full sm:w-4/6 md:w-3/6 lg:w-2/6 rounded-none shadow-lg gap-6 h-full bg-white">
    <AppHeader header='Flourish Starlink Network'/>
    <SubscriptionPlan />
  </div>
);

// Subscription Plan Component
const SubscriptionPlan = () => (
  <Card className="flex items-center border-none shadow-custom rounded-md px-0 mx-4 h-[100vh] overflow-y-scroll bg-white">
    <SubscriptionPlanTabs />
  </Card>
);

// Subscription Plan Tabs
const SubscriptionPlanTabs = () => {
  const { payload, setNetworkPayload } = useNetworkApi();

  // Load selected tab from localStorage (if available), default to "hourly"
  const [selectedTab, setSelectedTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedTab") || "hourly";
    }
    return "hourly";
  });

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
      <div className="mb-6 mt-2">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Choose Your Plan</h2>
        <p className="text-sm text-gray-500">Select a subscription period that works for you</p>
      </div>
      
      <TabsList className="flex flex-row justify-around w-full max-w-full overflow-x-auto mb-6 bg-gray-100 p-1 rounded-xl">
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
              className={`w-full px-4 py-2 text-md font-bold cursor-pointer capitalize rounded-lg transition-all duration-200 ${
                selectedTab === value 
                  ? "bg-blue-600 text-white shadow-md transform scale-105" 
                  : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              {value}
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
      setNetworkPayload('category', tab)
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
        <p className="text-gray-600">Loading available plans...</p>
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
      <div className="w-full flex flex-col gap-4 justify-center items-center py-12 px-4">
        <WifiOff size={48} className="text-gray-400 mb-2" />
        <h3 className="text-xl font-bold text-gray-700">No Plans Available</h3>
        <p className="text-gray-500 text-center">
          There are currently no plans available for this period. Please check back later or try a different subscription period.
        </p>
        <Button 
          variant="outline" 
          className="mt-4"
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
              className={`w-full h-44 bg-white space-y-3 flex flex-col items-center justify-center rounded-xl border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md cursor-pointer active:scale-[1.05] transition-all duration-200 ease-in-out relative overflow-hidden ${
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
                <div className={`absolute transform rotate-45 bg-opacity-90 text-white text-xs font-bold py-1 right-[-35px] top-[12px] w-[120px] text-center
                  ${idx % 3 === 0 ? 'bg-blue-500' : 
                    idx % 3 === 1 ? 'bg-green-500' : 
                    'bg-purple-500'}`}>
                  {tab}
                </div>
              </div>
              
              <Package className={`mb-1 ${
                idx % 3 === 0 ? 'text-blue-500' : 
                idx % 3 === 1 ? 'text-green-500' : 
                'text-purple-500'
              }`} size={28} />
              
              <p className="font-bold text-2xl text-gray-800">
                {data_bundle}
                <span className="text-sm uppercase ml-1">{capacity}</span>
              </p>
              
              <div className="flex items-center justify-center text-gray-600">
                <Clock size={14} className="mr-1" />
                <p className="font-medium">
                  {duration} {label}
                </p>
              </div>
              
              <p className="font-bold text-lg mt-1">
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

// Confirm Plan Component
interface ConfirmPlanProps {
  planId?: string;
  amount: number | any;
  network_provider: string;
  network_location: string;
  phone_number: string;
  duration: string,
  capacity: string;
  data_bundle?: number;
  handleOpen: (open: boolean) => void;
}

const ConfirmPlan: React.FC<ConfirmPlanProps & React.PropsWithChildren> = ({
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
  
  const {payload} = useNetworkApi();
  const router = useRouter();
  const param = useSearchParams();
  const txref = param.get('trxref');
  const ref = param.get('reference');
  const {setVoucher} = useNetworkApi();
  const [response, setResponse] = React.useState<InitializeResponse>();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [vouchersAvailable, setVouchersAvailable] = useState<boolean>(false);
  const [checkingVouchers, setCheckingVouchers] = useState<boolean>(false);
  const [hasCheckedVouchers, setHasCheckedVouchers] = useState<boolean>(false);
  const callback_url = process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_DEV_URL : process.env.NEXT_PUBLIC_PROD_URL;
  
  // Check voucher availability when the drawer opens
  useEffect(() => {
    // Only check vouchers when all required parameters are available
    if (!network_location || !duration || !capacity || !data_bundle) {
      return;
    }
    
    const checkAvailability = async () => {
      if (checkingVouchers) return; // Prevent multiple simultaneous checks
      
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
        
        // Only show toast if this is not the initial check and vouchers are not available
        if (hasCheckedVouchers && !available) {
          toast.warning(`No vouchers available for ${data_bundle}${capacity} ${duration} plan`);
        }
      } catch (error) {
        console.error("Error checking voucher availability:", error);
        setVouchersAvailable(false);
        
        // Only show error toast if this is not the initial check
        if (hasCheckedVouchers) {
          toast.error("Failed to check voucher availability");
        }
      } finally {
        setCheckingVouchers(false);
      }
    };
    
    checkAvailability();
  }, [network_location, duration, capacity, data_bundle, hasCheckedVouchers]);

  async function initializePayment(): Promise<InitializeResponse> {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: network_location === 'nana-network' ? "fromnanalodge@gmail.com" : "fromalherilodge@gmail.com",
          amount: amount * 100,
          callback_url: `${callback_url}/voucher?duration=${duration}&capacity=${capacity}&bundle=${data_bundle}`,
        }),
      });
    
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize payment');
      }
    
      const data = await response.json();
      if (data.data) {
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
  }

  async function verifyTransaction(): Promise<InitializeResponse | null> {
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
  }

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
  React.useEffect(() => {
    if (ref) {
      verifyTransaction();
    }
  }, [ref]);

  return (
    <Drawer onOpenChange={handleOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="mx-auto sm:w-4/6 md:w-3/6 lg:w-2/6 text-center rounded-t-xl">
        <DrawerHeader className="border-b pb-4">
          <DialogTitle className="font-bold text-2xl text-gray-800 flex items-center justify-center">
            <span className="mr-2">Plan Details</span>
          </DialogTitle>
          <p className="text-gray-500 text-sm mt-1">Review your selection before payment</p>
        </DrawerHeader>
        
        <div className="space-y-4 p-6">
          <div className="bg-blue-50 rounded-xl p-4 mb-6 flex flex-col items-center">
            <p className="text-sm text-blue-600 mb-1">Total Amount</p>
            <p className="text-3xl font-bold text-blue-700">{parseToNaira(amount)}</p>
            <p className="text-sm text-blue-600 mt-1">
              {formatDataplan(data_bundle, capacity)} for {duration} {duration === "hourly" ? "hour" : duration === "daily" ? "day" : "month"}
            </p>
          </div>
          
          <div className="space-y-4 border rounded-xl p-4 bg-gray-50">
            {CONFIRM_PLAN_DATA.map((item, index) => (
              <div key={index} className="flex flex-row justify-between items-center">
                <div className="flex items-center">
                  <span className="mr-2 text-gray-500">{item.icon}</span>
                  <p className="capitalize font-medium text-gray-600">
                    {item.key}
                  </p>
                </div>
                <p className={`capitalize font-bold text-gray-800`}>{item.value}</p>
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
              <AlertTitle>No Vouchers Available</AlertTitle>
              <AlertDescription>
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
                <span>Processing...</span>
              </div>
            ) : checkingVouchers ? (
              <span>Checking Availability...</span>
            ) : !vouchersAvailable && hasCheckedVouchers ? (
              <span>Payment Unavailable</span>
            ) : (
              <span>Pay Now</span>
            )}
          </Button>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            By clicking "Pay Now", you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export {
  SubscriptionCard,
  ConfirmPlan,
  SubscriptionPlanTabs,
  SubscriptionPlan,
  MobileViewLayout
};
