/* eslint-disable @typescript-eslint/no-explicit-any */
import { openDB, IDBPDatabase } from 'idb';
const isBrowser = typeof window !== "undefined";

let dbPromise: Promise<IDBPDatabase<any>> | null = null;

if (isBrowser) {
  dbPromise = openDB('appDB', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('store')) {
        db.createObjectStore('store');
      }
    },
  });
}

export function shouldCache(key: string) {
  // Don't cache voucher-related data
  if (key.includes('/vouchers/')) {
    return false;
  }
  return true;
}

export async function saveData(key: string, value: any, expirationMinutes = 5) {
  if (!dbPromise || !shouldCache(key)) return;
  const db = await dbPromise;
  
  // Add expiration timestamp
  const data = {
    value,
    expiration: Date.now() + (expirationMinutes * 60 * 1000)
  };
  
  await db.put('store', data, key);
}

export async function getData(key: string) {
  if (!dbPromise) return null;
  const db = await dbPromise;
  const data = await db.get('store', key);
  
  // Check if data exists and is not expired
  if (data && data.expiration && data.expiration > Date.now()) {
    return data.value;
  } else if (data) {
    // Data is expired, delete it
    await db.delete('store', key);
  }
  
  return null;
}

// Add this function to invalidate specific cache entries
export async function invalidateCache(key: string) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.delete('store', key);
}

// Add this function to clear all cache
export async function clearCache() {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.clear('store');
}
