"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTenant } from "@/app/netvend/contexts/tenant-context";

export default function PaymentPage() {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const planId = searchParams.get("plan");
  const amount = searchParams.get("amount");
  
  useEffect(() => {
    // Validate required parameters
    if (!planId || !amount) {
      setError("Missing required payment information");
    }
  }, [planId, amount]);
  
  const handlePayment = async () => {
    if (!tenant || !planId || !amount) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Store reference to payment in localStorage
      const paymentReference = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem("payment_reference", paymentReference);
      
      // Call payment initialization API
      const response = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number(amount),
          email: "customer@example.com", // In a real app, get this from user input
          metadata: {
            planId,
            tenantId: tenant.id,
            reference: paymentReference
          },
          reference: paymentReference
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to initialize payment");
      }
      
      const data = await response.json();
      
      // Redirect to payment gateway
      window.location.href = data.authorization_url;
    } catch (err: any) {
      console.error("Payment initialization failed:", err);
      setError(err.message || "Failed to initialize payment");
    } finally {
      setIsLoading(false);
    }
  };
  
  if (tenantLoading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (!tenant) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600">Tenant Not Found</h1>
        <p className="mt-2">The requested tenant does not exist or is not active.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto"
      >
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <Card className="shadow-lg border-0">
          <div 
            className="h-2"
            style={{ backgroundColor: tenant.primaryColor }}
          />
          <CardHeader>
            <CardTitle>Complete Your Payment</CardTitle>
            <CardDescription>
              Secure payment for your network access plan
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="border rounded-md p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Plan:</span>
                <span className="font-medium">{planId}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600">Amount:</span>
                <span className="font-bold text-lg">₦{Number(amount).toLocaleString()}</span>
              </div>
            </div>
            
            <Button
              className="w-full"
              style={{ backgroundColor: tenant.primaryColor }}
              onClick={handlePayment}
              disabled={isLoading || !!error}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Pay Now"
              )}
            </Button>
            
            <p className="text-xs text-center text-gray-500 mt-4">
              By clicking "Pay Now", you agree to our Terms of Service and Privacy Policy.
              Your payment will be processed securely.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
