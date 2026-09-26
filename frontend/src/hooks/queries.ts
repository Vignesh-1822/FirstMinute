import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { api } from "@/services";
import type { StreamStatus } from "@/types";

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: api.getHealth,
    refetchInterval: 10_000,
    retry: false,
    staleTime: 5_000,
  });
}

export function useProtocols() {
  return useQuery({ queryKey: queryKeys.protocols, queryFn: api.getProtocols, staleTime: Infinity, retry: 1 });
}

export function useScenarios() {
  return useQuery({ queryKey: queryKeys.scenarios, queryFn: api.getScenarios, staleTime: Infinity, retry: 1 });
}

export function useHospitals(streamStatus: StreamStatus) {
  return useQuery({
    queryKey: queryKeys.hospitals,
    queryFn: api.getHospitals,
    staleTime: 15_000,
    // SSE keeps this fresh; poll only as a fallback when the stream is down.
    refetchInterval: streamStatus === "open" ? false : 10_000,
    retry: 1,
  });
}

export function useCase(caseId: string | null, streamStatus: StreamStatus) {
  return useQuery({
    queryKey: queryKeys.case(caseId ?? "none"),
    queryFn: () => api.getCase(caseId ?? ""),
    enabled: caseId !== null,
    staleTime: Infinity,
    refetchInterval: streamStatus === "open" ? false : 2_500,
    retry: 1,
  });
}
