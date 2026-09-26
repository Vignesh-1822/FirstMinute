import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { isAtLeastAsFresh } from "@/lib/caseFreshness";
import { queryKeys } from "@/lib/queryKeys";
import { api } from "@/services";
import type { Case, HospitalStatus, StreamStatus } from "@/types";

interface EventStreamCallbacks {
  onCaseUpdated?: (incoming: Case) => void;
  onHospitalsUpdated?: (hospitals: HospitalStatus[], previous: HospitalStatus[] | undefined) => void;
}

/**
 * Subscribes to /api/events (SSE) and writes every payload straight into the
 * React Query cache: case.updated -> ['case', id], hospitals.updated -> ['hospitals'].
 */
export function useEventStream(callbacks: EventStreamCallbacks = {}): StreamStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    return api.subscribeEvents({
      onStatus: setStatus,
      onEvent: (event) => {
        if (event.type === "case.updated") {
          queryClient.setQueryData<Case>(queryKeys.case(event.case.id), (current) =>
            isAtLeastAsFresh(event.case, current) ? event.case : current,
          );
          callbacksRef.current.onCaseUpdated?.(event.case);
        } else {
          const previous = queryClient.getQueryData<HospitalStatus[]>(queryKeys.hospitals);
          queryClient.setQueryData<HospitalStatus[]>(queryKeys.hospitals, event.hospitals);
          callbacksRef.current.onHospitalsUpdated?.(event.hospitals, previous);
        }
      },
    });
  }, [queryClient]);

  return status;
}
