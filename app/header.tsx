import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useNetworkApi } from "./network.store";
import { useQuery } from "@tanstack/react-query";
import { fetchLocation } from "@/lib/db";
import { NetworkLocation } from "@/lib/types";
import React from "react";

export const AppHeader = ({ header }: { header?: string }) => {
  const { payload, setNetworkPayload } = useNetworkApi();
  const [selected, setSelected] = React.useState<string>("alheri-network");
  const { data: locations } = useQuery<NetworkLocation[]>({
    queryKey: ["locations"],
    queryFn: fetchLocation,
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 10
  });

  const handleSelect = React.useCallback(
    (key: string) => {
      setSelected((prev) => (prev !== key ? key : prev));
      setNetworkPayload("network_location", key);
    },
    [setNetworkPayload] // Remove selected from dependencies
  );

  return (
    <Card className="flex w-full border shadow-none rounded-sm px-2 bg-white">
      {header && (
        <CardHeader className="flex flex-row justify-between gap-4 p-0 items-center">
          <h3 className="text-center text-lg font-bold w-full">{header}</h3>
        </CardHeader>
      )}

      <CardContent className="space-y-4">
        <p className="font-[family-name:var(--font-din-semibold)] text-lg text-center">
          Select Location
        </p>
        <div className="px-2 flex flex-row items-center justify-center gap-6">
          {locations?.map(({ key, value }) => (
            <div
              key={key}
              className={`flex items-center justify-center w-3/6 p-5 rounded-sm px-2 border cursor-pointer transition-all duration-75 ease-linear ${
                selected === key ? "bg-black text-white" : "bg-gray-100"
              }`}
              onClick={() => handleSelect(key)}
            >
              <p className="font-[family-name:var(--font-din-normal)] text-center">
                {value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};