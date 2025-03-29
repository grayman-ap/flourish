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

export async function saveData(key: string, value: any) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.put('store', value, key);
}

export async function getData(key: string) {
  if (!dbPromise) return null;
  const db = await dbPromise;
  return await db.get('store', key);
}
