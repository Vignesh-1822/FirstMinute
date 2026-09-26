/**
 * In-browser simulation of the FirstMinute backend (VITE_USE_MOCKS=true).
 * Every integration here reports mode "simulated". State lives in memory.
 */
import type {
  Alert,
  Case,
  CreateCase,
  FirstMinuteApi,
  HospitalStatus,
  InboundMessage,
  Message,
  Protocol,
  ServerEvent,
  TimelineEvent,
  TimelineKind,
} from "@/types";
import { ApiError } from "../http";
import { assess } from "./assess";
import { DEFAULT_HOSPITALS, PROTOCOLS, SCENARIOS } from "./data";
import { routeCase as decideRoute } from "./routing";

type Listener = (event: ServerEvent) => void;

const listeners = new Set<Listener>();
const cases = new Map<string, Case>();
const openCaseBySender = new Map<string, string>();
const queues = new Map<string, Promise<void>>();
const assessedText = new Map<string, string>();

let hospitals: HospitalStatus[] = DEFAULT_HOSPITALS.map((hospital) => ({
  ...hospital,
  last_checked: new Date().toISOString(),
}));
let caseCounter = 0;
let messageCounter = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;

const clone = <T,>(value: T): T => structuredClone(value);
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const jevLatency = () => Math.round(90 + Math.random() * 130);

function emit(event: ServerEvent) {
  listeners.forEach((listener) => listener(clone(event)));
}

function emitCase(record: Case) {
  emit({ type: "case.updated", case: record });
}

function requireCase(caseId: string): Case {
  const record = cases.get(caseId);
  if (!record) throw new ApiError("Case not found", 404, `/api/cases/${caseId}`);
  return record;
}

function requireProtocol(protocolId: string): Protocol {
  const protocol = PROTOCOLS.find((candidate) => candidate.id === protocolId);
  if (!protocol) throw new ApiError(`Unknown protocol ${protocolId}`, 422, "/api/cases");
  return protocol;
}

function addEvent(
  record: Case,
  kind: TimelineKind,
  label: string,
  detail: string | null = null,
  latencyMs: number | null = null,
) {
  const now = new Date();
  const event: TimelineEvent = {
    at: now.toISOString(),
    t_ms: now.getTime() - new Date(record.created_at).getTime(),
    kind,
    label,
    detail,
    latency_ms: latencyMs,
  };
  record.timeline.push(event);
}

function addMessage(record: Case, message: Omit<Message, "id" | "at">) {
  messageCounter += 1;
  record.messages.push({ ...message, id: `msg_${messageCounter}`, at: new Date().toISOString() });
}

function deriveStatus(record: Case): Case["status"] {
  if (record.alert) return "alerted";
  if (record.routing) return "routed";
  if (!record.assessment) return "listening";
  return record.assessment.follow_ups.length > 0 ? "needs_info" : "ready";
}

/** Serialise work per case so assessments never race; latest text wins (coalescing). */
function enqueue(caseId: string, task: () => Promise<void>): Promise<void> {
  const previous = queues.get(caseId) ?? Promise.resolve();
  const next = previous.then(task, task);
  queues.set(caseId, next);
  return next;
}

async function runAssessment(record: Case) {
  const text = record.transcript.trim();
  if (!text || assessedText.get(record.id) === text) return;
  const latency = jevLatency();
  await wait(latency);
  const protocol = requireProtocol(record.protocol_id);
  const assessment = assess(protocol, record.transcript, latency);
  assessedText.set(record.id, text);
  record.assessment = assessment;
  const confident = assessment.items.filter((item) => item.status === "confident").length;
  addEvent(
    record,
    "jev",
    `Jev scored ${assessment.items.length} items · ${confident} confident`,
    `${assessment.jev.questions} questions · ${assessment.jev.input_tokens} tokens`,
    latency,
  );
  if (record.routing && record.protocol_id === "stroke_race") applyRouting(record);
  record.status = deriveStatus(record);
  emitCase(record);
}

