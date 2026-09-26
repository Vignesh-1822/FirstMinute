import type { ApiConfig } from "@/types";

const rawBaseUrl: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const apiConfig: ApiConfig = {
  baseUrl: rawBaseUrl.replace(/\/+$/, ""),
  useMocks: import.meta.env.VITE_USE_MOCKS === "true",
  portalUrl: `${rawBaseUrl.replace(/\/+$/, "")}/portal`,
};
