/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import PaystackPop from '@paystack/inline-js'
import { getDatabase, ref, onValue } from "firebase/database";
import axios from 'axios'
import React, { PropsWithChildren, useCallback, useEffect, useState } from "react";
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
import { addPlans, addVouchers, fetchSubPlans, getRandomVoucherAndDelete, useFetchVouchers } from "@/lib/db";
import { database } from "@/lib/firebase";
import Link from "next/link";
import { api } from '@/lib/api';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

/// Type Definitions
export type PlanTab = "hourly" | "daily" | "weekly" | "monthly" | "yearly";

export interface SubscriptionCardType {
  id?: string,
  data_bundle: number;
  capacity: string;
  duration: number;
  price: number;
}

interface NetworkLocation {
  key: string;
  value: string;
}

// Data Constants
export interface InitializeResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}


// Helper Functions
const getPeriodLabel = (duration: number): [string, PlanTab] => {
  if (duration <= 1) return ["Day", "daily"];
  if (duration <= 5) return ["Days", "daily"];
  if (duration === 24) return ["Hours", "hourly"];
  if (duration === 7) return ["Days", "weekly"];
  return ["Days", "monthly"];
};

const parseToNaira = (value: number | any) =>
  Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(value);

const formatDataplan = (data?: number, capacity?: string) => `${data}${capacity}`;

// Main Component
export default function Home() {
  return (
    <div className="flex justify-center">
      <MobileViewLayout />
    </div>
  );
}

// Mobile Layout Component
const MobileViewLayout = () => (
  <div className="fixed flex flex-col justify-center text-center w-full sm:w-4/6 md:w-3/6 lg:w-2/6 rounded-none shadow-md gap-6 h-full bg-gray-50">
    <AppHeader header='Flourish Starlink Network'/>
    <SubscriptionPlan />
  </div>
);

// Subscription Plan Component
const SubscriptionPlan = () => (
  <Card className="flex items-center border-none shadow-custom rounded-md px-0 mx-4 h-[100vh] overflow-y-scroll">
    <SubscriptionPlanTabs />
  </Card>
);