function applyRouting(record: Case) {
  const assessment = record.assessment;
  const position = record.unit_position ?? { x: 7, y: 8 };
  const total = assessment?.total ?? 0;
  const lkw = assessment?.extracted.lkw_minutes;
  const routing = decideRoute(hospitals, position, total, typeof lkw === "number" ? lkw : null);
  const changed = record.routing?.recommended.hospital.id !== routing.recommended.hospital.id;
  record.routing = routing;
  addEvent(
    record,
    "routing",
    changed && record.timeline.some((event) => event.kind === "routing")
      ? `Rerouted → ${routing.recommended.hospital.short_name}`
      : `Routed → ${routing.recommended.hospital.short_name} · ETA ${routing.recommended.eta_minutes} min`,
    routing.rule_trace.at(-2) ?? null,
    routing.decided_in_ms,
  );
}

function sbarFor(record: Case, hospitalName: string, eta: number) {
  const assessment = record.assessment;
  const total = assessment?.total ?? 0;
  const lkw = assessment?.extracted.lkw_minutes;
  const glucose = assessment?.extracted.glucose;
  const sideValue = assessment?.extracted.weak_side;
  const side = typeof sideValue === "string" ? sideValue : null;
  const positives = (assessment?.items ?? [])
    .filter((item) => (item.value ?? 0) > 0)
    .map((item) => `${item.label.toLowerCase()} ${item.value_label?.toLowerCase() ?? ""}`.trim());
  const activeFlags = (assessment?.flags ?? []).filter((flag) => flag.active).map((flag) => flag.label.toLowerCase());
  return {
    situation: `Unit ${record.unit_id} inbound with suspected ${total >= 5 ? "LVO " : ""}stroke, RACE ${total}/9, ETA ${eta} min to ${hospitalName}.`,
    background: `Last known well ${typeof lkw === "number" ? `${lkw} min ago` : "unknown"}. BGL ${glucose ?? "not reported"}.${activeFlags.length ? ` Flags: ${activeFlags.join(", ")}.` : " No anticoagulants reported."}`,
    assessment: `${side && side !== "none_reported" ? `${side[0].toUpperCase()}${side.slice(1)}-sided deficits: ` : ""}${positives.join(", ") || "minor deficits"}.`,
    recommendation: `${total >= 5 ? "Activate stroke team, CT/CTA on arrival, neuro-IR on standby." : "Stroke team review on arrival, CT on arrival."}`,
  };
}

function confirmAlert(record: Case, hospitalId?: string) {
  if (!record.routing) applyRouting(record);
  const routing = record.routing;
  if (!routing) throw new ApiError("Case has no routing", 409, `/api/cases/${record.id}/confirm`);
  const option = routing.options.find((candidate) => candidate.hospital.id === hospitalId) ?? routing.recommended;
  const hospital = option.hospital;
  const groupName = `CODE STROKE · Unit ${record.unit_id} · ETA ${option.eta_minutes}`;
  const sbar = sbarFor(record, hospital.name, option.eta_minutes);
  const alert: Alert = {
    hospital_id: hospital.id,
    group_name: groupName,
    channel: "simulated",
    sent_at: new Date().toISOString(),
    eta_minutes: option.eta_minutes,
    sbar,
    sbar_source: "simulated",
  };
  record.alert = alert;
  addEvent(record, "llm", "SBAR drafted (template)", "GMI simulated · template SBAR", 38);
  addMessage(record, {
    thread: "team",
    author: "FirstMinute",
    role: "firstminute",
    kind: "alert",
    text: `CODE STROKE pre-alert — RACE ${record.assessment?.total ?? "–"}/9${routing.lvo_suspected ? ", LVO suspected" : ""}. ETA ${option.eta_minutes} min to ${hospital.name}.`,
  });
  addMessage(record, {
    thread: "team",
    author: "FirstMinute",
    role: "firstminute",
    kind: "text",
    text: `S: ${sbar.situation}\nB: ${sbar.background}\nA: ${sbar.assessment}\nR: ${sbar.recommendation}`,
  });
  const position = record.unit_position ?? { x: 7, y: 8 };
  addMessage(record, {
    thread: "team",
    author: "FirstMinute",
    role: "firstminute",
    kind: "location",
    text: `Unit ${record.unit_id} · grid ${position.x.toFixed(1)} E, ${position.y.toFixed(1)} S`,
  });
  addEvent(record, "photon", `Group "${groupName}" created`, "Photon simulated · stored on case", 212);
  record.status = deriveStatus(record);
}

