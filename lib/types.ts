export type PlanTab = "hourly" | "daily" | "weekly" | "monthly" | "yearly";

export interface SubscriptionCardType {
  id?: string,
  data_bundle: number;
  capacity: string;
  duration: number;
  price: number;
}

export interface VouchersType {
  id?: string,
  duration: string
  capacity: string,
  bundle: string
}
export interface NetworkLocation {
  key: string;
  value: string;
}

// Data Constants
export interface InitializeResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}