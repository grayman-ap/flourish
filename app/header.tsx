import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { database } from "@/lib/firebase";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@/components/ui/select";
import { ref, onValue } from "firebase/database";
import { useState, useEffect } from "react";
import { useNetworkApi } from "./network.store";
import { NetworkLocation } from "@/lib/types";

export const AppHeader = ({header}: {header?: string}) => {
    const { payload, setNetworkPayload } = useNetworkApi();
    const [locations, setLocations] = useState<NetworkLocation[]>([])
    useEffect(() => {
      const subPlansRef = ref(database, 'network_location');
  
      onValue(subPlansRef, (snapshot) => {
        if (snapshot.exists()) {
          setLocations(Object.values(snapshot.val()));
        } else {
          setLocations([]);
        }
      });
       }, []);
   
    return (
      <Card className="flex w-full border shadow-none rounded-sm px-2 bg-white">
        {header && <CardHeader className="flex flex-row justify-between gap-4 p-0 items-center">
          <h3 className="text-center text-lg font-bold py-4 w-full">{header}</h3>
        </CardHeader>}
  
        <CardContent className="px-2">
          <Select value={payload.network_location} onValueChange={(value) => {
            setNetworkPayload("network_location", value)
            console.log(value)
          }}>
            <SelectTrigger className="cursor-pointer bg-white">
              <SelectValue placeholder="Select network location" />
            </SelectTrigger>
            <SelectContent className="">
              <SelectGroup>
                {locations.map(({ key, value }) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    );
  };