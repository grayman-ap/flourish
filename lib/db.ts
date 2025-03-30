/* eslint-disable @typescript-eslint/no-explicit-any */
import { set, ref, get, push, onValue } from "firebase/database";
import { database } from "./firebase";
import { NetworkLocation, SubscriptionCardType } from "./types";
import { useQuery } from "@tanstack/react-query";

/**
 * Adds vouchers to Firebase under the specified category and bundle.
 */
export async function addVouchers(
  category: string,
  capacity: string,
  bundle: number,
  voucherCodes: string[],
  location: string
) {
  try {
    const dbRef = ref(database, `${location}/vouchers/${category}/${capacity}/${bundle}`);
    await Promise.all(voucherCodes.map((code) => set(push(dbRef), code)));
    console.log(`New ${bundle}${capacity} voucher added to ${location}`);
  } catch (error) {
    console.error(`Error adding vouchers:`, error);
  }
}

/**
 * Adds subscription plans to Firebase.
 */
export async function addPlans(plans: SubscriptionCardType[], location: string) {
  try {
    const dbRef = ref(database, `${location}/plans`);
    await Promise.all(plans.map((plan) => set(push(dbRef), plan)));
    console.log(`New plan added to ${location}`);
  } catch (error) {
    console.error(`Error adding plans:`, error);
  }
}

// Function to fetch vouchers - separate from the hook
export const fetchVouchers = async (
  networkLocation?: string,
  category?: string,
  capacity?: string,
  dataBundle?: number
) => {
  if (!networkLocation || !category || !capacity || !dataBundle) {
    return [];
  }

  try {
    const dbPath = `${networkLocation}/vouchers/${category}/${capacity}/${dataBundle}`;
    const dbRef = ref(database, dbPath);
    
    const snapshot = await get(dbRef);
    
    if (snapshot.exists()) {
      // Convert the snapshot to an array of vouchers
      const vouchersData = snapshot.val();
      return Object.keys(vouchersData).map(key => ({
        id: key,
        ...vouchersData[key]
      }));
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    throw error;
  }
};

// React Query hook
export function useFetchVouchers(
  networkLocation?: string,
  category?: string,
  capacity?: string,
  dataBundle?: number
) {
  return useQuery({
    queryKey: ['vouchers', networkLocation, category, capacity, dataBundle],
    queryFn: () => fetchVouchers(networkLocation, category, capacity, dataBundle),
    enabled: !!networkLocation && !!category && !!capacity && !!dataBundle,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
  });
}

// Improved implementation with better error handling and logging
export async function getRandomVoucherAndDelete(category: string, capacity: string, bundle?: number, location?: string) {
  try {
    if (!category || !capacity || !bundle || !location) {
      console.error("Missing required parameters for getRandomVoucherAndDelete");
      return null;
    }
    
    const dbPath = `${location}/vouchers/${category}/${capacity}/${bundle}`;
    console.log(`Attempting to get and delete voucher from path: ${dbPath}`);
    
    // Always fetch fresh from Firebase
    const vouchersRef = ref(database, dbPath);
    const snapshot = await get(vouchersRef);
    
    if (!snapshot.exists()) {
      console.log("No vouchers found at path");
      return null;
    }
    
    const vouchers = snapshot.val();
    const voucherKeys = Object.keys(vouchers);
    
    if (voucherKeys.length === 0) {
      console.log("Vouchers object exists but is empty");
      return null;
    }
    
    console.log(`Found ${voucherKeys.length} vouchers`);
    
    // Select a random voucher
    const randomKey = voucherKeys[Math.floor(Math.random() * voucherKeys.length)];
    const selectedVoucher = vouchers[randomKey];
    
    if (!selectedVoucher) {
      console.error("Selected voucher is null or undefined");
      return null;
    }
    
    console.log(`Selected voucher: ${selectedVoucher} with key: ${randomKey}`);
    
    // Delete the voucher from Firebase
    const specificVoucherRef = ref(database, `${dbPath}/${randomKey}`);
    await set(specificVoucherRef, null);
    
    // Verify deletion
    const verifySnapshot = await get(specificVoucherRef);
    if (verifySnapshot.exists()) {
      console.error("Voucher deletion failed - voucher still exists");
      // Try one more time with a different approach
      await set(ref(database, `${dbPath}/${randomKey}`), null);
    } else {
      console.log("Voucher successfully deleted");
    }
    
    return selectedVoucher;
  } catch (error) {
    console.error("Error in getRandomVoucherAndDelete:", error);
    return null;
  }
}

/**
 * Fetches subscription plans based on network location.
 */
export const useSubscriptionPlans = (networkLocation: string) => {
  return useQuery<SubscriptionCardType[]>({
    queryKey: ['subscriptionPlans', networkLocation],
    queryFn: async () => {
      if (!networkLocation) return [];
      const dbPath = `${networkLocation}/plans`;
      
      // Directly fetch from Firebase, no caching
      const subPlansRef = ref(database, dbPath);
      const snapshot = await get(subPlansRef);
      
      if (!snapshot.exists()) return [];
      
      const plansArray: SubscriptionCardType[] = [];
      snapshot.forEach((childSnapshot) => {
        plansArray.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });

      console.log("Plans array:", plansArray);
      return plansArray;
    },
    gcTime: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 2,
    retry: 2
  });
};

/**
 * Fetches subscription plans using Firebase real-time updates.
 */
export const fetchSubPlans = async () => {
  return new Promise((resolve, reject) => {
    onValue(ref(database, 'duration'), (snapshot) => {
      resolve(snapshot.exists() ? Object.values(snapshot.val()) : []);
    }, reject);
  });
};

export const fetchLocation = async (): Promise<NetworkLocation[]> => {
  const dbPath = 'network_location';
  
  // Directly fetch from Firebase, no caching
  return new Promise((resolve, reject) => {
    onValue(ref(database, dbPath), (snapshot) => {
      resolve(snapshot.exists() ? Object.values(snapshot.val()) : []);
    }, reject);
  });
};

// Check if vouchers are available
export async function checkVouchersAvailability(
  location?: string,
  category?: string,
  capacity?: string,
  bundle?: number | string
): Promise<boolean> {
  if (!location || !category || !capacity || !bundle) return false;
  try {
    const dbPath = `${location}/vouchers/${category}/${capacity}/${bundle}`;
    console.log("Checking vouchers availability at path:", dbPath);
    
    // Always fetch from Firebase, no caching
    const snapshot = await get(ref(database, dbPath));
    const vouchers = snapshot.val();
    
    return vouchers ? Object.keys(vouchers).length > 0 : false;
  } catch (error) {
    console.error("Error checking vouchers availability:", error);
    return false;
  }
}
