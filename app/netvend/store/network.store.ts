import { create } from 'zustand';

interface NetworkPayload {
  [key: string]: string;
}

interface NetworkStore {
  payload: NetworkPayload;
  voucher: string;
  tenantId: string | null;  // Add tenantId to the store
  setNetworkPayload: (key: string, value: string) => void;
  setVoucher: (voucher: string) => void;
  setTenantId: (id: string) => void;  // Add the missing method
}

export const useNetvendNetwork = create<NetworkStore>((set, get) => ({
  payload: {},
  voucher: '',
  tenantId: null,  // Initialize tenantId as null
  
  setNetworkPayload: (key: string, value: string) => {
    const { payload } = get();
    
    // Update the state
    set({
      payload: {
        ...payload,
        [key]: value
      }
    });
  },
  
  setVoucher: (voucher: string) => set({ voucher }),
  
  // Add the missing setTenantId method
  setTenantId: (id: string) => set({ tenantId: id })
}));