function newCase(body: CreateCase): Case {
  requireProtocol(body.protocol_id);
  caseCounter += 1;
  const id = `FM-${String(2400 + caseCounter)}`;
  const record: Case = {
    id,
    protocol_id: body.protocol_id,
    source: body.source,
    created_at: new Date().toISOString(),
    unit_id: body.unit_id ?? "M-14",
    unit_position: body.unit_position ?? (body.protocol_id === "stroke_race" ? { x: 7, y: 8 } : null),
    transcript: "",
    status: "listening",
    assessment: null,
    routing: null,
    alert: null,
    messages: [],
    timeline: [],
  };
  addEvent(record, "medic", `Case opened · ${body.source === "photon" ? "iMessage" : "console"}`);
  cases.set(id, record);
  emitCase(record);
  return record;
}

function medicReply(record: Case, text: string) {
  addMessage(record, { thread: "medic", author: "FirstMinute", role: "firstminute", kind: "text", text });
}

async function handleInbound(body: InboundMessage): Promise<string> {
  const existingId = openCaseBySender.get(body.sender);
  const existing = existingId ? cases.get(existingId) : undefined;
  const record =
    existing && existing.status !== "alerted"
      ? existing
      : newCase({
          protocol_id: /\b(9[- ]?line|nine line|medevac)\b/i.test(body.text) ? "medevac_9line" : "stroke_race",
          source: "photon",
          unit_id: "M-14",
        });
  openCaseBySender.set(body.sender, record.id);
  addMessage(record, { thread: "medic", author: body.sender, role: "medic", kind: "text", text: body.text });
  addEvent(record, "photon", "Inbound iMessage", body.simulated ? "simulated" : "live", null);

  await enqueue(record.id, async () => {
    if (/^\s*confirm\b/i.test(body.text) && record.protocol_id === "stroke_race") {
      confirmAlert(record);
      medicReply(record, `Pre-alert sent to ${record.routing?.recommended.hospital.short_name ?? "hospital"} stroke team.`);
      emitCase(record);
      return;
    }
    const open = record.assessment?.follow_ups ?? [];
    if (open.length > 0) {
      const protocol = requireProtocol(record.protocol_id);
      open.forEach((followUp) => {
        const label = protocol.items.find((item) => item.id === followUp.item_id)?.label ?? followUp.item_id;
        record.transcript += `\n[Follow-up · ${label}] ${body.text}`;
      });
      addEvent(record, "followup", `Follow-up answered via iMessage`, body.text, null);
    } else {
      record.transcript = record.transcript ? `${record.transcript} ${body.text}` : body.text;
    }
    await runAssessment(record);
    const assessment = record.assessment;
    if (!assessment) return;
    if (assessment.follow_ups.length > 0) {
      medicReply(
        record,
        assessment.follow_ups.map((followUp) => `${followUp.reason === "missing" ? "Not mentioned" : "Unsure"} — ${followUp.question}`).join("\n"),
      );
    } else if (record.protocol_id === "stroke_race") {
      applyRouting(record);
      const routing = record.routing;
      if (routing) {
        const excluded = routing.options.find((option) => option.reasons.length > 0);
        const lkw = assessment.extracted.lkw_minutes;
        medicReply(
          record,
          `RACE ${assessment.total}/9 · ${assessment.interpretation.label}${typeof lkw === "number" ? ` · LKW ${lkw} min` : ""} → ${routing.recommended.hospital.name}, ETA ${routing.recommended.eta_minutes} min${excluded ? ` (${excluded.hospital.short_name}: ${excluded.hospital.note || excluded.reasons[0]})` : ""}. Reply CONFIRM to pre-alert.`,
        );
      }
    } else {
      medicReply(record, "9-line complete. Ready to transmit.");
    }
    record.status = deriveStatus(record);
    emitCase(record);
  });
  return record.id;
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    hospitals = hospitals.map((hospital) => ({ ...hospital, last_checked: new Date().toISOString() }));
    emit({ type: "hospitals.updated", hospitals });
  }, 20_000);
}

