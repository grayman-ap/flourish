import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X } from "lucide-react";

export const TermsAndConditionsModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(true); // Default to true to prevent flash

  useEffect(() => {
    // Check if user has already accepted terms
    const termsAccepted = localStorage.getItem("terms_accepted");
    
    // Only show modal if terms haven't been accepted
    if (!termsAccepted) {
      setHasAccepted(false);
      setShowModal(true);
    }
  }, []);

  const acceptTerms = () => {
    localStorage.setItem("terms_accepted", "true");
    setHasAccepted(true);
    setShowModal(false);
  };

  // If already accepted, don't render anything
  if (hasAccepted) return null;

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
            <div className="bg-slate-700 text-white p-4">
              <h2 className="text-xl font-bold">Terms and Conditions</h2>
              <p className="text-sm text-slate-200 mt-1">
                Please read and accept our terms to continue
              </p>
            </div>

            {/* Content */}
            <ScrollArea className="h-[60vh] max-h-[400px] p-4">
              <div className="space-y-4 text-slate-700">
                <h3 className="font-bold">1. Introduction</h3>
                <p>
                  Welcome to Flourish Network. By accessing our service, you agree to be bound by these Terms and Conditions, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.
                </p>

                <h3 className="font-bold">2. Use License</h3>
                <p>
                  Permission is granted to temporarily access the materials on Flourish Network's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for any commercial purpose</li>
                  <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
                </ul>

                <h3 className="font-bold">3. Network Usage</h3>
                <p>
                  When using our network services, you agree to:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Not engage in any illegal activities</li>
                  <li>Not attempt to breach network security</li>
                  <li>Not use excessive bandwidth that may affect other users</li>
                  <li>Not share your voucher code with others</li>
                </ul>

                <h3 className="font-bold">4. Disclaimer</h3>
                <p>
                  The materials on Flourish Network's website are provided on an 'as is' basis. Flourish Network makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                </p>

                <h3 className="font-bold">5. Limitations</h3>
                <p>
                  In no event shall Flourish Network or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Flourish Network's website, even if Flourish Network or a Flourish Network authorized representative has been notified orally or in writing of the possibility of such damage.
                </p>

                <h3 className="font-bold">6. Privacy Policy</h3>
                <p>
                  Your use of our services is also governed by our Privacy Policy, which outlines how we collect, use, and protect your personal information.
                </p>

                <h3 className="font-bold">7. Governing Law</h3>
                <p>
                  These terms and conditions are governed by and construed in accordance with the laws of Nigeria and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
                </p>
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="p-4 border-t border-slate-200 flex flex-col gap-3">
              <Button 
                onClick={acceptTerms}
                className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
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
