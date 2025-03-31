"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { getTenantVoucherAndDelete } from "@/app/netvend/lib/db";
import { ArrowLeft, Copy, CheckCircle, Loader2, Check, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Toaster, toast } from "sonner";
import { useTenant } from "../../contexts/tenant-context";

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

export default function VoucherPage() {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const params = useSearchParams();
  const ref = params.get("reference") || params.get("trxref");
  
  const router = useRouter();
  const [voucher, setVoucher] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const [voucherGenerationAttempted, setVoucherGenerationAttempted] = useState(false);
  const [storedVoucher, setStoredVoucher] = useState<string | null>(null);
  const [isNewPayment, setIsNewPayment] = useState(false);
  const [generatedVoucher, setGeneratedVoucher] = useState<string | null>(null);
  const [redirected, setRedirected] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  
  // Debug ref to track function calls
  const debugRef = useRef({
    verifyCount: 0,
    generateCount: 0,
    lastError: null as Error | null
  });
  
  // Check if this is a new payment by looking for reference in URL or localStorage
  useEffect(() => {
    if (tenantLoading) return;
    if (!tenant) {
      setLoading(false);
      return;
    }
    
    console.log("Initial check - ref:", ref, "voucher in state:", voucher);
    
    // Check if payment was already verified in a previous session
    const existingVerification = localStorage.getItem(`${tenant.id}_payment_verified`);
    if (existingVerification === "true") {
      setPaymentVerified(true);
    }
    
    if (ref && !redirected) {
      console.log("New payment detected from URL reference");
      setIsNewPayment(true);
      
      // If this is a new payment, clear any existing voucher from state
      // but keep it in localStorage as a backup
      if (voucher) {
        setStoredVoucher(voucher);
        setVoucher(null);
      }
    } else {
      console.log("Not a new payment, checking for existing voucher");
      // If not a new payment, we can use the stored voucher
      const existingVoucher = localStorage.getItem(`${tenant.id}_active_vc`);
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
  }, [ref, voucher, redirected, tenant, tenantLoading]);

  // Verify payment transaction if reference exists
  const verifyTransaction = useCallback(async () => {
    if (!tenant) return null;
    
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
      
      const apiResponse = await fetch(`/api/payment/verify?reference=${paymentRef}&tenantId=${tenant.id}`);
      
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Failed to verify payment');
      }
      
      const data = await apiResponse.json();
      console.log("Transaction verification response:", data);
      
      if (data.status === true) {
        // Store verification result in localStorage for resilience
        localStorage.setItem(`${tenant.id}_payment_verified`, "true");
        localStorage.setItem(`${tenant.id}_payment_data`, JSON.stringify(data));
        console.log("Payment verification successful");
        
        // Set state to indicate payment is verified
        setPaymentVerified(true);
        
        // Immediately generate voucher after successful verification
        setVerificationAttempted(true);
        return data;
      } else {
        throw new Error(data.message || 'Payment verification failed');
      }
    } catch (error: any) {
      console.error("Transaction verification failed:", error.message);
      debugRef.current.lastError = error;
      toast.error("We couldn't verify your payment. Please try again.");
      setVerificationAttempted(true);
      setLoading(false);
      return null;
    }
  }, [ref, isNewPayment, tenant]);

  // Generate voucher based on stored parameters
  const generateVoucher = useCallback(async () => {
    if (!tenant) return;
    
    debugRef.current.generateCount++;
    console.log(`Voucher generation attempt #${debugRef.current.generateCount}`);
    
    // If not a new payment, don't generate a new voucher
    if (!isNewPayment) {
      console.log("Not a new payment, using existing voucher");
      setLoading(false);
      return;
    }
    
    // Skip if payment verification hasn't been confirmed
    if (!paymentVerified) {
      console.log("Payment not verified yet, skipping voucher generation");
      setLoading(false);
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
      console.log("Calling getTenantVoucherAndDelete with:", {
        tenantId: tenant.id,
        duration, capacity, bundle, network_location
      });
      
      const newVoucher = await getTenantVoucherAndDelete(
        tenant.id,
        duration,
        capacity,
        bundle,
        network_location
      );
      
      console.log("getTenantVoucherAndDelete result:", newVoucher);
      
      if (!newVoucher) {
        throw new Error("Failed to generate voucher - no voucher returned");
      }
      
      // Store the new voucher
      console.log("Setting new voucher:", newVoucher);
      setGeneratedVoucher(newVoucher);
      setVoucher(newVoucher);
      
      // Save the new voucher to localStorage, replacing any previous one
      localStorage.setItem(`${tenant.id}_active_vc`, newVoucher);
      
      // Clear payment reference and verification data
      localStorage.removeItem("payment_reference");
      localStorage.removeItem(`${tenant.id}_payment_verified`);
      localStorage.removeItem("voucher_params");
      
      // Clear the isNewPayment flag
      setIsNewPayment(false);
      
      // IMPORTANT: Redirect to clean URL to prevent regeneration on reload
      if (ref) {
        setRedirected(true);
        router.replace(`/${tenant.id}/voucher`);
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
  }, [isNewPayment, paymentVerified, storedVoucher, ref, router, tenant]);

  // Verify transaction on mount
  useEffect(() => {
    if (!verificationAttempted && isNewPayment && !redirected && tenant) {
      console.log("Triggering verification");
      verifyTransaction();
    }
  }, [verifyTransaction, verificationAttempted, isNewPayment, redirected, tenant]);

  // Generate voucher after verification
  useEffect(() => {
    if (
      tenant &&
      isNewPayment &&
      paymentVerified && 
      !voucherGenerationAttempted &&
      !redirected
    ) {
      console.log("Triggering voucher generation after verification");
      generateVoucher();
    }
  }, [tenant, isNewPayment, paymentVerified, voucherGenerationAttempted, generateVoucher, redirected]);

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

  // Manual retry function that handles both verification and generation
  const handleRetry = async () => {
    setLoading(true);
    
    // First verify the payment
    const verificationResult = await verifyTransaction();
    
    // If verification was successful, the generateVoucher will be triggered by the useEffect
    if (!verificationResult) {
      setLoading(false);
    }
  };

  // Determine which voucher to display
  const displayVoucher = generatedVoucher || voucher || storedVoucher;

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardDescription className="text-red-600 font-bold text-xl">
              Tenant Not Found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>The requested tenant does not exist or is not active.</p>
            <Button 
              onClick={() => router.push("/")} 
              variant="outline" 
              className="mt-4"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <div 
            className="p-6"
            style={{ 
              background: `linear-gradient(to right, ${tenant.primaryColor}, ${tenant.secondaryColor || tenant.primaryColor})`
            }}
          >
            <CardHeader className="p-0 mb-4">
              <CardDescription className="font-bold text-2xl text-white">
                Your Voucher Code
              </CardDescription>
            </CardHeader>
            <p className="text-white text-opacity-80 text-sm">
              Use this code to access {tenant.name} network services
            </p>
          </div>
          
          <CardContent className="p-6">
            {/* Transaction Status Component */}
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
                <Loader2 
                  className="h-12 w-12 animate-spin mb-4"
                  style={{ color: tenant.primaryColor }}
                />
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
                      <div style={{ color: tenant.primaryColor }}>
                        {copied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <Button 
                        onClick={copyToClipboard} 
                        className="w-full text-white"
                        style={{ backgroundColor: tenant.primaryColor }}
                      >
                        {copied ? "Copied!" : "Copy Voucher Code"}
                      </Button>
                      
                      <Button 
                        onClick={() => router.push(`/${tenant.id}`)} 
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
                          onClick={handleRetry} 
                          className="text-white"
                          style={{ backgroundColor: tenant.primaryColor }}
                        >
                          Try Again
                        </Button>
                      )}
                      
                      <Button 
                        onClick={() => router.push(`/${tenant.id}`)} 
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
                    Having trouble? Contact {tenant.name} support for assistance.
                  </p>
                  {tenant.contactEmail && (
                    <a 
                      href={`mailto:${tenant.contactEmail}`}
                      className="text-sm font-medium mt-1 inline-block"
                      style={{ color: tenant.primaryColor }}
                    >
                      {tenant.contactEmail}
                    </a>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}