export const mockApi: FirstMinuteApi = {
  getHealth: async () => {
    await wait(60);
    return { status: "ok", modes: { jev: "simulated", gmi: "simulated", browser: "direct", photon: "simulated" } };
  },
  getProtocols: async () => clone(PROTOCOLS),
  getScenarios: async () => clone(SCENARIOS),
  createCase: async (body) => {
    await wait(40);
    return clone(newCase(body));
  },
  listCases: async () => clone([...cases.values()].reverse()),
  getCase: async (caseId) => clone(requireCase(caseId)),
  postTranscript: async (caseId, body) => {
    const record = requireCase(caseId);
    record.transcript = body.transcript;
    await enqueue(caseId, () => runAssessment(record));
    return clone(record);
  },
  postAnswer: async (caseId, body) => {
    const record = requireCase(caseId);
    const protocol = requireProtocol(record.protocol_id);
    const label = protocol.items.find((item) => item.id === body.item_id)?.label ?? body.item_id;
    record.transcript = `${record.transcript}\n[Follow-up · ${label}] ${body.text}`;
    addEvent(record, "followup", `Answer · ${label}`, body.text, null);
    await enqueue(caseId, () => runAssessment(record));
    return clone(record);
  },
  routeCase: async (caseId) => {
    const record = requireCase(caseId);
    const protocol = requireProtocol(record.protocol_id);
    if (!protocol.has_routing) throw new ApiError("Protocol has no routing", 409, `/api/cases/${caseId}/route`);
    await enqueue(caseId, async () => {
      applyRouting(record);
      record.status = deriveStatus(record);
      emitCase(record);
    });
    return clone(record);
  },
  confirmCase: async (caseId, body) => {
    const record = requireCase(caseId);
    await enqueue(caseId, async () => {
      await wait(260);
      confirmAlert(record, body.hospital_id);
      medicReply(record, `Pre-alert sent to ${record.routing?.recommended.hospital.short_name ?? "hospital"} stroke team.`);
      emitCase(record);
    });
    return clone(record);
  },
  getHospitals: async () => {
    startPolling();
    return clone(hospitals);
  },
  refreshHospitals: async () => {
    await wait(180);
    hospitals = hospitals.map((hospital) => ({ ...hospital, last_checked: new Date().toISOString() }));
    emit({ type: "hospitals.updated", hospitals });
    return clone(hospitals);
  },
  postInbound: async (body) => {
    const caseId = await handleInbound(body);
    return { ok: true, case_id: caseId };
  },
  subscribeEvents: ({ onEvent, onStatus }) => {
    onStatus("connecting");
    const timer = setTimeout(() => onStatus("open"), 120);
    listeners.add(onEvent);
    return () => {
      clearTimeout(timer);
      listeners.delete(onEvent);
    };
  },
  setHospitalFlag: async (hospitalId, patch) => {
    await wait(120);
    hospitals = hospitals.map((hospital) =>
      hospital.id === hospitalId
        ? {
            ...hospital,
            ...patch,
            note:
              patch.neuro_ir_available === false
                ? "Angio suite occupied"
                : patch.neuro_ir_available === true
                  ? ""
                  : hospital.note,
            last_checked: new Date().toISOString(),
          }
        : hospital,
    );
    emit({ type: "hospitals.updated", hospitals });
    return clone(hospitals);
  },
};
