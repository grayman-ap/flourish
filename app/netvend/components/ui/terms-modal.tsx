"use client"
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check } from "lucide-react";
import { useTenant } from "../../contexts/tenant-context";

export const TermsAndConditionsModal = () => {
  const { tenant, isLoading } = useTenant();
  const [showModal, setShowModal] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(true); // Default to true to prevent flash

  useEffect(() => {
    // Don't show anything while tenant is loading
    if (isLoading || !tenant) return;
    
    // Check if user has already accepted terms for this tenant
    const termsAccepted = localStorage.getItem(`${tenant.id}_terms_accepted`);
    
    // Only show modal if terms haven't been accepted
    if (!termsAccepted) {
      setHasAccepted(false);
      setShowModal(true);
    }
  }, [isLoading, tenant]);

  const acceptTerms = () => {
    if (!tenant) return;
    
    localStorage.setItem(`${tenant.id}_terms_accepted`, "true");
    setHasAccepted(true);
    setShowModal(false);
  };

  // If already accepted or no tenant, don't render anything
  if (hasAccepted || !tenant) return null;

  return (
    <AnimatePresence>
      {showModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => {}} // Prevent closing by clicking outside
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div 
              className="p-4 text-white"
              style={{ backgroundColor: tenant.primaryColor }}
            >
              <h2 className="text-xl font-bold">{tenant.name} - Terms and Conditions</h2>
              <p className="text-sm opacity-90 mt-1">
                Please read and accept our terms to continue
              </p>
            </div>

            {/* Content */}
            <ScrollArea className="h-[60vh] max-h-[400px] p-4">
              <div className="space-y-4 text-slate-700">
                {/* Use tenant-specific terms if available */}
                {tenant.termsAndConditions ? (
                  <div dangerouslySetInnerHTML={{ __html: tenant.termsAndConditions }} />
                ) : (
                  <>
                    <h3 className="font-bold">1. Introduction</h3>
                    <p>
                      Welcome to {tenant.name}. By accessing our service, you agree to be bound by these Terms and Conditions, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.
                    </p>

                    {/* Default terms content... */}
                    <h3 className="font-bold">2. Use License</h3>
                    <p>
                      Permission is granted to temporarily access the materials on {tenant.name}'s website for personal, non-commercial transitory viewing only.
                    </p>
                    
                    {/* More default terms... */}
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="p-4 border-t border-slate-200 flex flex-col gap-3">
              <Button 
                onClick={acceptTerms}
                className="w-full text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: tenant.primaryColor }}
              >
                <Check className="h-4 w-4" />
                I Accept the Terms & Conditions
              </Button>
              
              <p className="text-xs text-center text-slate-500">
                By clicking "I Accept", you confirm that you have read and agree to our Terms and Conditions and Privacy Policy.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
