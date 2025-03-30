/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect, useCallback } from "react";
import { getRandomVoucherAndDelete } from "@/lib/db";
import { useNetworkApi } from "../network.store";
import { InitializeResponse } from "@/lib/types";
import { ArrowLeft, Copy, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Toaster, toast } from "sonner";

export default function Page() {
  const params = useSearchParams();
  const duration = params.get("duration");
  const capacity: any = params.get("capacity");
  const bundle: any = params.get("bundle");
  const ref = params.get("reference");
  
  const router = useRouter();
  const { voucher, setVoucher } = useNetworkApi();
  const [response, setResponse] = useState<InitializeResponse | null>(null);
  const [storedVoucher, setStoredVoucher] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [location, setLocation] = useState<string | any>(null);


  // Get voucher and location from localStorage on mount
  useEffect(() => {

    if (typeof window !== "undefined") {
      // If we have a reference, look for a voucher specifically for this transaction
      if (ref) {
        const transactionVoucher = localStorage.getItem(`voucher_${ref}`);
        if (transactionVoucher) {
          setStoredVoucher(transactionVoucher);
          setVoucher(transactionVoucher);
          setLoading(false);
          console.log(`Found stored voucher for transaction ${ref}: ${transactionVoucher}`);
        } else {
          console.log(`No stored voucher found for transaction ${ref}`);
        }
      } else {
        // If no reference, check for a general voucher (backward compatibility)
        const generalVoucher = localStorage.getItem("active_voucher");
        if (generalVoucher) {
          setStoredVoucher(generalVoucher);
          setVoucher(generalVoucher);
          setLoading(false);
          console.log(`Found general stored voucher: ${generalVoucher}`);
        }
      }
      
      setLocation(localStorage.getItem("network_location"));
    }

  }, [ref, setVoucher]);

  /** Verifies the payment transaction */
  const verifyTransaction = useCallback(async () => {

    // Skip verification if we already have a voucher for this transaction
    if (!ref || (ref && localStorage.getItem(`voucher_${ref}`))) {
      return;
    }

    try {
      console.log("Verifying transaction with ref:", ref);
      
      // Use your server-side API route instead of direct Paystack call
      const apiResponse = await fetch(`/api/payment/verify?reference=${ref}`);
      
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Failed to verify payment');
      }
      
      const data = await apiResponse.json();
      console.log("Transaction verification response:", data);
      
      setResponse(data);
      console.log("Response state set to:", data);
    } catch (error: any) {
      console.error("Transaction verification failed:", error.message);
      toast.error("We couldn't verify your payment. Please try again.");
      setLoading(false);
    }


  }, [ref]);  
 
  /** Fetches and sets a voucher */
  const fetchVoucher = useCallback(async () => {
    // Skip fetching if we already have a voucher
    if (voucher || storedVoucher) {
      console.log("Using existing voucher, skipping fetch");
      setLoading(false);
      return;
    }
    
    console.log("fetchVoucher called with:", { duration, responseStatus: response?.status });
    
    if (!duration || !response?.status) {
      console.log("Early return due to missing duration or response status");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log(`Attempting to get random voucher with:`, { 
        duration, capacity, bundle, location: location 
      });
      
      const newVoucher = await getRandomVoucherAndDelete(duration, capacity, bundle, location);
      
      console.log(`Voucher result:`, newVoucher);
      
      if (newVoucher) {
        // Set voucher in state and localStorage
        setVoucher(newVoucher);
        localStorage.setItem("active_voucher", newVoucher);
        
        // IMPORTANT: Redirect to /voucher without query parameters
        router.replace("/voucher");
        
        setLoading(false);
      } else {
        console.log("No voucher returned from getRandomVoucherAndDelete");
        toast.error("We couldn't generate a voucher at this time. Please try again later.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to fetch voucher:", error);
      toast.error("Failed to generate voucher. Please try again.");
      setLoading(false);
    }
  }, [duration, response?.status, setVoucher, location, capacity, bundle, voucher, storedVoucher, router]);

  // Fetch transaction details
  useEffect(() => {

    // Only verify if we don't already have a voucher for this transaction
    if (ref && !localStorage.getItem(`voucher_${ref}`)) {
      verifyTransaction();
    } else {
      setLoading(false);
    }

  }, [verifyTransaction, ref]);


  // Fetch voucher if necessary
  useEffect(() => {

    // Only fetch if we don't have a voucher in state or localStorage
    if (!voucher && !storedVoucher) {
      fetchVoucher();
    } else {
      setLoading(false);
    }

  }, [fetchVoucher, voucher, storedVoucher]);

  const copyToClipboard = () => {


    const voucherToCopy = voucher || storedVoucher;
    if (voucherToCopy) {
      navigator.clipboard.writeText(voucherToCopy);
      setCopied(true);
      toast.success("Voucher code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Use voucher from state or localStorage
  const displayedVoucher = voucher || storedVoucher;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Toaster position="top-center" richColors />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full sm:w-4/6 md:w-3/6 lg:w-2/6 max-w-md"
      >
        <Card className="shadow-lg border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <CardHeader className="p-0 mb-4">
              <CardDescription className="font-bold text-2xl text-white">
                Your Voucher Code
              </CardDescription>
            </CardHeader>
            <p className="text-blue-100 text-sm">
              Use this code to access our network services
            </p>
          </div>
          
          <CardContent className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600">Generating your voucher...</p>
              </div>
            ) : (
              <>

                {displayedVoucher ? (
                  <>
                    <div 
                      className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex items-center justify-between mb-6 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={copyToClipboard}
                    >
                      <p className="font-mono text-xl text-gray-800 tracking-wider">

                        {displayedVoucher}
                      </p>
                      <div className="text-blue-500">
                        {copied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                      </div>
                    </div>
                    
                    <div className="space-y-4">

                      <Button 
                        onClick={copyToClipboard} 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-[1.06] transition-all ease-linear duration-200"
                      >
                        {copied ? "Copied!" : "Copy Voucher Code"}
                      </Button>
                      

                      <Button 
                        onClick={() => router.push("/")} 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2 cursor-pointer active:scale-[1.06] transition-all ease-linear duration-200"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">No voucher available. Please try again.</p>

                    <Button 
                      onClick={() => router.push("/")} 
                      variant="outline" 
                      className="flex items-center justify-center gap-2 mx-auto"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Home
                    </Button>
                  </div>
                )}
                
                <div className="mt-10 text-center">
                  <p className="text-sm text-gray-500">
                    Having trouble? Contact our support team for assistance.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
