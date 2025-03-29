/* eslint-disable @typescript-eslint/no-explicit-any */
import { set, ref, get, push, onValue } from "firebase/database";
import { database } from "./firebase";
import { NetworkLocation, SubscriptionCardType } from "./types";
import { getData, saveData } from "@/lib/indexDB";
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
    const uploadPromises = voucherCodes.map(async (code) => {
      const newVoucherRef = push(dbRef);
      return set(newVoucherRef, code);
    });
    await Promise.all(uploadPromises);
    alert(`New ${bundle}${capacity} voucher added to ${location}`);
  } catch (error) {
    alert(`Error adding vouchers: ${error}`);
  }
}

/**
 * Adds subscription plans to Firebase.
 */
export async function addPlans(plans: SubscriptionCardType[], location: string) {
  try {
    const dbRef = ref(database, `${location}/plans`);
    const uploadPromises = plans.map(async (plan) => {
      const newPlanRef = push(dbRef);
      return set(newPlanRef, plan);
    });
    await Promise.all(uploadPromises);
    alert(`New plan added to ${location}`);
  } catch (error) {
    alert(`Error adding plans: ${error}`);
  }
}

/**
 * Fetches vouchers using TanStack Query with caching and offline support.
 */
export const useFetchVouchers = (location: string, category: string, capacity: string, bundle: number | any) => {
  const dbPath = `${location}/vouchers/${category}/${capacity}/${bundle}`;

  return useQuery({
    queryKey: ["vouchers", location, category, capacity, bundle],
    queryFn: async () => {
      // First, check if cached data is available immediately
      const cachedData = await getData(dbPath);
      if (cachedData) return cachedData;

      try {
        // Fetch from Firebase
        const dbRef = ref(database, dbPath);
        const snapshot = await get(dbRef);
        if (!snapshot.exists()) {
          return null;
        }

        const data = snapshot.val();
        await saveData(dbPath, data); // Save data locally
        return data;
      } catch (error) {
        console.error("Firebase fetch failed:", error);

        // If fetching fails (e.g., no internet), return last cached version
        const fallbackData = await getData(dbPath);
        if (fallbackData) return fallbackData;

        throw new Error("No data available");
      }
    }
  });
};
/**
 * Fetches and deletes a random voucher from Firebase.
 */
export async function getRandomVoucherAndDelete(category: string, capacity: string, bundle?: number, location?: string) {
  try {
    const dbPath = `${location}/vouchers/${category}/${capacity}/${bundle}`;
    let vouchers = await getData(dbPath);
    if (!vouchers) {
      const dbRef = ref(database, dbPath);
      const snapshot = await get(dbRef);
      if (!snapshot.exists()) return null;
      vouchers = snapshot.val();
      await saveData(dbPath, vouchers);
    }
    const voucherKeys = Object.keys(vouchers);
    if (voucherKeys.length === 0) return null;
    const randomKey = voucherKeys[Math.floor(Math.random() * voucherKeys.length)];
    const selectedVoucher = vouchers[randomKey];
    delete vouchers[randomKey];
    await saveData(dbPath, vouchers);
    await set(ref(database, `${dbPath}/${randomKey}`), null);
    return selectedVoucher;
  } catch (error) {
    console.error("Error fetching voucher:", error);
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
      const dbPath =  `${networkLocation}/plans`;
      const cachedData = await getData(dbPath);
      if (cachedData) return cachedData;
      const subPlansRef = ref(database, dbPath);
      const snapshot = await get(subPlansRef);
      
      if (!snapshot.exists()) return [];
      
      const plansArray: SubscriptionCardType[] = [];
      snapshot.forEach((childSnapshot) => {
        plansArray.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });

      console.log("Array", plansArray)
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
    const subPlansRef = ref(database, 'duration');
    onValue(subPlansRef, (snapshot) => {
      resolve(snapshot.exists() ? Object.values(snapshot.val()) : []);
    }, reject);
  });
};

export const fetchLocation = async ():Promise<NetworkLocation[]> => {
  return new Promise(async (resolve, reject) => {
    const dbPath =  'network_location';
    const cachedData = await getData(dbPath);
    if (cachedData) return cachedData;
    const subPlansRef = ref(database, dbPath);
      onValue(subPlansRef, (snapshot) => {
        if (snapshot.exists()) {
          return resolve(Object.values(snapshot.val()));
        }
      }, reject);
  });
};