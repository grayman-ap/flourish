"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { getRandomVoucherAndDelete } from "@/lib/db";
import { useNetworkApi } from "../network.store";
import { InitializeResponse } from "@/lib/types";
import { ArrowLeft, Copy, CheckCircle, Loader2, Check, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Toaster, toast } from "sonner";

// Transaction Status Component
const TransactionStatus = ({
  verificationAttempted,
  paymentVerified,
  voucherGenerationAttempted,
  voucherGenerated,
}: {
  verificationAttempted: boolean;
  paymentVerified: boolean;
  voucherGenerationAttempted: boolean;
  voucherGenerated: boolean;
}) => {
  const steps = [
    {
      name: verificationAttempted && paymentVerified ? "Payment Processed" : "Payment Processing",
      status: verificationAttempted 
        ? (paymentVerified ? "completed" : "failed") 
        : "in-progress"
    },
    {
      name: voucherGenerationAttempted && voucherGenerated ? "Voucher Generated" : "Voucher Generation",
      status: !paymentVerified 
        ? "pending" 
        : voucherGenerationAttempted 
          ? (voucherGenerated ? "completed" : "failed") 
          : "in-progress"
    }
  ];

  return (
    <div className="mb-6 bg-white rounded-lg p-4 border border-gray-100">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Transaction Status
      </h3>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div
              className={`
              flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center
              ${
                step.status === "completed"
                  ? "bg-green-100 text-green-600"
                  : step.status === "failed"
                  ? "bg-red-100 text-red-600"
                  : step.status === "in-progress"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-400"
              }
            `}
            >
              {step.status === "completed" ? (
                <Check className="h-4 w-4" />
              ) : step.status === "failed" ? (
                <span className="text-xs">✕</span>
              ) : step.status === "in-progress" ? (
                <Clock className="h-4 w-4 animate-pulse" />
              ) : (
                <span className="text-xs">•</span>
              )}
            </div>
            <div className="ml-3">
              <p
                className={`text-sm font-medium
                ${
                  step.status === "completed"
                    ? "text-green-600"
                    : step.status === "failed"
                    ? "text-red-600"
                    : step.status === "in-progress"
                    ? "text-blue-600"
                    : "text-gray-400"
                }
              `}
              >
                {step.name}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

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
  const [paymentVerified, setPaymentVerified] = useState(false);

  const debugRef = useRef({
    verifyCount: 0,
    generateCount: 0,
    lastError: null as Error | null,
  });

  // Load persisted transaction status from localStorage
  useEffect(() => {
    const storedVerificationAttempted = localStorage.getItem("verification_attempted") === "true";
    const storedPaymentVerified = localStorage.getItem("payment_verified") === "true";
    const storedVoucherGenerationAttempted = localStorage.getItem("voucher_generation_attempted") === "true";
    const storedVoucher = localStorage.getItem("active_vc");

    setVerificationAttempted(storedVerificationAttempted);
    setPaymentVerified(storedPaymentVerified);
    setVoucherGenerationAttempted(storedVoucherGenerationAttempted);

    console.log("Initial check - ref:", ref, "voucher in state:", voucher);

    // If there's a reference, it's a new payment
    if (ref) {
      setIsNewPayment(true);
      setLoading(true);
    } else {
      // If no reference, show stored voucher if available
      if (storedVoucher) {
        setStoredVoucher(storedVoucher);
        setGeneratedVoucher(storedVoucher);
        setVoucher(storedVoucher);
      }
      setLoading(false);
    }
  }, [ref, setVoucher, voucher]);

  // Verify payment with retry
  const verifyTransaction = useCallback(async (maxRetries = 3) => {
    if (!navigator.onLine) {
      toast.error("Please check your internet connection");
      setVerificationAttempted(true);
      localStorage.setItem("verification_attempted", "true");
      setLoading(false);
      return null;
    }

    debugRef.current.verifyCount++;
    console.log(`Verification attempt #${debugRef.current.verifyCount}`);

    if (!isNewPayment || !ref) {
      setVerificationAttempted(true);
      localStorage.setItem("verification_attempted", "true");
      setLoading(false);
      return null;
    }

    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        setLoading(true);
        const apiResponse = await fetch(`/api/payment/verify?reference=${ref}`);
        if (!apiResponse.ok) throw new Error((await apiResponse.json()).error || "Verification failed");

        const data = await apiResponse.json();
        if (data.status === true) {
          setResponse(data);
          setPaymentVerified(true);
          setVerificationAttempted(true);
          localStorage.setItem("payment_verified", "true");
          localStorage.setItem("verification_attempted", "true");
          localStorage.setItem("payment_data", JSON.stringify(data));
          return data;
        }
        throw new Error(data.message || "Payment verification failed");
      } catch (error: any) {
        attempts++;
        debugRef.current.lastError = error;
        console.error("Verification failed:", { error: error.message, attempt: attempts });
        if (attempts === maxRetries) {
          toast.error("Payment verification failed after retries. Please try again.");
          setVerificationAttempted(true);
          localStorage.setItem("verification_attempted", "true");
          setLoading(false);
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
  }, [ref, isNewPayment]);

  // Generate voucher with retry
  const generateVoucher = useCallback(async () => {
    debugRef.current.generateCount++;
    console.log(`Voucher generation attempt #${debugRef.current.generateCount}`);

    if (!navigator.onLine) {
      toast.error("Please check your internet connection");
      setLoading(false);
      return;
    }

    if (!isNewPayment || !paymentVerified) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setVoucherGenerationAttempted(true);
    localStorage.setItem("voucher_generation_attempted", "true");

    const voucherParamsString = localStorage.getItem("voucher_params");
    if (!voucherParamsString) {
      toast.error("No voucher parameters found");
      setLoading(false);
      return;
    }

    const { duration, capacity, bundle, network_location } = JSON.parse(voucherParamsString);
    if (!duration || !capacity || !bundle || !network_location) {
      toast.error("Invalid voucher parameters");
      setLoading(false);
      return;
    }

    let attempts = 0;
    const maxRetries = 3;
    while (attempts < maxRetries) {
      try {
        const newVoucher = await getRandomVoucherAndDelete(duration, capacity, bundle, network_location);
        if (!newVoucher) throw new Error("No voucher returned");

        setGeneratedVoucher(newVoucher);
        setVoucher(newVoucher);
        localStorage.setItem("active_vc", newVoucher);
        localStorage.setItem("voucher_generation_attempted", "true");
        localStorage.removeItem("payment_reference");
        // Keep payment_verified to persist TransactionStatus
        localStorage.removeItem("voucher_params");
        setIsNewPayment(false);

        // Redirect to clean URL after generation
        router.replace("/voucher");

        toast.success("Voucher generated successfully!");
        setLoading(false);
        return;
      } catch (error: any) {
        attempts++;
        console.error("Voucher generation failed:", {
          error: error.message,
          params: { duration, capacity, bundle, network_location },
          attempt: attempts,
        });
        debugRef.current.lastError = error;
        if (attempts === maxRetries) {
          toast.error("Failed to generate voucher after retries");
          setLoading(false);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
  }, [isNewPayment, paymentVerified, setVoucher, router]);

  // Trigger verification and generation only for new payments
  useEffect(() => {
    if (isNewPayment && !verificationAttempted) {
      verifyTransaction();
    }
  }, [verifyTransaction, verificationAttempted, isNewPayment]);

  useEffect(() => {
    if (isNewPayment && paymentVerified && !voucherGenerationAttempted) {
      generateVoucher();
    }
  }, [isNewPayment, paymentVerified, voucherGenerationAttempted, generateVoucher]);

  const copyToClipboard = () => {
    const voucherToCopy = generatedVoucher || voucher || storedVoucher;
    if (voucherToCopy) {
      navigator.clipboard.writeText(voucherToCopy);
      setCopied(true);
      toast.success("Voucher code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRetry = async () => {
    setLoading(true);
    const verificationResult = await verifyTransaction();
    if (!verificationResult) setLoading(false);
  };

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
              <CardDescription className="font-bold text-2xl text-white font-[family-name:var(--font-din-bold)]">
                Your Voucher Code
              </CardDescription>
            </CardHeader>
            <p className="text-blue-100 text-md font-[family-name:var(--font-din-normal)]">
              Use this code to access our network services
            </p>
          </div>
          
          <CardContent className="p-6">
            {(verificationAttempted || paymentVerified) && (
              <TransactionStatus
                verificationAttempted={verificationAttempted}
                paymentVerified={paymentVerified}
                voucherGenerationAttempted={voucherGenerationAttempted}
                voucherGenerated={!!displayVoucher}
              />
            )}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600 font-[family-name:var(--font-din-bold)]">
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
                      <p className="text-xl text-gray-800 tracking-wider font-[family-name:var(--font-din-bold)]">
                        {displayVoucher}
                      </p>
                      <div className="text-blue-500">
                        {copied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5 font-[family-name:var(--font-din-bold)]" />}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <Button 
                        onClick={copyToClipboard} 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-[family-name:var(--font-din-bold)]"
                      >
                        {copied ? "Copied!" : "Copy Voucher Code"}
                      </Button>
                      <Button 
                        onClick={() => router.push("/")} 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2 font-[family-name:var(--font-din-bold)]"
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
                          onClick={handleRetry} 
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
                  <p className="text-md text-gray-500 font-[family-name:var(--font-din-normal)]">
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