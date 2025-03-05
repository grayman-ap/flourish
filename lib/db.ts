/* eslint-disable @typescript-eslint/no-explicit-any */
import { set, ref, get, child, push } from "firebase/database";
import { database } from "./firebase";
import { SubscriptionCardType } from "@/app/page";
import { useNetworkApi } from "@/app/network.store";
import { useEffect, useState } from "react";

export async function fetchSubPlans(location: string){
  try{
    const dbRef = ref(database)
    const snap_shot = await get(child(dbRef, `${location}/plans`));

    if(snap_shot.exists()){
      console.log("Data", snap_shot.val())
    }else{
      console.log("No data available")
    }
  }catch(error){
    console.log("Error fetching data plans:", error)
  }
}

export async function addVouchers(category: string, capacity: string, bundle: number, voucherCodes: string[], location: string) {
  try {
    const dbRef = ref(database, `${location}/vouchers/${category}/${capacity}/${bundle}`);
    
    // 🔹 Prepare all database write operations
    const uploadPromises = voucherCodes.map(async (code) => {
      const newVoucherRef = push(dbRef); // Auto-generate ID
      return set(newVoucherRef, code); // Save voucher code under generated ID
    });

    // 🔹 Wait for all writes to complete
    await Promise.all(uploadPromises);
    alert(`New ${bundle}${capacity} voucher added to ${location}`)
    console.log(`${voucherCodes.length} vouchers added successfully!`);
  } catch (error) {
    console.error("Error adding vouchers:", error);
  }
}

export async function addPlans(plans: SubscriptionCardType[], location: string) {
  try {
    const dbRef = ref(database, `${location}/plans`); // Reference to "plans" node

    const uploadPromises = plans.map(async (plan) => {
      const newPlanRef = push(dbRef); // Auto-generate ID
      return set(newPlanRef, plan); // Save the plan data
    });

    await Promise.all(uploadPromises);
    alert(`New plan added to ${location}`)
  } catch (error) {
    console.error("Error adding plans:", error);
  }
}


export function useFetchVouchers() {
  const [exists, setExist] = useState<boolean>(false);
  const { payload } = useNetworkApi(); // Fetches the user's plan details

  useEffect(() => {
    if (!payload?.category || !payload?.plan?.capacity || !payload?.plan?.data_bundle) {
      setExist(false); // Ensure exists is false if payload is incomplete
      return;
    }

    const fetchVouchers = async () => {
      try {
        const dbPath = `${payload.network_location}/vouchers/${payload.category}/${payload.plan.capacity}/${payload.plan.data_bundle}`;
        const dbRef = ref(database, dbPath);

        console.log("Fetching voucher at path:", dbPath);

        const snapshot = await get(dbRef);
        setExist(snapshot.exists()); // Set true if exists, otherwise false

        if (snapshot.exists()) {
          console.log("Voucher found:", snapshot.val());
        } else {
          console.log("No voucher found.");
        }
      } catch (error) {
        console.error("Error fetching voucher:", error);
      }
    };

    fetchVouchers();
  }, [payload]); // Re-run only when `payload` changes

  return { exists };
}

export async function getRandomVoucherAndDelete(category: string, capacity: string, bundle?: number, location?: string) {
  try {
    const dbRef = ref(database, `${location}/vouchers/${category}/${capacity}/${bundle}`);
    const snapshot = await get(dbRef);

    if (snapshot.exists()) {
      const vouchers = snapshot.val();

      // Convert object to array of key-value pairs
      const voucherKeys = Object.keys(vouchers);

      if (voucherKeys.length === 0) {
        console.log("No vouchers available.");
        return null;
      }

      // 🔹 Select a random voucher
      const randomIndex = Math.floor(Math.random() * voucherKeys.length);
      const randomKey = voucherKeys[randomIndex];
      const selectedVoucher = vouchers[randomKey];

      // 🔹 Remove the selected voucher from the database
      await set(ref(database, `${location}/vouchers/${category}/${capacity}/${bundle}/${randomKey}`), null);

      console.log("Selected Voucher:", selectedVoucher);
      return selectedVoucher;
    } else {
      console.log("No data available.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching voucher:", error);
  }
}