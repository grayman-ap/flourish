import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { fetchLocation } from "@/lib/db";
import { NetworkLocation } from "@/lib/types";
import React, { useState, useEffect } from "react";
import { useNetworkApi } from "@/app/network.store";
import { motion } from "framer-motion";
import { MapPin, User, Wifi } from "lucide-react";

export const MobileAppHeader = ({ header }: { header?: string }) => {
  const { payload, setNetworkPayload } = useNetworkApi();
  const [selected, setSelected] = useState<string>("");
  const { data: locations, isLoading } = useQuery<NetworkLocation[]>({
    queryKey: ["locations"],
    queryFn: fetchLocation,
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 10
  });

  // Initialize selected location from localStorage or default to first location
  useEffect(() => {
    const savedLocation = localStorage.getItem("network_location");
    if (savedLocation) {
      setSelected(savedLocation);
    } else if (locations && locations.length > 0) {
      setSelected(locations[0].key);
      setNetworkPayload("network_location", locations[0].key);
      localStorage.setItem("network_location", locations[0].key);
    }
  }, [locations, setNetworkPayload]);

  const handleSelect = React.useCallback(
    (key: string) => {
      setSelected(key);
      setNetworkPayload("network_location", key);
      localStorage.setItem("network_location", key);
    },
    [setNetworkPayload]
  );

  return (
    <motion.div
    initial={{ y: -10 }}  // Only animate position, not opacity
    animate={{ y: 0 }}
    transition={{ duration: 0.3 }}
    className="w-full"
  >
      <Card className="border-0 shadow-md rounded-none overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700">
        {/* Top section with header */}
        <div className="px-4 pt-4 pb-2">
          {/* Header with user and wifi icons */}
          <div className="flex items-center justify-between mb-3">
            {/* User icon */}
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="h-4 w-4 text-slate-600" />
            </div>
            
            {/* Header text */}
            {header && (
              <h3 className="text-xl font-bold text-white">{header}</h3>
            )}
            
            {/* WiFi status icon with pulse animation */}
            <div className="relative">
              <Wifi className="h-5 w-5 text-white animate-pulse" />
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
            <MapPin className="h-5 w-5 text-white mr-2" />
            <span className="text-white font-medium">Network Location</span>
          </div>
        </div>

        {/* Always visible location selection buttons */}
        <CardContent className="p-4 pt-0">
          {isLoading ? (
            <div className="flex justify-center gap-4 py-3">
              <div className="animate-pulse h-12 w-full bg-white/20 rounded-lg"></div>
              <div className="animate-pulse h-12 w-full bg-white/20 rounded-lg"></div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4">
              {locations?.map(({ key, value }) => (
                <motion.div
                  key={key}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    flex-1 flex items-center justify-center p-3 rounded-lg cursor-pointer
                    transition-all duration-200 ease-in-out
                    ${selected === key 
                      ? "bg-white text-blue-700 font-medium shadow-lg transform scale-105" 
                      : "bg-white/10 text-white hover:bg-white/20"}
                  `}
                  onClick={() => handleSelect(key)}
                >
                  <p className="text-center font-medium  text-[0.94rem] md:text-md font-[family-name:var(--font-din-bold)]">{value}</p>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Bottom curved decoration */}
        <div className="h-3 bg-white rounded-b-full -mb-1"></div>
      </Card>
    </motion.div>
  );
};