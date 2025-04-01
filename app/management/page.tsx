"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React, { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useNetworkApi } from "../network.store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addPlans, addVouchers, deleteVoucher, fetchAllVouchers } from "@/lib/db";
import { LogOutIcon, Trash } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import { AuthProvider } from "../AuthProvider";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import { ref, onValue, set } from "firebase/database";
import { getPeriodLabel, parseToNaira } from "@/lib/helper";
import { AppHeader } from "../header";
import { PlanTab, VouchersType, SubscriptionCardType } from "@/lib/types";

const PLAN_TABS: PlanTab[] = ["hourly", "daily", "weekly", "monthly", "yearly"];

const Menu = [
  { id: 2, label: "plans" },
  { id: 1, label: "vouchers" },
];

export default function Management() {
  const [activeTab, setActiveTab] = React.useState<string>("vouchers");

  const handleSetTab = (tab: string) => {
    setActiveTab(tab);
  };

  const logoutUser = async () => {
    await signOut(auth);
    
    if (typeof window !== "undefined") {
      localStorage.removeItem("nu_ser"); 
      window.location.replace("/auth/login");
    }
  };
  

  return (
    <AuthProvider>
      <div className="bg-black/10 p-4 h-[100vh] overflow-y-auto">
        <h2 className="text-center py-4 text-lg font-[family-name:var(--font-din-bold)]">
          Flourish Network Management
        </h2>
        <div className="flex flex-col md:flex-row gap-5">
          <div className="relative flex flex-row md:flex-col gap-4 w-full md:w-1/5 md:h-[50vh]">
            {Menu.map((item) => (
              <Card
                key={item.id}
                className={`${activeTab === item.label ? 'bg-black text-white' : 'bg-white'} rounded-md w-full h-fit p-3 md:h-[100px] flex justify-center items-center shadow-none hover:scale-[1.02] hover:drop-shadow-sm transition-all ease-linear duration-75 cursor-pointer active:scale-[1.05]`}
                onClick={() => handleSetTab(item.label)}
              >
                <CardContent className="capitalize text-center flex justify-center items-center text-lg font-[family-name:var(--font-din-bold)]">
                  {item.label}
                </CardContent>
              </Card>
            ))}
          </div>
          <View tab={activeTab} />
        </div>
        <div className="w-full flex justify-center">
        <button
          className="w-4/6 md:w-1/6 flex flex-row gap-1 my-4 py-2 rounded-sm items-center justify-center bg-black text-white bottom-0 shadow-none hover:scale-[1.02] hover:drop-shadow-sm transition-all ease-linear duration-150 cursor-pointer active:scale-[1.04] text-md font-[family-name:var(--font-din-semi)]"
          onClick={logoutUser}
        >
          <LogOutIcon size={16}/>
          <span>Logout</span>
        </button>
      </div>
      </div>
    </AuthProvider>
  );
}

function View({ tab }: { tab: string }) {
  return (
    <Card className="w-full rounded-sm shadow-none border border-blue-50 drop-shadow-xs flex-grow relative">
      <CardHeader>
        <CardTitle>{tab === "vouchers" ? "Vouchers" : "Plans"}</CardTitle>
      </CardHeader>
      <CardContent>{tab === "vouchers" ? <Voucher /> : <Plan />}</CardContent>
    </Card>
  );
}

function extractVouchers(vouchers: string): string[] {
  return vouchers.split(",").map((v) => v.trim().replace(/\n/g, ""));
}

