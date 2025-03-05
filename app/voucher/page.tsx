/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { InitializeResponse } from "../page";
import { api } from "@/lib/api";
import React, { useState, useEffect, useCallback } from "react";
import { getRandomVoucherAndDelete } from "@/lib/db";
import { useNetworkApi } from "../network.store";

export default function Page() {
  const params = useSearchParams();
  const duration = params.get("duration");
  const capacity:any = params.get("capacity");
  const bundle:any = params.get("bundle");
  const ref = params.get("reference");
  const router = useRouter();
  const base_url = process.env.NEXT_PUBLIC_PAYSTACK_URL || "";
  const { voucher, setVoucher } = useNetworkApi();
  const [response, setResponse] = useState<InitializeResponse | null>(null);
  const [storedVoucher, setStoredVoucher] = useState<string | null>(null);

  // Retrieve voucher from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setStoredVoucher(localStorage.getItem("active_vc"));
    }
  }, []);

  /** Verifies the payment transaction */
  const verifyTransaction = useCallback(async () => {
    if (!ref) return;

    try {
      const { data } = await api.get<InitializeResponse>(`https://api.paystack.co/transaction/verify/${ref}`);
      setResponse(data);
    } catch (error: any) {
      console.error("Transaction verification failed:", error.response?.data?.message || error.message);
    }
  }, [ref, base_url]);

  /** Fetches and sets a voucher */
  const fetchVoucher = useCallback(async () => {
    if (!duration || !response?.status) return;

    try {
      const newVoucher = await getRandomVoucherAndDelete(duration, capacity, bundle);
      if (newVoucher) {
        setVoucher(newVoucher);
        localStorage.setItem("active_vc", newVoucher);
        router.push("/voucher");
      }
    } catch (error) {
      console.error("Failed to fetch voucher:", error);
    }
  }, [duration, response?.status, router, setVoucher]);

  // Fetch transaction details
  useEffect(() => {
    if (ref) verifyTransaction();
  }, [verifyTransaction]);

  // Fetch voucher if necessary
  useEffect(() => {
    if (!voucher) fetchVoucher();
  }, [fetchVoucher, voucher]);

  return (
    <div className="flex justify-center">
      <Card className="fixed flex flex-col justify-center text-center w-full sm:w-4/6 md:w-3/6 lg:w-2/6 rounded-none shadow-md gap-6 h-full bg-gray-50">
        <CardHeader>
          <CardDescription className="font-[family-name:var(--font-din-bold)] text-xl">
            Voucher
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-md">
            <p className="font-[family-name:var(--font-din-bold)] text-2xl">
              {voucher || storedVoucher || "Generating..."}
            </p>
          </div>
          <div className="mt-5">
            <Button onClick={() => router.push("/")}>Go back</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
