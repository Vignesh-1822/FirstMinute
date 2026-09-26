import type {
  AnswerBody,
  Case,
  ConfirmBody,
  CreateCase,
  Health,
  HospitalStatus,
  InboundMessage,
  InboundResult,
  Protocol,
  Scenario,
  ServerEvent,
  TranscriptBody,
} from "./api";

export type StreamStatus = "connecting" | "open" | "error";

export interface EventStreamHandlers {
  onEvent: (event: ServerEvent) => void;
  onStatus: (status: StreamStatus) => void;
}

/** Every backend call the UI makes. Implemented by the HTTP client and the in-browser mock. */
export interface FirstMinuteApi {
  getHealth: () => Promise<Health>;
  getProtocols: () => Promise<Protocol[]>;
  getScenarios: () => Promise<Scenario[]>;
  createCase: (body: CreateCase) => Promise<Case>;
  listCases: () => Promise<Case[]>;
  getCase: (caseId: string) => Promise<Case>;
  postTranscript: (caseId: string, body: TranscriptBody) => Promise<Case>;
  postAnswer: (caseId: string, body: AnswerBody) => Promise<Case>;
  routeCase: (caseId: string) => Promise<Case>;
  confirmCase: (caseId: string, body: ConfirmBody) => Promise<Case>;
  getHospitals: () => Promise<HospitalStatus[]>;
  refreshHospitals: () => Promise<HospitalStatus[]>;
  postInbound: (body: InboundMessage) => Promise<InboundResult>;
  subscribeEvents: (handlers: EventStreamHandlers) => () => void;
  /** Mock-only affordance so the reroute can be demoed without the portal. */
  setHospitalFlag?: (
    hospitalId: string,
    patch: Partial<Pick<HospitalStatus, "ed_status" | "ct_available" | "neuro_ir_available">>,
  ) => Promise<HospitalStatus[]>;
}

export interface ApiConfig {
  baseUrl: string;
  useMocks: boolean;
  portalUrl: string;
}
