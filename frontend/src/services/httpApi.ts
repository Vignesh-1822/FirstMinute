import type {
  AnswerBody,
  Case,
  ConfirmBody,
  CreateCase,
  FirstMinuteApi,
  Health,
  HospitalStatus,
  InboundMessage,
  InboundResult,
  Protocol,
  Scenario,
  ServerEvent,
  TranscriptBody,
} from "@/types";
import { apiConfig } from "./config";
import { apiFetch, postJson } from "./http";

function parseServerEvent(raw: string): ServerEvent | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) return null;
    const candidate = parsed as { type: unknown };
    if (candidate.type === "case.updated" || candidate.type === "hospitals.updated") {
      return parsed as ServerEvent;
    }
    return null;
  } catch {
    return null;
  }
}

const casePath = (caseId: string) => `/api/cases/${encodeURIComponent(caseId)}`;

export const httpApi: FirstMinuteApi = {
  getHealth: () => apiFetch<Health>("/api/health"),
  getProtocols: () => apiFetch<Protocol[]>("/api/protocols"),
  getScenarios: () => apiFetch<Scenario[]>("/api/scenarios"),
  createCase: (body: CreateCase) => postJson<Case, CreateCase>("/api/cases", body),
  listCases: () => apiFetch<Case[]>("/api/cases"),
  getCase: (caseId) => apiFetch<Case>(casePath(caseId)),
  postTranscript: (caseId, body) => postJson<Case, TranscriptBody>(`${casePath(caseId)}/transcript`, body),
  postAnswer: (caseId, body) => postJson<Case, AnswerBody>(`${casePath(caseId)}/answers`, body),
  routeCase: (caseId) => apiFetch<Case>(`${casePath(caseId)}/route`, { method: "POST" }),
  confirmCase: (caseId, body) => postJson<Case, ConfirmBody>(`${casePath(caseId)}/confirm`, body),
  getHospitals: () => apiFetch<HospitalStatus[]>("/api/hospitals"),
  refreshHospitals: () => apiFetch<HospitalStatus[]>("/api/hospitals/refresh", { method: "POST" }),
  postInbound: (body) => postJson<InboundResult, InboundMessage>("/api/photon/inbound", body),

  subscribeEvents: ({ onEvent, onStatus }) => {
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      onStatus("connecting");
      source = new EventSource(`${apiConfig.baseUrl}/api/events`);
      source.onopen = () => onStatus("open");
      source.onmessage = (message: MessageEvent<string>) => {
        const event = parseServerEvent(message.data);
        if (event) onEvent(event);
      };
      source.onerror = () => {
        onStatus("error");
        source?.close();
        source = null;
        retryTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
    };
  },
};
