import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { isAtLeastAsFresh } from "@/lib/caseFreshness";
import { queryKeys } from "@/lib/queryKeys";
import { api } from "@/services";
import type {
  Case,
  HospitalStatus,
  InputSource,
  Point,
  ProtocolId,
  Scenario,
  TranscriptState,
} from "@/types";
import { useCase } from "./queries";
import { useEventStream } from "./useEventStream";
import { useScenarioPlayer } from "./useScenarioPlayer";
import { useSpeechRecognition } from "./useSpeechRecognition";

const UNIT_ID = "M-14";
const MEDIC_SENDER = "Medic 14";
const DEFAULT_UNIT_POSITION: Point = { x: 7, y: 8 };
const TRANSCRIPT_THROTTLE_MS = 250;

const joinText = (...parts: string[]) => parts.map((part) => part.trim()).filter(Boolean).join(" ");

function statusSignature(hospitals: HospitalStatus[] | undefined): string {
  return (hospitals ?? [])
    .map((hospital) => `${hospital.id}:${hospital.ed_status}:${hospital.ct_available}:${hospital.neuro_ir_available}`)
    .join("|");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

/**
 * Console orchestration: owns the current case, funnels scenario playback,
 * microphone and typed input into one throttled transcript pipeline, and runs
 * the auto-flow (final transcript + no follow-ups -> /route).
 */
export function useConsoleSession() {
  const queryClient = useQueryClient();

  const [protocolId, setProtocolId] = useState<ProtocolId>("stroke_race");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptState>({ committed: "", live: "" });
  const [inputSource, setInputSource] = useState<InputSource>("idle");
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSendingMedic, setIsSendingMedic] = useState(false);
  const [finalized, setFinalized] = useState(false);

  const caseIdRef = useRef<string | null>(null);
  const creatingRef = useRef<Promise<string> | null>(null);
  const protocolRef = useRef<ProtocolId>(protocolId);
  const unitPositionRef = useRef<Point>(DEFAULT_UNIT_POSITION);
  const latestTextRef = useRef("");
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef<TranscriptState>(transcript);
  const routedForRef = useRef<string | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  useEffect(() => {
    protocolRef.current = protocolId;
  }, [protocolId]);

  /* ----------------------------- cache helpers ---------------------------- */

  const writeCase = useCallback(
    (incoming: Case) => {
      queryClient.setQueryData<Case>(queryKeys.case(incoming.id), (current) =>
        isAtLeastAsFresh(incoming, current) ? incoming : current,
      );
    },
    [queryClient],
  );

  const adoptCase = useCallback((id: string) => {
    caseIdRef.current = id;
    setCaseId(id);
  }, []);

  const ensureCase = useCallback(async (): Promise<string> => {
    if (caseIdRef.current) return caseIdRef.current;
    if (creatingRef.current) return creatingRef.current;
    const generation = generationRef.current;
    const creation = api
      .createCase({
        protocol_id: protocolRef.current,
        source: "console",
        unit_id: UNIT_ID,
        unit_position: protocolRef.current === "stroke_race" ? unitPositionRef.current : undefined,
      })
      .then((created) => {
        if (generation === generationRef.current) {
          writeCase(created);
          adoptCase(created.id);
        }
        return created.id;
      })
      .finally(() => {
        creatingRef.current = null;
      });
    creatingRef.current = creation;
    return creation;
  }, [adoptCase, writeCase]);

  /* -------------------------- transcript pipeline -------------------------- */

  const postTranscript = useCallback(
    async (text: string, isFinal: boolean) => {
      if (!text.trim()) return;
      const generation = generationRef.current;
      try {
        const id = await ensureCase();
        const updated = await api.postTranscript(id, { transcript: text, is_final: isFinal });
        if (generation !== generationRef.current) return;
        writeCase(updated);
        setSyncError(null);
      } catch (error) {
        if (generation === generationRef.current) setSyncError(errorMessage(error));
      }
    },
    [ensureCase, writeCase],
  );

  const queueTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      latestTextRef.current = text;
      if (isFinal) {
        if (throttleRef.current) clearTimeout(throttleRef.current);
        throttleRef.current = null;
        setFinalized(true);
        void postTranscript(text, true);
        return;
      }
      setFinalized(false);
      if (throttleRef.current) return;
      throttleRef.current = setTimeout(() => {
        throttleRef.current = null;
        void postTranscript(latestTextRef.current, false);
      }, TRANSCRIPT_THROTTLE_MS);
    },
    [postTranscript],
  );

  /* ------------------------------ input sources ----------------------------- */

  const player = useScenarioPlayer({
    onProgress: (text) => {
      setTranscript({ committed: "", live: text });
      queueTranscript(text, false);
    },
    onDone: (text) => {
      setTranscript({ committed: text, live: "" });
      queueTranscript(text, true);
    },
  });

  const speech = useSpeechRecognition({
    onInterim: (interim) => {
      const next = { committed: transcriptRef.current.committed, live: interim };
      transcriptRef.current = next;
      setTranscript(next);
      const full = joinText(next.committed, next.live);
      if (full) queueTranscript(full, false);
    },
    onFinal: (finalText) => {
      const next = { committed: joinText(transcriptRef.current.committed, finalText), live: "" };
      transcriptRef.current = next;
      setTranscript(next);
      queueTranscript(next.committed, false);
    },
    onEnd: () => {
      const full = joinText(transcriptRef.current.committed, transcriptRef.current.live);
      const next = { committed: full, live: "" };
      transcriptRef.current = next;
      setTranscript(next);
      setInputSource((source) => (source === "mic" ? "idle" : source));
      if (full) queueTranscript(full, true);
    },
  });

  const { stop: stopPlayer, pause: pausePlayer, play: playTranscript, state: playerState } = player;
  const { stop: stopSpeech, start: startSpeech } = speech;

  /* ---------------------------------- reset --------------------------------- */

  const resetState = useCallback(
    (nextProtocol: ProtocolId) => {
      generationRef.current += 1;
      stopPlayer();
      stopSpeech();
      if (throttleRef.current) clearTimeout(throttleRef.current);
      throttleRef.current = null;
      caseIdRef.current = null;
      creatingRef.current = null;
      routedForRef.current = null;
      latestTextRef.current = "";
      transcriptRef.current = { committed: "", live: "" };
      unitPositionRef.current = DEFAULT_UNIT_POSITION;
      protocolRef.current = nextProtocol;
      setProtocolId(nextProtocol);
      setCaseId(null);
      setTranscript({ committed: "", live: "" });
      setInputSource("idle");
      setActiveScenario(null);
      setSyncError(null);
      setFinalized(false);
    },
    [stopPlayer, stopSpeech],
  );

  const newCase = useCallback(() => resetState(protocolRef.current), [resetState]);

  const changeProtocol = useCallback(
    (next: ProtocolId) => {
      if (next === protocolRef.current && !caseIdRef.current) return;
      resetState(next);
    },
    [resetState],
  );

  const playScenario = useCallback(
    (scenario: Scenario) => {
      const nextProtocol: ProtocolId = scenario.protocol_id === "medevac_9line" ? "medevac_9line" : "stroke_race";
      resetState(nextProtocol);
      unitPositionRef.current = scenario.unit_position ?? DEFAULT_UNIT_POSITION;
      setActiveScenario(scenario);
      setInputSource("scenario");
      void ensureCase().catch((error: unknown) => setSyncError(errorMessage(error)));
      playTranscript(scenario.transcript);
    },
    [ensureCase, playTranscript, resetState],
  );

  const startMic = useCallback(() => {
    if (playerState === "playing") pausePlayer();
    setInputSource("mic");
    startSpeech();
  }, [pausePlayer, playerState, startSpeech]);

  const submitTyped = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const next = { committed: joinText(transcriptRef.current.committed, transcriptRef.current.live, trimmed), live: "" };
      transcriptRef.current = next;
      setTranscript(next);
      setInputSource("typed");
      queueTranscript(next.committed, true);
    },
    [queueTranscript],
  );

  /* ------------------------------ case actions ------------------------------ */

  const answerFollowUp = useCallback(
    async (itemId: string, text: string) => {
      const id = caseIdRef.current;
      if (!id || !text.trim()) return;
      setPendingAnswer(itemId);
      try {
        const updated = await api.postAnswer(id, { item_id: itemId, text: text.trim() });
        writeCase(updated);
        const next = { committed: updated.transcript, live: "" };
        transcriptRef.current = next;
        setTranscript(next);
        setFinalized(true);
      } catch (error) {
        toast.error("Answer not saved", { description: errorMessage(error) });
      } finally {
        setPendingAnswer(null);
      }
    },
    [writeCase],
  );

  const requestRoute = useCallback(async () => {
    const id = caseIdRef.current;
    if (!id) return;
    setIsRouting(true);
    try {
      writeCase(await api.routeCase(id));
    } catch (error) {
      toast.error("Routing failed", { description: errorMessage(error) });
    } finally {
      setIsRouting(false);
    }
  }, [writeCase]);

  const confirm = useCallback(
    async (hospitalId?: string) => {
      const id = caseIdRef.current;
      if (!id) return;
      setIsConfirming(true);
      try {
        writeCase(await api.confirmCase(id, hospitalId ? { hospital_id: hospitalId } : {}));
      } catch (error) {
        toast.error("Pre-alert not sent", { description: errorMessage(error) });
      } finally {
        setIsConfirming(false);
      }
    },
    [writeCase],
  );

  const sendMedicMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setIsSendingMedic(true);
      try {
        const result = await api.postInbound({ sender: MEDIC_SENDER, text: trimmed, simulated: true });
        const fresh = await api.getCase(result.case_id);
        writeCase(fresh);
        if (result.case_id !== caseIdRef.current) {
          generationRef.current += 1;
          stopPlayer();
          const nextProtocol: ProtocolId = fresh.protocol_id === "medevac_9line" ? "medevac_9line" : "stroke_race";
          protocolRef.current = nextProtocol;
          setProtocolId(nextProtocol);
          setActiveScenario(null);
          setInputSource("idle");
          setFinalized(false);
          adoptCase(result.case_id);
        }
        const next = { committed: fresh.transcript, live: "" };
        transcriptRef.current = next;
        setTranscript(next);
      } catch (error) {
        toast.error("Message not delivered", { description: errorMessage(error) });
      } finally {
        setIsSendingMedic(false);
      }
    },
    [adoptCase, stopPlayer, writeCase],
  );

  /* ------------------------------ live updates ------------------------------ */

  const streamStatus = useEventStream({
    onCaseUpdated: (incoming) => {
      if (incoming.source !== "photon" || incoming.id === caseIdRef.current) {
        if (incoming.id === caseIdRef.current && incoming.source === "photon") {
          const next = { committed: incoming.transcript, live: "" };
          transcriptRef.current = next;
          setTranscript(next);
        }
        return;
      }
      if (!caseIdRef.current) {
        adoptCase(incoming.id);
        const next = { committed: incoming.transcript, live: "" };
        transcriptRef.current = next;
        setTranscript(next);
        return;
      }
      const latestMedic = incoming.messages.filter((message) => message.role === "medic").at(-1);
      if (latestMedic && incoming.messages.length === 1) {
        toast("New iMessage case", {
          description: `${latestMedic.author}: ${latestMedic.text.slice(0, 80)}`,
          action: { label: "Open", onClick: () => adoptCase(incoming.id) },
        });
      }
    },
    onHospitalsUpdated: (hospitals, previous) => {
      if (statusSignature(hospitals) === statusSignature(previous)) return;
      const id = caseIdRef.current;
      if (!id) return;
      const current = queryClient.getQueryData<Case>(queryKeys.case(id));
      if (current?.status === "routed") void requestRoute();
    },
  });

  const caseQuery = useCase(caseId, streamStatus);
  const caseData = caseQuery.data;

  // Auto-flow: final transcript + assessment with no follow-ups -> /route (routing packs only).
  useEffect(() => {
    if (!caseData || !finalized || isRouting) return;
    if (caseData.protocol_id !== "stroke_race" || caseData.source !== "console") return;
    const assessment = caseData.assessment;
    if (!assessment || assessment.follow_ups.length > 0 || caseData.status === "alerted") return;
    if (routedForRef.current === assessment.computed_at) return;
    if (caseData.routing && caseData.status === "routed" && routedForRef.current === null) {
      routedForRef.current = assessment.computed_at;
      return;
    }
    routedForRef.current = assessment.computed_at;
    void requestRoute();
  }, [caseData, finalized, isRouting, requestRoute]);

  const fullTranscript = useMemo(() => joinText(transcript.committed, transcript.live), [transcript]);
  const displayTranscript =
    caseData?.source === "photon" ? caseData.transcript : fullTranscript || caseData?.transcript || "";

  const isStreaming = player.state === "playing" || speech.listening;

  return {
    protocolId,
    changeProtocol,
    caseId,
    caseData,
    caseQuery,
    streamStatus,
    transcript,
    displayTranscript,
    isStreaming,
    finalized,
    inputSource,
    activeScenario,
    player,
    playScenario,
    speech,
    startMic,
    stopMic: stopSpeech,
    submitTyped,
    answerFollowUp,
    pendingAnswer,
    requestRoute,
    isRouting,
    confirm,
    isConfirming,
    sendMedicMessage,
    isSendingMedic,
    newCase,
    syncError,
    medicSender: MEDIC_SENDER,
  };
}
