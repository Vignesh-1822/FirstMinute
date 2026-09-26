/**
 * Backend contract — copied verbatim from docs/SPEC.md ("Types").
 * Keep in sync with backend Pydantic models. snake_case on purpose.
 */

export type Mode = "live" | "simulated";
export interface Health {
  status: "ok";
  modes: { jev: Mode; gmi: Mode; browser: "browserbase" | "direct"; photon: Mode };
}

export interface ProtocolItem {
  id: string;
  label: string;
  kind: "score" | "choice";
  levels: string[];
  follow_up: string;
}
export interface Protocol {
  id: "stroke_race" | "medevac_9line";
  name: string;
  short: string;
  description: string;
  max_score: number | null;
  has_routing: boolean;
  items: ProtocolItem[];
}
export type ProtocolId = Protocol["id"];

export interface Point {
  x: number;
  y: number;
}

export interface Scenario {
  id: string;
  protocol_id: string;
  title: string;
  subtitle: string;
  transcript: string;
  unit_position: Point | null;
  follow_up_answers: Record<string, string>;
}

export interface CreateCase {
  protocol_id: string;
  source: "console" | "photon";
  unit_id?: string;
  unit_position?: Point;
}

export type ItemStatus = "confident" | "uncertain" | "missing";
export interface ItemResult {
  id: string;
  label: string;
  /** score (0..n) for score items; index of chosen option for choice items */
  value: number | null;
  /** human label of level/option */
  value_label: string | null;
  /** level/option label -> p */
  probabilities: Record<string, number>;
  /** 0..1 */
  confidence: number;
  /** 0..1 (noul) */
  mentioned: number;
  status: ItemStatus;
}
export interface Flag {
  id: string;
  label: string;
  probability: number;
  active: boolean;
  source: "jev" | "code";
}
export interface FollowUp {
  item_id: string;
  question: string;
  reason: "missing" | "uncertain";
}
export interface JevCallStats {
  mode: Mode;
  model: string;
  latency_ms: number;
  questions: number;
  input_tokens: number;
  cost_usd: number;
}
export type Severity = "low" | "moderate" | "high";
export interface Assessment {
  items: ItemResult[];
  total: number | null;
  max_total: number | null;
  interpretation: { label: string; severity: Severity };
  /** e.g. lkw_minutes, glucose, weak_side, grid, callsign */
  extracted: Record<string, string | number | null>;
  flags: Flag[];
  follow_ups: FollowUp[];
  jev: JevCallStats;
  computed_at: string;
}

export type EdStatus = "open" | "advisory" | "diversion";
export type HospitalLevel = "CSC" | "TSC" | "PSC" | "ASRH";
export interface HospitalStatus {
  id: string;
  name: string;
  short_name: string;
  level: HospitalLevel;
  x: number;
  y: number;
  ed_status: EdStatus;
  ct_available: boolean;
  neuro_ir_available: boolean;
  note: string;
  last_checked: string;
  source: "browserbase" | "direct";
}
export interface HospitalOption {
  hospital: HospitalStatus;
  eta_minutes: number;
  eligible: boolean;
  thrombectomy_capable: boolean;
  reasons: string[];
}
export interface Routing {
  recommended: HospitalOption;
  options: HospitalOption[];
  lvo_suspected: boolean;
  rule_trace: string[];
  decided_in_ms: number;
}

export type MessageThread = "medic" | "team";
export type MessageRole = "medic" | "firstminute" | "hospital";
export interface Message {
  id: string;
  thread: MessageThread;
  author: string;
  role: MessageRole;
  text: string;
  kind: "text" | "alert" | "location";
  at: string;
}

export interface Sbar {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
}
export interface Alert {
  hospital_id: string;
  group_name: string;
  channel: Mode;
  sent_at: string;
  eta_minutes: number;
  sbar: Sbar;
  sbar_source: Mode;
}

export type CaseStatus = "listening" | "needs_info" | "ready" | "routed" | "alerted";
export type TimelineKind = "jev" | "routing" | "browser" | "photon" | "llm" | "followup" | "medic";
export interface TimelineEvent {
  at: string;
  t_ms: number;
  kind: TimelineKind;
  label: string;
  detail: string | null;
  latency_ms: number | null;
}
export interface Case {
  id: string;
  protocol_id: string;
  source: "console" | "photon";
  created_at: string;
  unit_id: string;
  unit_position: Point | null;
  transcript: string;
  status: CaseStatus;
  assessment: Assessment | null;
  routing: Routing | null;
  alert: Alert | null;
  messages: Message[];
  timeline: TimelineEvent[];
}
export interface InboundMessage {
  sender: string;
  text: string;
  chat_id?: string;
  attachment_url?: string;
  simulated?: boolean;
}

/* Request / response bodies named in the API table. */
export interface TranscriptBody {
  transcript: string;
  is_final: boolean;
}
export interface AnswerBody {
  item_id: string;
  text: string;
}
export interface ConfirmBody {
  hospital_id?: string;
}
export interface InboundResult {
  ok: true;
  case_id: string;
}
export interface TranscribeResult {
  text: string;
}

/* SSE /api/events payloads. */
export type ServerEvent =
  | { type: "case.updated"; case: Case }
  | { type: "hospitals.updated"; hospitals: HospitalStatus[] };
