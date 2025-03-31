export interface NetworkLocation {
  key: string;
  value: string;
}

export interface Tenant {
  id: string;
  name: string;
  contactEmail: string;
  primaryColor: string;
  secondaryColor?: string;
  active: boolean;
  createdAt?: number;
  // Add any other properties you need
}

export interface VoucherPlan {
  id: string;
  name: string;
  description: string;
  duration: string; // "1d", "7d", "30d"
  bundle: string; // "standard", "premium"
  price: number;
  features: string[];
}

export interface TenantConfig {
  name: string;
  contactEmail: string;
  primaryColor: string;
  secondaryColor?: string;
  subdomain?: string;
  domain?: string;
  active?: boolean;
  termsAndConditions?: string;
}

export interface TenantContext {
  tenant: Tenant | null;
  isLoading: boolean;
  error: Error | null;
}

export interface TenantIdentifier {
  type: 'domain' | 'subdomain' | 'path';
  value: string;
}
