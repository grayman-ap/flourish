'use client'
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { fetchTenantLocations } from "../../lib/db";
import { NetworkLocation } from "../../types";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, User, Wifi } from "lucide-react";
import { useTenant } from "../../contexts/tenant-context";
import { useNetvendNetwork } from "../../store/network.store";

export const MobileAppHeader = ({ header }: { header?: string }) => {
  const { tenant } = useTenant();
  const { payload, setNetworkPayload } = useNetvendNetwork();
  const [selected, setSelected] = useState<string>("");
  
  // Use tenant ID from context
  const tenantId = tenant?.id || '';
  
  const { data: locations, isLoading } = useQuery<NetworkLocation[]>({
    queryKey: ["locations", tenantId], // Include tenantId in query key
    queryFn: () => fetchTenantLocations(tenantId),
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 10,
    // Don't fetch if no tenant ID
    enabled: !!tenantId
  });

  // Initialize selected location from localStorage or default to first location
  useEffect(() => {
    if (!tenantId) return;
    console.log("Locations",locations)
    const savedLocation = localStorage.getItem(`${tenantId}_network_location`);
    if (savedLocation) {
      setSelected(savedLocation);
      setNetworkPayload("network_location", savedLocation);
    } else if (locations && locations.length > 0) {
      setSelected(locations[0].key);
      setNetworkPayload("network_location", locations[0].key);
      localStorage.setItem(`${tenantId}_network_location`, locations[0].key);
    }
  }, [locations, setNetworkPayload, tenantId]);

  const handleSelect = React.useCallback(
    (key: string) => {
      if (!tenantId) return;
      
      setSelected(key);
      setNetworkPayload("network_location", key);
      localStorage.setItem(`${tenantId}_network_location`, key);
    },
    [setNetworkPayload, tenantId]
  );

  // Use tenant colors if available
  const primaryColor = tenant?.primaryColor || '#4F46E5';
  const secondaryColor = tenant?.secondaryColor || '#818CF8';

  return (
    <div className="w-full">
      <motion.div
        initial={{ y: -10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden bg-slate-50">
          {/* Top section with header and icons */}
          <div className="px-4 pt-4 pb-2">
            {/* Header with user and wifi icons */}
            <div className="flex items-center justify-between mb-3">
              {/* User icon */}
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center">
                <User className="h-5 w-5 text-slate-600" />
              </div>
              
              {/* Header text */}
              <h3 className="text-xl font-bold text-slate-700">
                {header || tenant?.name || 'Network Access'}
              </h3>
              
              {/* WiFi status icon with pulse animation */}
              <div className="relative">
                <Wifi className="h-5 w-5 text-green-500" />
                <motion.div
                  className="absolute inset-0 rounded-full bg-green-400 -z-10"
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.7, 0, 0.7]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "loop"
                  }}
                />
              </div>
            </div>
            
            <div className="mt-2 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-slate-500 mr-2" />
              <span className="text-slate-600 font-medium">Network Location</span>
            </div>
          </div>

          {/* Always visible location selection buttons */}
          <CardContent className="p-4 pt-0">
            {isLoading || !tenantId ? (
              <div className="flex justify-center gap-4 py-3">
                <div className="animate-pulse h-12 w-full bg-slate-200 rounded-lg"></div>
                <div className="animate-pulse h-12 w-full bg-slate-200 rounded-lg"></div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4">
                {locations?.map(({ key, value }) => (
                  <motion.div
                    key={key}
                    whileTap={{ scale: 0.97 }}
                    className={`
                      flex-1 flex items-center justify-center p-3 rounded-lg cursor-pointer
                      transition-all duration-200 ease-in-out
                      ${selected === key 
                        ? "text-white font-medium shadow-sm" 
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"}
                    `}
                    style={{
                      backgroundColor: selected === key ? primaryColor : undefined,
                    }}
                    onClick={() => handleSelect(key)}
                  >
                    <p className="text-center font-medium">{value}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>

          {/* Subtle divider */}
          <div 
            className="h-1" 
            style={{
              background: `linear-gradient(to right, ${primaryColor}20, ${primaryColor}40, ${primaryColor}20)`
            }}
          />
        </Card>
      </motion.div>
    </div>
  );
}