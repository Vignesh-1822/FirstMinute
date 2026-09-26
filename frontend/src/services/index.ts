import type { FirstMinuteApi } from "@/types";
import { httpApi } from "./httpApi";
import { mockApi } from "./mocks/mockApi";

/**
 * Single entry point for every backend call in the app.
 * Real HTTP by default; the in-browser simulation only when VITE_USE_MOCKS=true.
 */
export const api: FirstMinuteApi = import.meta.env.VITE_USE_MOCKS === "true" ? mockApi : httpApi;

export { apiConfig } from "./config";
export { ApiError, isNetworkError } from "./http";
