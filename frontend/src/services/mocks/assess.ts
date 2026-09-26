/**
 * Keyword-based stand-in for Jev scoring. Good enough to make the console
 * demoable without the backend; it is NOT the real model and is labelled
 * "simulated" everywhere in the UI.
 */
import type {
  Assessment,
  Flag,
  FollowUp,
  ItemResult,
  ItemStatus,
  Protocol,
  ProtocolItem,
} from "@/types";

interface Detection {
  value: number | null;
  confidence: number;
  mentioned: number;
}

interface LevelRule {
  pattern: RegExp;
  level: number;
}

interface ItemLexicon {
  mention: RegExp;
  rules: LevelRule[];
  /** Level used when the item is mentioned but no rule matched. */
  fallback: number;
}

const HEDGE = /\b(maybe|might|kind of|sort of|i think|possibly|not sure|either|stand by|unclear|looks okay)\b/i;
const AFFIRM = /^\s*(yes|yeah|yep|affirmative|present|positive)\b/i;
const NEGATE = /^\s*(no|nope|negative|none|absent|normal)\b/i;

const STROKE_LEXICON: Record<string, ItemLexicon> = {
  face: {
    mention: /\b(face|facial|droop|smile|smiling)\b/i,
    rules: [
      { pattern: /\b(no (facial )?droop|symmetric|face (is |looks )?(normal|okay|fine))\b/i, level: 0 },
      { pattern: /\b(moderate|severe|obvious|significant|marked|dense)\b/i, level: 2 },
      { pattern: /\b(mild|slight|subtle|little)\b/i, level: 1 },
    ],
    fallback: 1,
  },
  arm: {
    mention: /\barms?\b/i,
    rules: [
      { pattern: /\b(no drift|holding (up )?fine|holds? (both|them) up|strong|normal)\b/i, level: 0 },
      { pattern: /\b(can'?t lift|cannot lift|no effort|flaccid|drops? straight|no movement)\b/i, level: 2 },
      { pattern: /\b(drifts?|some effort|weakness|weak)\b/i, level: 1 },
    ],
    fallback: 1,
  },
  leg: {
    mention: /\blegs?\b/i,
    rules: [
      { pattern: /\b(strong|no drift|normal|lifts? (both|each))\b/i, level: 0 },
      { pattern: /\b(can'?t lift|cannot lift|no effort|flaccid|no movement)\b/i, level: 2 },
      { pattern: /\b(drifts?|some effort|falls?|falling|weak)\b/i, level: 1 },
    ],
    fallback: 1,
  },
  gaze: {
    mention: /\b(gaze|deviat\w*|look past|looking to|eyes (are )?(deviated|midline|tracking)|head and eyes)\b/i,
    rules: [
      { pattern: /\b(eyes (are )?midline|tracking normally|no (gaze|deviation))\b/i, level: 0 },
      { pattern: /\b(deviat\w*|won'?t look|forced|looking to the (left|right))\b/i, level: 1 },
    ],
    fallback: 1,
  },
  cortical: {
    mention: /\b(words?|speak\w*|talk\w*|speech|command\w*|fist|aphasi\w*|recogni[sz]e|knows her|knows his|slurr\w*|neglect)\b/i,
    rules: [
      { pattern: /\b(follows commands|talking fine|speech (is )?normal|knows (her|his))\b/i, level: 0 },
      { pattern: /\b(but (he|she)?\s*won'?t|only one|one command)\b/i, level: 1 },
      { pattern: /\b(can'?t follow|not following|no commands|mute|doesn'?t recogni[sz]e)\b/i, level: 2 },
      { pattern: /\b(slurr\w*)\b/i, level: 1 },
    ],
    fallback: 1,
  },
};

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

interface FollowUpLine {
  label: string;
  text: string;
}

function followUpLines(transcript: string): FollowUpLine[] {
  const lines: FollowUpLine[] = [];
  const pattern = /\[Follow-up · ([^\]]+)\]\s*([^\n]*)/g;
  for (const match of transcript.matchAll(pattern)) {
    lines.push({ label: match[1].trim(), text: match[2].trim() });
  }
  return lines;
}

function stripFollowUps(transcript: string): string {
  return transcript.replace(/\[Follow-up · [^\]]+\][^\n]*/g, "");
}

function detectScoreItem(item: ProtocolItem, lexicon: ItemLexicon, body: string, answers: FollowUpLine[]): Detection {
  const answer = answers.filter((line) => line.label === item.label).at(-1);
  if (answer) {
    const rule = lexicon.rules.find(({ pattern }) => pattern.test(answer.text));
    if (rule) return { value: rule.level, confidence: 0.93, mentioned: 0.97 };
    if (AFFIRM.test(answer.text)) return { value: Math.max(1, lexicon.fallback), confidence: 0.9, mentioned: 0.97 };
    if (NEGATE.test(answer.text)) return { value: 0, confidence: 0.9, mentioned: 0.97 };
    return { value: lexicon.fallback, confidence: 0.55, mentioned: 0.9 };
  }

  const hits = sentences(body).filter((sentence) => lexicon.mention.test(sentence));
  if (hits.length === 0) return { value: null, confidence: 0.35, mentioned: 0.06 };

  const joined = hits.join(" ");
  const rule = lexicon.rules.find(({ pattern }) => pattern.test(joined));
  const hedged = HEDGE.test(joined);
  const value = rule ? rule.level : lexicon.fallback;
  const base = rule ? 0.9 : 0.62;
  return { value, confidence: hedged ? Math.min(base, 0.46) : base, mentioned: hedged ? 0.78 : 0.95 };
}

function distribution(levels: string[], value: number | null, confidence: number): Record<string, number> {
  const result: Record<string, number> = {};
  if (value === null) {
    levels.forEach((level) => {
      result[level] = Number((1 / levels.length).toFixed(3));
    });
    return result;
  }
  const rest = (1 - confidence) / Math.max(1, levels.length - 1);
  levels.forEach((level, index) => {
    const neighbour = Math.abs(index - value) === 1 ? 1.4 : 0.6;
    result[level] = index === value ? confidence : rest * neighbour;
  });
  const sum = Object.values(result).reduce((acc, p) => acc + p, 0);
  Object.keys(result).forEach((key) => {
    result[key] = Number((result[key] / sum).toFixed(3));
  });
  return result;
}

function statusFor(detection: Detection): ItemStatus {
  if (detection.mentioned < 0.5) return "missing";
  if (detection.confidence < 0.6) return "uncertain";
  return "confident";
}

function toItemResult(item: ProtocolItem, detection: Detection): ItemResult {
  const status = statusFor(detection);
  const value = status === "missing" ? null : detection.value;
  return {
    id: item.id,
    label: item.label,
    value,
    value_label: value === null ? null : (item.levels[value] ?? null),
    probabilities: distribution(item.levels, value, detection.confidence),
    confidence: Number(detection.confidence.toFixed(2)),
    mentioned: Number(detection.mentioned.toFixed(2)),
    status,
  };
}

function followUpsFor(protocol: Protocol, items: ItemResult[]): FollowUp[] {
  return items
    .filter((item) => item.status !== "confident")
    .map((item) => {
      const definition = protocol.items.find((candidate) => candidate.id === item.id);
      return {
        item_id: item.id,
        question: definition?.follow_up ?? `Confirm ${item.label}?`,
        reason: item.status === "missing" ? "missing" : "uncertain",
      };
    });
}

/* ---------------------------- code extraction ---------------------------- */

const WORD_NUMBERS: Record<string, number> = { an: 1, a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, half: 0.5 };

export function extractLkwMinutes(text: string): number | null {
  if (/\b(last known well|lkw)\b[^.]*\bunknown\b/i.test(text)) return null;
  const match = text.match(/\b(\d+(?:\.\d+)?|an?|one|two|three|four|five)\s*(minutes?|mins?|hours?|hrs?)\s*ago\b/i)
    ?? text.match(/\blkw\s*(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?)\b/i);
  if (!match) return null;
  const amountToken = match[1].toLowerCase();
  const amount = WORD_NUMBERS[amountToken] ?? Number(amountToken);
  const unit = match[2].toLowerCase();
  return Math.round(unit.startsWith("h") ? amount * 60 : amount);
}

export function extractGlucose(text: string): number | null {
  const match = text.match(/\b(?:bgl|glucose|sugar|cbg)\s*(?:is|of|:)?\s*(\d{2,3})\b/i);
  return match ? Number(match[1]) : null;
}

function extractWeakSide(text: string): string {
  const right = /\bright[- ]?(sided|side|arm|leg|facial|face)\b|\bright (arm|leg)\b/i.test(text);
  const left = /\bleft[- ]?(sided|side|arm|leg|facial|face)\b|\bleft (arm|leg)\b/i.test(text);
  if (right && left) return "bilateral";
  if (right) return "right";
  if (left) return "left";
  return "none_reported";
}

function flag(id: string, label: string, active: boolean, source: Flag["source"], strength = 0.9): Flag {
  return { id, label, probability: active ? strength : 1 - strength, active, source };
}

/* ------------------------------- assessors ------------------------------- */

function jevStats(questions: number, transcript: string, latencyMs: number) {
  const inputTokens = Math.round(questions * (transcript.length / 3.6 + 70));
  return {
    mode: "simulated" as const,
    model: "jev-latest",
    latency_ms: latencyMs,
    questions,
    input_tokens: inputTokens,
    cost_usd: Number(((inputTokens / 1_000_000) * 0.042).toFixed(7)),
  };
}

function assessStroke(protocol: Protocol, transcript: string, latencyMs: number): Assessment {
  const answers = followUpLines(transcript);
  const body = stripFollowUps(transcript);
  const items = protocol.items.map((item) => {
    const lexicon = STROKE_LEXICON[item.id];
    const detection = lexicon
      ? detectScoreItem(item, lexicon, body, answers)
      : { value: null, confidence: 0.3, mentioned: 0.05 };
    return toItemResult(item, detection);
  });

  const total = items.reduce((sum, item) => sum + (item.value ?? 0), 0);
  const glucose = extractGlucose(transcript);
  const lkw = extractLkwMinutes(transcript);
  const negatedAnticoag = /\bno (blood thinners|anticoagulants?)\b/i.test(transcript);
  const flags: Flag[] = [
    flag("hypoglycemia", "Hypoglycaemia mimic", glucose !== null && glucose < 60, "code", 0.99),
    flag("seizure", "Seizure reported", /\bseiz\w*/i.test(transcript), "jev", 0.86),
    flag("head_trauma", "Head trauma", /\b(hit (his|her) head|head (injury|trauma)|fell and struck)\b/i.test(transcript), "jev", 0.84),
    flag(
      "anticoagulant",
      "Anticoagulant use",
      !negatedAnticoag && /\b(warfarin|coumadin|eliquis|apixaban|xarelto|rivaroxaban|blood thinners?|anticoagulants?)\b/i.test(transcript),
      "jev",
      0.88,
    ),
  ];

  const known = items.filter((item) => item.value !== null).length;
  const interpretation =
    total >= 5
      ? { label: "LVO suspected", severity: "high" as const }
      : total >= 3
        ? { label: "Stroke likely · LVO less likely", severity: "moderate" as const }
        : known === 0
          ? { label: "Awaiting exam findings", severity: "low" as const }
          : { label: "LVO unlikely", severity: "low" as const };

  return {
    items,
    total,
    max_total: protocol.max_score,
    interpretation,
    extracted: {
      lkw_minutes: lkw,
      glucose,
      weak_side: extractWeakSide(body),
    },
    flags,
    follow_ups: followUpsFor(protocol, items),
    jev: jevStats(items.length * 2 + 4, transcript, latencyMs),
    computed_at: new Date().toISOString(),
  };
}

const LINE_WORDS: Record<string, string> = {
  "3": "three",
  "4": "four",
  "5": "five",
  "6": "six",
  "7": "seven",
  "8": "eight",
  "9": "nine",
};

const MEDEVAC_RULES: Record<string, LevelRule[]> = {
  line3: [
    { pattern: /urgent[- ]surgical/i, level: 1 },
    { pattern: /\burgent\b/i, level: 0 },
    { pattern: /\bpriority\b/i, level: 2 },
    { pattern: /\broutine\b/i, level: 3 },
    { pattern: /\bconvenience\b/i, level: 4 },
  ],
  line4: [
    { pattern: /\b(no|none)\b/i, level: 0 },
    { pattern: /\bhoist\b/i, level: 1 },
    { pattern: /\bextraction\b/i, level: 2 },
    { pattern: /\bventilator\b/i, level: 3 },
  ],
  line5: [
    { pattern: /\blitter\b[^.]*\bambulatory\b|\bboth\b/i, level: 2 },
    { pattern: /\blitter\b/i, level: 0 },
    { pattern: /\bambulatory\b/i, level: 1 },
  ],
  line6: [
    { pattern: /\bno enemy\b/i, level: 0 },
    { pattern: /\bpossible enemy\b/i, level: 1 },
    { pattern: /\barmed escort\b/i, level: 3 },
    { pattern: /\benemy\b/i, level: 2 },
  ],
  line7: [
    { pattern: /\bpanels?\b/i, level: 0 },
    { pattern: /\bpyro\w*|flare\b/i, level: 1 },
    { pattern: /\bsmoke\b/i, level: 2 },
    { pattern: /\bno(ne)? mark/i, level: 3 },
  ],
  line8: [
    { pattern: /\bnon[- ]us military\b/i, level: 2 },
    { pattern: /\bnon[- ]us civilian\b/i, level: 3 },
    { pattern: /\bus military\b/i, level: 0 },
    { pattern: /\bus civilian\b/i, level: 1 },
    { pattern: /\bepw\b/i, level: 4 },
  ],
  line9: [
    { pattern: /\bno(ne)? (nbc|contamination)\b|\bnone\b/i, level: 0 },
    { pattern: /\bchemical\b/i, level: 1 },
    { pattern: /\bbiological\b/i, level: 2 },
    { pattern: /\bradiological\b/i, level: 3 },
    { pattern: /\bnuclear\b/i, level: 4 },
  ],
};

function lineSentence(body: string, lineNumber: string): string | null {
  const word = LINE_WORDS[lineNumber];
  const pattern = new RegExp(`\\bline\\s*(${lineNumber}|${word})\\b([^]*?)(?=\\bline\\s*(\\d|one|two|three|four|five|six|seven|eight|nine)\\b|$)`, "i");
  const match = body.match(pattern);
  return match ? match[2] : null;
}

function assessMedevac(protocol: Protocol, transcript: string, latencyMs: number): Assessment {
  const answers = followUpLines(transcript);
  const body = stripFollowUps(transcript);

  const items = protocol.items.map((item) => {
    const number = item.id.replace(/\D/g, "");
    const answer = answers.filter((line) => line.label === item.label).at(-1);
    const text = answer?.text ?? lineSentence(body, number);
    const rules = MEDEVAC_RULES[item.id] ?? [];
    if (!text) return toItemResult(item, { value: null, confidence: 0.3, mentioned: 0.05 });
    const matches = rules.filter(({ pattern }) => pattern.test(text));
    const hedged = HEDGE.test(text);
    const value = matches[0]?.level ?? 0;
    const confidence = answer ? 0.94 : hedged ? 0.44 : matches.length ? 0.92 : 0.5;
    return toItemResult(item, { value, confidence, mentioned: 0.96 });
  });

  const grid = body.match(/\bgrid\s+([0-9]{1,2}[A-Z]\s?[A-Z]{2}\s?\d{3,5}\s?\d{3,5})/i)?.[1] ?? null;
  const frequency = body.match(/\bfreq(?:uency)?\s*([\d.]+)/i)?.[1] ?? null;
  const callsign = body.match(/\bcall ?sign\s+([A-Za-z]+\s?[\d-]+)/i)?.[1] ?? null;
  const followUps = followUpsFor(protocol, items);

  return {
    items,
    total: null,
    max_total: null,
    interpretation:
      followUps.length > 0
        ? { label: `Readback · ${followUps.length} line${followUps.length > 1 ? "s" : ""}`, severity: "moderate" }
        : { label: "Ready to transmit", severity: "low" },
    extracted: { grid, frequency, callsign },
    flags: [],
    follow_ups: followUps,
    jev: jevStats(items.length, transcript, latencyMs),
    computed_at: new Date().toISOString(),
  };
}

export function assess(protocol: Protocol, transcript: string, latencyMs: number): Assessment {
  return protocol.id === "medevac_9line"
    ? assessMedevac(protocol, transcript, latencyMs)
    : assessStroke(protocol, transcript, latencyMs);
}
