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
import React from "react";
import { PlanTab, SubscriptionCardType } from "../page";
import { Textarea } from "@/components/ui/textarea";
import { useNetworkApi } from "../network.store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addPlans, addVouchers } from "@/lib/db";

const PLAN_TABS: PlanTab[] = ["hourly", "daily", "weekly", "monthly", "yearly"];

const Menu = [
  { id: 1, label: "vouchers" },
  { id: 2, label: "plans" },
];

export default function Management() {
  const [activeTab, setActiveTab] = React.useState<string>("vouchers");

  const handleSetTab = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="relative m-10 rounded-md bg-black/10 drop-shadow-2xs p-4">
      <h2 className="text-center py-4 text-lg font-[family-name:var(--font-din-bold)]">
        Flourish Network Management
      </h2>
      <div className="flex gap-5">
        <div className="flex flex-col items-center justify-center gap-4 w-1/5">
          {Menu.map((item) => (
            <Card
              key={item.id} // Fix: Added key to avoid React warnings
              className="w-full h-[150px] shadow-none hover:scale-[1.02] hover:drop-shadow-sm transition-all ease-linear duration-150 cursor-pointer active:scale-[1.04]"
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
    </div>
  );
}

function View({ tab }: { tab: string }) {
  return (
    <Card className="w-full flex-grow relative">
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
  const { voucherPayload, setVoucherPayload } = useNetworkApi();

  const handleSet = React.useCallback(() => {
    if (!voucherPayload?.vouchers) return;

    const cleanedVouchers = extractVouchers(voucherPayload.vouchers);
    addVouchers(
      voucherPayload.duration,
      voucherPayload.capacity,
      voucherPayload.data_bundle,
      cleanedVouchers
    );
  }, [voucherPayload]);

  const VoucherActions = [
    { id: 1, label: "add voucher", action: handleSet },
    { id: 2, label: "delete voucher", action: () => {} },
  ];

  return (
    <div>
      <div className="flex flex-row items-center w-1/6 gap-4 mb-4">
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
      <div className="w-2/6 h-full">
        <div className="mb-4 space-y-2">
          <Label>Data Bundle</Label>
          <Input
            type="number"
            placeholder="Enter Data bundle"
            className="w-3/6"
            value={voucherPayload.data_bundle}
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
        {VoucherActions.map((item) => (
          <button
            key={item.id}
            className={`${
              item.label.startsWith("delete") ? "bg-red-500" : "bg-blue-500"
            } capitalize w-[10rem] rounded-md py-3 text-white cursor-pointer active:scale-[1.04] transition-all ease-linear duration-150`}
            onClick={item.action}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
function Plan() {
  const { payload, setNetworkPayload } = useNetworkApi();

  const SUBSCRIPTION_PLANS: SubscriptionCardType[] = [
    { data_bundle: payload.plan.data_bundle, capacity: payload.plan.capacity, duration: payload.plan.duration, price: payload.plan.price },
  ];
  
  const handleSet = React.useCallback(() => {
    if (!payload.plan) return;
    addPlans(SUBSCRIPTION_PLANS)
  }, [SUBSCRIPTION_PLANS, payload.plan]);

  const PlanActions = [
    { id: 1, label: "add plan", action: () => handleSet() },
    { id: 2, label: "delete plan", action: () => {} },
  ];

  return (
    <div>
      <div className="space-y-4 items-center w-1/6 gap-4 mb-4">
      <Label>Data Capacity</Label>
        <Select
          value={payload.plan.capacity}
          onValueChange={(value) => setNetworkPayload('plan', {...payload.plan, capacity: value})}
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
      <div className="w-2/6 h-full">
        <div className="mb-4 space-y-4">
        <div className="space-y-2">
          <Label>Data Bundle</Label>
          <Input
            type="number"
            placeholder="Enter Data bundle"
            className="w-3/6"
            value={payload.plan.data_bundle}
            onChange={(e) =>
                setNetworkPayload('plan', {...payload.plan, data_bundle: parseInt(e.target.value)})
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
                setNetworkPayload('plan', {...payload.plan, duration: parseInt(e.target.value)})
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
                setNetworkPayload('plan', {...payload.plan, price: parseInt(e.target.value)})
            }
          />
        </div>
        </div>
      </div>
      <div className="flex flex-row gap-5 mt-10">
        {PlanActions.map((item) => (
          <button
            key={item.id}
            className={`${
              item.label.startsWith("delete") ? "bg-red-500" : "bg-blue-500"
            } capitalize w-[10rem] rounded-md py-3 text-white cursor-pointer active:scale-[1.04] transition-all ease-linear duration-150`}
            onClick={item.action}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