function Voucher() {
  const { payload, voucherPayload, setVoucherPayload } = useNetworkApi();
  const [vouchers, setVouchers] = useState<VouchersType[]>([]);
  const [allVouchers, setAllVouchers] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("daily");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  const handleSet = React.useCallback(() => {
    if (!voucherPayload?.vouchers) return;

    const cleanedVouchers = extractVouchers(voucherPayload.vouchers);
    addVouchers(
      voucherPayload.duration,
      voucherPayload.capacity,
      voucherPayload.data_bundle,
      cleanedVouchers,
      payload.network_location
    );
  }, [voucherPayload, payload]);

  useEffect(() => {
    const subPlansRef = ref(database, `${payload.network_location}/vouchers`);
    // Real-time listener
    onValue(subPlansRef, (snapshot) => {
      if (snapshot.exists()) {
        const plansArray: VouchersType[] = []; // Collect plans
        snapshot.forEach((childSnapshot) => {
          plansArray.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
  
        setVouchers(plansArray); // Set state once
      } else {
        setVouchers([]);
      }
    });

  }, [payload.network_location]);
  
  // Reset vouchers when location changes
  useEffect(() => {
    // Clear the current vouchers when location changes
    setAllVouchers({});
    
    // If we have a dialog open with vouchers displayed, reload them for the new location
    if (Object.keys(allVouchers).length > 0) {
      loadVouchersForCategory(selectedCategory);
    }
  }, [payload.network_location]);
  
  // Load vouchers for the selected category when dialog opens
  const loadVouchersForCategory = async (category: string) => {
    if (!payload.network_location) {
      console.error("No location selected");
      return;
    }
    
    setSelectedCategory(category);
    setIsLoading(true);
    setAllVouchers({}); // Clear previous vouchers
    setSearchTerm(""); // Reset search when changing categories
    
    try {
      console.log(`Loading vouchers for ${payload.network_location}/${category}`);
      const result = await fetchAllVouchers(payload.network_location, category);
      setAllVouchers(result);
    } catch (error) {
      console.error("Error loading vouchers:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a specific voucher
  const handleDeleteVoucher = async (capacity: string, bundle: string, voucherId: string) => {
    try {
      await deleteVoucher(
        payload.network_location,
        selectedCategory,
        capacity,
        bundle,
        voucherId
      );
      // Update the local state to reflect the deletion
      const updatedVouchers = { ...allVouchers };
      if (updatedVouchers[capacity] && 
          updatedVouchers[capacity][bundle] && 
          updatedVouchers[capacity][bundle][voucherId]) {
        delete updatedVouchers[capacity][bundle][voucherId];
        setAllVouchers(updatedVouchers);
      }
    } catch (error) {
      console.error("Error deleting voucher:", error);
    }
  };
  
  // Filter vouchers based on search term
  const getFilteredVouchers = (capacity: string, bundle: string, voucherData: Record<string, string>) => {
    if (!searchTerm) return voucherData;
    
    const filteredEntries = Object.entries(voucherData).filter(([_, voucherCode]) => 
      voucherCode.includes(searchTerm)
    );
    
    return Object.fromEntries(filteredEntries);
  };

  return (
    <div className="space-y-4">
      <Label>Select Location</Label>
      <AppHeader />
      <div className="flex flex-row items-center w-full md:w-1/6 flex-wrap md:flex-nowrap gap-4 mb-4">
        <Select
          value={voucherPayload.duration}
          onValueChange={(value) => setVoucherPayload("duration", value)}
        >
          <SelectTrigger className="capitalize">
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent className="py-2">
            <SelectGroup>
              {PLAN_TABS.map((item, indx) => (
                <SelectItem key={indx} value={item} className="capitalize">
                  {item}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value={voucherPayload.capacity}
          onValueChange={(value) => setVoucherPayload("capacity", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select capacity" />
          </SelectTrigger>
          <SelectContent className="py-2">
            <SelectGroup>
              {["GB", "MB"].map((item, indx) => (
                <SelectItem key={indx} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="w-full md:w-2/6 h-full">
        <div className="mb-4 space-y-2">
          <Label>Data Bundle</Label>
          <Input
            type="number"
            placeholder="Enter Data bundle"
            className="w-3/6"
            value={voucherPayload.data_bundle.toString()}
            onChange={(e) =>
              setVoucherPayload("data_bundle", parseInt(e.target.value))
            }
          />
        </div>
        <Textarea
          cols={50}
          rows={10}
          placeholder="Enter vouchers"
          value={voucherPayload.vouchers}
          onChange={(e) => setVoucherPayload("vouchers", e.target.value)}
        />
      </div>
      <div className="flex flex-row gap-5 mt-10">
        <button
          className="bg-blue-500 capitalize w-[12rem] md:w-[10rem] rounded-md py-2 md:py-3 text-white cursor-pointer active:scale-[1.04] transition-all ease-linear duration-150"
          onClick={() => handleSet()}
        >
          Add voucher
        </button>
        <Dialog>
          <DialogTrigger asChild>
            <button
              className="bg-green-500 capitalize w-[12rem] md:w-[10rem] text-sm rounded-md py-2 md:py-3 text-white cursor-pointer active:scale-[1.04] transition-all ease-linear duration-150"
              onClick={() => loadVouchersForCategory(selectedCategory || 'daily')}
            >
              View all vouchers
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>All vouchers for {payload.network_location}</DialogTitle>
            </DialogHeader>
            <div>
              <AppHeader />
              
              {/* Search input */}
              <div className="mt-4 mb-2">
                <Input
                  type="text"
                  placeholder="Search vouchers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="my-4 flex space-x-2 overflow-x-auto pb-2">
                {PLAN_TABS.map((category) => (
                  <button
                    key={category}
                    className={`px-4 py-2 rounded-md capitalize ${
                      selectedCategory === category 
                        ? 'bg-black text-white' 
                        : 'bg-gray-200 text-gray-800'
                    }`}
                    onClick={() => loadVouchersForCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="my-4 max-h-[60vh] overflow-y-auto p-2">
                {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <p>Loading vouchers...</p>
                  </div>
                ) : Object.keys(allVouchers).length === 0 ? (
                  <p className="text-center text-gray-500">
                    No vouchers found for {selectedCategory} category in {payload.network_location}
                  </p>
                ) : (
                  Object.keys(allVouchers).map((capacity) => (
                    <div key={capacity} className="border rounded-md p-4 mb-6">
                      <h3 className="font-bold text-lg mb-2 capitalize">{capacity} Vouchers</h3>
                      {Object.keys(allVouchers[capacity]).map((bundle) => {
                        const bundleVouchers = allVouchers[capacity][bundle];
                        const filteredVouchers = getFilteredVouchers(capacity, bundle, bundleVouchers);
                        const voucherCount = Object.keys(filteredVouchers).length;
                        
                        if (searchTerm && voucherCount === 0) return null;
                        
                        return (
                          <div key={bundle} className="mb-4 border-t pt-2">
                            <h4 className="font-semibold mb-2">
                              {bundle} {capacity} Bundle 
                              <span className="ml-2 text-sm font-normal text-gray-600">
                                ({voucherCount} {voucherCount === 1 ? 'voucher' : 'vouchers'} left)
                              </span>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {Object.keys(filteredVouchers).slice(0, 100).map((voucherId) => (
                                <div key={voucherId} className="flex flex-col gap-2 justify-between items-center border p-2 rounded bg-gray-50">
                                  <span className="font-mono text-sm truncate mr-2">
                                    {filteredVouchers[voucherId]}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteVoucher(capacity, bundle, voucherId)}
                                    className="bg-red-400 text-white flex items-center gap-1 px-2 py-1 rounded-sm text-xs transition-all ease-linear duration-150 active:scale-[1.04]"
                                  >
                                    <Trash size={12} />
                                    Delete
                                  </button>
                                </div>
                              ))}
                              {voucherCount > 100 && (
                                <div className="col-span-full text-center text-gray-500 mt-2">
                                  Showing 100 of {voucherCount} vouchers
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}


function Plan() {
  const { payload, setNetworkPayload } = useNetworkApi();
  const [plans, setPlans] = useState<SubscriptionCardType[]>([]);
  const SUBSCRIPTION_PLANS: SubscriptionCardType[] = [
    {
      data_bundle: payload.plan.data_bundle,
      capacity: payload.plan.capacity,
      duration: payload.plan.duration,
      price: payload.plan.price,
    },
  ];

  const handleSet = React.useCallback(() => {
    if (!payload.plan) return;
    addPlans(SUBSCRIPTION_PLANS, payload.network_location);
  }, [SUBSCRIPTION_PLANS, payload.plan]);

  // const PlanActions = [
  //   { id: 1, label: "add plan", action: () => handleSet() },
  //   { id: 1, label: "view all plan", action: () => handleSet() },
  // ];

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
  return (
    <div className="space-y-4">
      <Label>Select Location</Label>
      <AppHeader />
      <div className="space-y-4 items-center w-full md:w-2/6 gap-4 mb-4">
        <Label>Data Capacity</Label>
        <Select
          value={payload.plan.capacity}
          onValueChange={(value) =>
            setNetworkPayload("plan", { ...payload.plan, capacity: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select capacity" />
          </SelectTrigger>
          <SelectContent className="py-2">
            <SelectGroup>
              {["GB", "MB"].map((item, indx) => (
                <SelectItem key={indx} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="w-full md:w-2/6 h-full">
        <div className="mb-4 space-y-4">
          <div className="space-y-2">
            <Label>Data Bundle</Label>
            <Input
              type="number"
              placeholder="Enter Data bundle"
              className="w-3/6"
              value={payload.plan.data_bundle}
              onChange={(e) =>
                setNetworkPayload("plan", {
                  ...payload.plan,
                  data_bundle: parseInt(e.target.value),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Duration</Label>
            <Input
              type="number"
              placeholder="Duration"
              className="w-3/6"
              value={payload.plan.duration}
              onChange={(e) =>
                setNetworkPayload("plan", {
                  ...payload.plan,
                  duration: parseInt(e.target.value),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Price</Label>
            <Input
              type="number"
              placeholder="Price"
              className="w-3/6"
              value={payload.plan.price}
              onChange={(e) =>
                setNetworkPayload("plan", {
                  ...payload.plan,
                  price: parseInt(e.target.value),
                })
              }
            />
          </div>
        </div>
      </div>
      <div className="flex flex-row gap-5 mt-10">
          <button
            className={`${
           "bg-blue-500"
            } capitalize w-[12rem] md:w-[10rem] rounded-md  py-2 roumd:py-3 text-white cursor-pointer active:scale-[1.04] transition-all ease-linear duration-150`}
            onClick={() => handleSet()}
          >
            Add plan
          </button>
         <Dialog>
          <DialogTrigger asChild>
          <button
            className={`${
             "bg-green-500"
            } capitalize w-[12rem] md:w-[10rem] rounded-md  py-2 roumd:py-3 text-white cursor-pointer active:scale-[1.04] transition-all ease-linear duration-150`}
            onClick={() => {}}
          >
            View all plans
          </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>All Plans</DialogTitle>
            </DialogHeader>
            <div>
            <AppHeader />
              <div className="my-4 space-y-3 max-h-[50vh] overflow-y-scroll">
                {plans.map((item) => {
                  const [label] = getPeriodLabel(item.duration);
                  return (
                    <div key={item.id} className="flex flex-row items-center justify-between border rounded-md p-2 cursor-pointer hover:bg-gray-200/50 transition-all ease-linear duration-150">
                    <div  className="">
                      <p className="font-[family-name:var(--font-din-bold)]">{item.data_bundle}{item.capacity} <span className="text-sm">({parseToNaira(item.price)})</span> Plan</p>
                      <p>{item.duration} {label} <span className="text-xs text-gray-500">(Plan Duration)</span></p>
                    </div>
                    <button
                      onClick={() => {
                        set(ref(database, `${payload.network_location}/plans/${item.id}`), null);
                      }}
                    className="bg-red-400 text-white flex flex-row items-center gap-1 w-[5rem] h-9 justify-center rounded-sm text-sm font-[family-name:var(--font-din-bold)] transition-all ease-linear duration-150 active:scale-[1.04] cursor-pointer">
                      <Trash size={14}/>
                      Delete
                    </button>
                    </div>
                  )})
                } 
              </div>
            </div>
          </DialogContent>
         </Dialog>
      </div>
    </div>
  );
}