// Subscription Plan Tabs
const SubscriptionPlanTabs = () => {
  const [selectedTab, setSelectedTab] = useState<PlanTab | string>("hourly");
  const { payload, setNetworkPayload } = useNetworkApi();
  const [tab, setTab] = React.useState<string[]>()
  useEffect(() => {
    const subPlansRef = ref(database, 'duration');

    onValue(subPlansRef, (snapshot) => {
      if (snapshot.exists()) {
        setTab(Object.values(snapshot.val())); // Convert to array
      } else {
        setTab([]);
      }
    });
  }, []);
  return (
    <Tabs defaultValue={selectedTab} onValueChange={(value) => {
      setSelectedTab(value)
      setNetworkPayload('category', value)
    }} className="w-[90%]">
      <TabsList className="flex flex-row justify-around w-full max-w-full space-x-6 overflow-x-scroll">
        {tab?.map((value) => (
          <TabsTrigger key={value} value={value} className="text-md font-[family-name:var(--font-din-bold)] cursor-pointer capitalize">
            {value}
          </TabsTrigger>
        ))}
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
  const [plans, setPlans] = useState<SubscriptionCardType[]>([]);
  const [activePlan, setActivePlan] = React.useState<SubscriptionCardType>()
  const handleSelectPlan = (id?: string) => {
    const findPlan = plans.find((item) => item.id === id);
    if (findPlan) {
      setActivePlan(findPlan);
      setNetworkPayload("plan", {
        price: findPlan.price,
        duration: findPlan.duration,
        data_bundle: findPlan.data_bundle,
        capacity: findPlan.capacity,
      });
    }
  };
  useEffect(() => {
    const subPlansRef = ref(database, `${payload.network_location}/plans`);
  
    // Real-time listener
    onValue(subPlansRef, (snapshot) => {
      if (snapshot.exists()) {
        const plansArray: SubscriptionCardType[] = []; // Collect plans
  
        snapshot.forEach((childSnapshot) => {
          plansArray.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
  
        setPlans(plansArray); // Set state once
      } else {
        setPlans([]);
      }
    });

  }, [payload.network_location]);
  const filteredPlans = plans.filter(({ duration }) => {
    const [, planTab] = getPeriodLabel(duration);
    return planTab === period;
  });
  
  return (
    <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-3 ">
      {filteredPlans.map(({ id, data_bundle, capacity, duration, price }, idx) => {
        const [label, tab] = getPeriodLabel(duration);
        return (
          <ConfirmPlan
            key={idx}
            handleOpen={setOpen}
            phone_number={payload.phone_number}
            amount={activePlan?.price}
            duration={tab}
            network_provider={payload.network_provider}
            network_location={payload.network_location}
            capacity={capacity}
            data_bundle={activePlan?.data_bundle}
          >
            <button
              className="w-full h-40 bg-slate-50 space-y-2 flex flex-col items-center justify-center rounded-sm shadow-custom cursor-pointer active:scale-[1.09] transition-all duration-200 ease-linear"
              onClick={() => {
                setOpen(true)
                handleSelectPlan(id)
              }}
            >
              <p className="font-[family-name:var(--font-din-bold)] text-xl">
                {data_bundle}
                <span className="text-sm uppercase">{capacity}</span>
              </p>
              <p className="font-[family-name:var(--font-din-xbold)]">
                {duration} {label}
              </p>
              <p className="font-[family-name:var(--font-din-xbold)] text-gray-500">
                {parseToNaira(price)}
              </p>
            </button>
          </ConfirmPlan>
        );
      })}
    </div>
  );
};


// App Header Component
export const AppHeader = ({header}: {header?: string}) => {
  const { payload, setNetworkPayload } = useNetworkApi();
  const [locations, setLocations] = useState<NetworkLocation[]>([])
  useEffect(() => {
    const subPlansRef = ref(database, 'network_location');

    onValue(subPlansRef, (snapshot) => {
      if (snapshot.exists()) {
        setLocations(Object.values(snapshot.val()));
      } else {
        setLocations([]);
      }
    });
     }, []);
 
  return (
    <Card className="flex w-full border shadow-none rounded-sm px-2 bg-white">
      {header && <CardHeader className="flex flex-row justify-between gap-4 p-0 items-center">
        <h3 className="text-center text-lg font-bold py-4 w-full">{header}</h3>
      </CardHeader>}

      <CardContent className="px-2">
        <Select value={payload.network_location} onValueChange={(value) => {
          setNetworkPayload("network_location", value)
          console.log(value)
        }}>
          <SelectTrigger className="cursor-pointer bg-white">
            <SelectValue placeholder="Select network location" />
          </SelectTrigger>
          <SelectContent className="">
            <SelectGroup>
              {locations.map(({ key, value }) => (
                <SelectItem key={key} value={key}>
                  {value}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
};

// Confirm Plan Component
interface ConfirmPlanProps {
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
    { key: "network provider", value: network_provider },
    { key: "network location", value: network_location },
    { key: "phone number", value: phone_number },
    { key: "data bundle", value: formatDataplan(data_bundle, capacity) },
    { key: "amount", value: parseToNaira(amount) },
  ];
  const router = useRouter()
  const param = useSearchParams()
  const txref = param.get('trxref')
  const ref = param.get('reference')
  const base_url: string | undefined = process.env.NEXT_PUBLIC_PAYSTACK_URL
  const {setVoucher} = useNetworkApi()
  const [response, setResponse] = React.useState<InitializeResponse>()
  const {exists} = useFetchVouchers()
  async function initializePayment(): Promise<InitializeResponse> {
    try {
      const response = await api.post<InitializeResponse>(`https://api.paystack.co/transaction/initialize`, {
        email: network_location === 'nana-network' ? "fromnanalodge@gmail.com" : "fromalherilodge@gmail.com", // Ensure this is actually an email if required by the API
        amount: amount * 100,
        callback_url: `https://flourish-network.vercel.app/voucher?duration=${duration}&capacity=${capacity}&bundle=${data_bundle}`,
      });
      if(response.data){
          router.push(response.data.data.authorization_url)
      }
      return response.data;
    } catch (error: any) {
      // Properly handle the error message
      throw new Error(`Failed to initialize payment: ${error.response?.data?.message || error.message}`);
    }
  }

  async function verifyTransaction(): Promise<InitializeResponse | null> {
    if (!ref) {
      console.error("Transaction reference is missing.");
      return null; // Return null if ref is undefined
    }
    try {
      const response = await api.get<InitializeResponse>(`${base_url}/transaction/verify/${ref}`);
      if(response.data){
        setResponse(response.data)
      }
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to verify payment: ${error.response?.data?.message || error.message}`);
    }
  }

  const handlePay = () => {
    if(exists){
    initializePayment()
    }else{
      alert("No vouchers at the moment. check back later")
    }
  }
  React.useEffect(() => {
    if(ref){
      verifyTransaction()
    }
  }, [param, ref])

  // React.useEffect(() => {
  //   if (response?.status) {
  //     const fetchVoucher = async () => {
  //       const voucher = await getRandomVoucherAndDelete(duration, '', 0);
  //       if (voucher) {
  //         router.push(`/voucher?vc=${voucher}`);
  //       }
  //     };
  
  //     fetchVoucher();
  //   }
  // }, [duration, response?.status, router]);

  return (
    <Drawer onOpenChange={handleOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="mx-auto sm:w-4/6 md:w-3/6 lg:w-2/6 text-center">
        <DrawerHeader>
          <DialogTitle className="font-[family-name:var(--font-din-bold)] text-2xl">
            {parseToNaira(amount)}
          </DialogTitle>
        </DrawerHeader>
        <div className="space-y-4 p-5">
          {CONFIRM_PLAN_DATA.map((item, index) => (
            <div key={index} className="flex flex-row justify-between items-center">
              <p className="capitalize font-[family-name:var(--font-din-xbold)] text-gray-500">
                {item.key}
              </p>
              <p className="capitalize font-[family-name:var(--font-din-xbold)]">{item.value}</p>
            </div>
          ))}
          <button 
          onClick={handlePay}
          className="my-4 bg-green-700/70 w-5/6 rounded-full py-2 active:scale-[1.03] cursor-pointer duration-100 transition-all ease-linear">
            <span className="capitalize font-[family-name:var(--font-din-bold)] text-white">pay</span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};