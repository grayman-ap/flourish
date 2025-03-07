import { PlanTab } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const getPeriodLabel = (duration: number): [string, PlanTab] => {
    if (duration <= 1) return ["Day", "daily"];
    if (duration <= 5) return ["Days", "daily"];
    if (duration === 24) return ["Hours", "hourly"];
    if (duration === 7) return ["Days", "weekly"];
    return ["Days", "monthly"];
  };
  

  export const parseToNaira = (value: number | any) =>
    Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(value);
  