"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { getRandomVoucherAndDelete } from "@/lib/db";
import { useNetworkApi } from "../network.store";
import { InitializeResponse } from "@/lib/types";
import { ArrowLeft, Copy, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Toaster, toast } from "sonner";

export default function Page() {
  const params = useSearchParams();
  const ref = params.get("reference") || params.get("trxref");
  
  const router = useRouter();
  const { voucher, setVoucher } = useNetworkApi();
  const [response, setResponse] = useState<InitializeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const [voucherGenerationAttempted, setVoucherGenerationAttempted] = useState(false);
  const [storedVoucher, setStoredVoucher] = useState<string | null>(null);
  const [isNewPayment, setIsNewPayment] = useState(false);
  const [generatedVoucher, setGeneratedVoucher] = useState<string | null>(null);
  const [redirected, setRedirected] = useState(false);
  
  // Debug ref to track function calls
  const debugRef = useRef({
    verifyCount: 0,
    generateCount: 0,
    lastError: null as Error | null
  });
  
  // Check if this is a new payment by looking for reference in URL or localStorage
  useEffect(() => {
    console.log("Initial check - ref:", ref, "voucher in state:", voucher);
    
    if (ref && !redirected) {
      console.log("New payment detected from URL reference");
      setIsNewPayment(true);
      
      // If this is a new payment, clear any existing voucher from state
      // but keep it in localStorage as a backup
      if (voucher) {
        setStoredVoucher(voucher);
        setVoucher("");
      }
    } else {
      console.log("Not a new payment, checking for existing voucher");
      // If not a new payment, we can use the stored voucher
      const existingVoucher = localStorage.getItem("active_vc");
      if (existingVoucher) {
        console.log("Found existing voucher:", existingVoucher);
        setStoredVoucher(existingVoucher);
        setVoucher(existingVoucher);
        setGeneratedVoucher(existingVoucher);
        setLoading(false);
      } else {
        console.log("No existing voucher found");
        setLoading(false);
      }
    }
  }, [ref, setVoucher, voucher, redirected]);

  // Verify payment transaction if reference exists
  const verifyTransaction = useCallback(async () => {
    debugRef.current.verifyCount++;
    console.log(`Verification attempt #${debugRef.current.verifyCount}`);
    
    // If not a new payment, skip verification
    if (!isNewPayment) {
      console.log("Not a new payment, skipping verification");
      setVerificationAttempted(true);
      setLoading(false);
      return null;
    }
    
    // Get reference from URL or localStorage
    const paymentRef = ref || localStorage.getItem("payment_reference");
    
    if (!paymentRef) {
      console.log("No payment reference found");
      setVerificationAttempted(true);
      setLoading(false);
      return null;
    }

    try {
      console.log("Verifying transaction with ref:", paymentRef);
      setLoading(true);
      
      const apiResponse = await fetch(`/api/payment/verify?reference=${paymentRef}`);
      
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Failed to verify payment');
      }
      
      const data = await apiResponse.json();
      console.log("Transaction verification response:", data);
      
      if (data.status === true) {
        setResponse(data);
        // Store verification result in localStorage for resilience
        localStorage.setItem("payment_verified", "true");
        localStorage.setItem("payment_data", JSON.stringify(data));
        console.log("Payment verification successful");
      } else {
        throw new Error(data.message || 'Payment verification failed');
      }
      
      setVerificationAttempted(true);
      return data;
    } catch (error: any) {
      console.error("Transaction verification failed:", error.message);
      debugRef.current.lastError = error;
      toast.error("We couldn't verify your payment. Please try again.");
      setVerificationAttempted(true);
      setLoading(false);
      return null;
    }
  }, [ref, isNewPayment]);

  // Generate voucher based on stored parameters
  const generateVoucher = useCallback(async () => {
    debugRef.current.generateCount++;
    console.log(`Voucher generation attempt #${debugRef.current.generateCount}`);
    
    // If not a new payment, don't generate a new voucher
    if (!isNewPayment) {
      console.log("Not a new payment, using existing voucher");
      setLoading(false);
      return;
    }
    
    // Skip if payment verification hasn't been attempted yet
    if (!verificationAttempted && !localStorage.getItem("payment_verified")) {
      console.log("Payment not verified yet, skipping voucher generation");
      return;
    }
    
    setLoading(true);
    setVoucherGenerationAttempted(true);
    
    try {
      // Get voucher parameters from localStorage
      const voucherParamsString = localStorage.getItem("voucher_params");
      if (!voucherParamsString) {
        throw new Error("No voucher parameters found");
      }
      
      const voucherParams = JSON.parse(voucherParamsString);
      console.log("Generating voucher with params:", voucherParams);
      
      // Extract parameters
      const { duration, capacity, bundle, network_location } = voucherParams;
      
      // Validate parameters
      if (!duration || !capacity || !bundle || !network_location) {
        throw new Error("Incomplete voucher parameters");
      }
      
      // Generate voucher
      console.log("Calling getRandomVoucherAndDelete with:", {
        duration, capacity, bundle, network_location
      });
      
      const newVoucher = await getRandomVoucherAndDelete(
        duration,
        capacity,
        bundle,
        network_location
      );
      
      console.log("getRandomVoucherAndDelete result:", newVoucher);
      
      if (!newVoucher) {
        throw new Error("Failed to generate voucher - no voucher returned");
      }
      
      // Store the new voucher in multiple places for resilience
      console.log("Setting new voucher:", newVoucher);
      setGeneratedVoucher(newVoucher);
      setVoucher(newVoucher);
      
      // Save the new voucher to localStorage, replacing any previous one
      localStorage.setItem("active_vc", newVoucher);
      
      // Clear payment reference and verification data
      localStorage.removeItem("payment_reference");
      localStorage.removeItem("payment_verified");
      localStorage.removeItem("voucher_params");
      
      // Clear the isNewPayment flag
      setIsNewPayment(false);
      
      // IMPORTANT: Redirect to clean URL to prevent regeneration on reload
      if (ref) {
        setRedirected(true);
        router.replace("/voucher");
      }
      
      toast.success("Voucher generated successfully!");
    } catch (error: any) {
      console.error("Voucher generation failed:", error);
      debugRef.current.lastError = error;
      
      // Check if we have a stored voucher to fall back to
      if (storedVoucher) {
        console.log("Falling back to stored voucher:", storedVoucher);
        setGeneratedVoucher(storedVoucher);
        setVoucher(storedVoucher);
        toast.info("Using your previous voucher instead");
      } else {
        toast.error(`Failed to generate voucher: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [isNewPayment, verificationAttempted, setVoucher, storedVoucher, ref, router]);

  // Verify transaction on mount
  useEffect(() => {
    if (!verificationAttempted && isNewPayment && !redirected) {
      console.log("Triggering verification");
      verifyTransaction();
    }
  }, [verifyTransaction, verificationAttempted, isNewPayment, redirected]);

  // Generate voucher after verification
  useEffect(() => {
    if (
      isNewPayment &&
      (verificationAttempted || localStorage.getItem("payment_verified")) && 
      !voucherGenerationAttempted &&
      !redirected
    ) {
      console.log("Triggering voucher generation after verification");
      generateVoucher();
    }
  }, [isNewPayment, verificationAttempted, voucherGenerationAttempted, generateVoucher, redirected]);

  // Copy voucher to clipboard
  const copyToClipboard = () => {
    const voucherToCopy = generatedVoucher || voucher || storedVoucher;
    if (voucherToCopy) {
      navigator.clipboard.writeText(voucherToCopy);
      setCopied(true);
      toast.success("Voucher code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Determine which voucher to display
  const displayVoucher = generatedVoucher || voucher || storedVoucher;

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
                <p className="text-gray-600">
                  {isNewPayment ? "Generating your new voucher..." : "Loading your voucher..."}
                </p>
              </div>
            ) : (
              <>
                {displayVoucher ? (
                  <>
                    <div 
                      className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex items-center justify-between mb-6 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={copyToClipboard}
                    >
                      <p className="font-mono text-xl text-gray-800 tracking-wider">
                        {displayVoucher}
                      </p>
                      <div className="text-blue-500">
                        {copied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <Button 
                        onClick={copyToClipboard} 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {copied ? "Copied!" : "Copy Voucher Code"}
                      </Button>
                      
                      <Button 
                        onClick={() => router.push("/")} 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">
                      {isNewPayment 
                        ? "We couldn't generate a new voucher. Please try again or contact support." 
                        : "No voucher available. Please complete payment first."}
                    </p>
                    
                    <div className="space-y-4">
                      {isNewPayment && (
                        <Button 
                          onClick={() => {
                            setVerificationAttempted(false);
                            setVoucherGenerationAttempted(false);
                            verifyTransaction();
                          }} 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Try Again
                        </Button>
                      )}
                      
                      <Button 
                        onClick={() => router.push("/")} 
                        variant="outline" 
                        className="flex items-center justify-center gap-2 mx-auto mt-4"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="mt-6 text-center">
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
