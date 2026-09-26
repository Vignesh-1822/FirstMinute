/**
 * Static data for the in-browser mock backend. Mirrors docs/SPEC.md "Domain data".
 * Fictional city "Riverton" — synthetic data only.
 */
import type { HospitalStatus, Protocol, Scenario } from "@/types";

export const ROUTING_POLICY = {
  lvoThreshold: 5,
  lkwEarlyWindowMin: 270,
  lkwLateWindowMin: 1440,
  maxExtraMinutesForThrombectomy: 15,
  maxEtaLateWindowMin: 60,
  speedKmPerMin: 0.9,
  offloadMin: 2,
} as const;

export const DEFAULT_HOSPITALS: Omit<HospitalStatus, "last_checked">[] = [
  {
    id: "mercy",
    name: "Mercy General Hospital",
    short_name: "Mercy",
    level: "CSC",
    x: 13.5,
    y: 4.0,
    ed_status: "open",
    ct_available: true,
    neuro_ir_available: true,
    note: "",
    source: "direct",
  },
  {
    id: "stluke",
    name: "St. Luke's Medical Center",
    short_name: "St. Luke's",
    level: "TSC",
    x: 5.0,
    y: 9.5,
    ed_status: "open",
    ct_available: true,
    neuro_ir_available: false,
    note: "Angio suite occupied",
    source: "direct",
  },
  {
    id: "riverside",
    name: "Riverside Community Hospital",
    short_name: "Riverside",
    level: "PSC",
    x: 8.5,
    y: 6.0,
    ed_status: "open",
    ct_available: true,
    neuro_ir_available: true,
    note: "",
    source: "direct",
  },
  {
    id: "northgate",
    name: "Northgate Hospital",
    short_name: "Northgate",
    level: "PSC",
    x: 16.5,
    y: 11.0,
    ed_status: "open",
    ct_available: true,
    neuro_ir_available: true,
    note: "",
    source: "direct",
  },
  {
    id: "harbor",
    name: "Harbor Valley Medical",
    short_name: "Harbor Valley",
    level: "ASRH",
    x: 2.5,
    y: 3.0,
    ed_status: "open",
    ct_available: true,
    neuro_ir_available: true,
    note: "",
    source: "direct",
  },
];

export const PROTOCOLS: Protocol[] = [
  {
    id: "stroke_race",
    name: "Stroke · RACE scale",
    short: "Stroke",
    description: "Rapid Arterial oCclusion Evaluation. 0–9, ≥ 5 suggests large vessel occlusion.",
    max_score: 9,
    has_routing: true,
    items: [
      {
        id: "face",
        label: "Facial palsy",
        kind: "score",
        levels: ["Absent", "Mild", "Moderate–severe"],
        follow_up: "Any facial droop — ask them to smile?",
      },
      {
        id: "arm",
        label: "Arm motor",
        kind: "score",
        levels: ["Normal / mild", "Moderate", "Severe"],
        follow_up: "Can they hold both arms up for 10 seconds?",
      },
      {
        id: "leg",
        label: "Leg motor",
        kind: "score",
        levels: ["Normal / mild", "Moderate", "Severe"],
        follow_up: "Can they lift each leg off the stretcher?",
      },
      {
        id: "gaze",
        label: "Head & gaze deviation",
        kind: "score",
        levels: ["Absent", "Present"],
        follow_up: "Are the eyes or head deviated to one side?",
      },
      {
        id: "cortical",
        label: "Aphasia / agnosia",
        kind: "score",
        levels: ["Normal", "One task failed", "Both failed"],
        follow_up: "Can they follow two commands / recognise their weak arm?",
      },
    ],
  },
  {
    id: "medevac_9line",
    name: "9-Line MEDEVAC",
    short: "MEDEVAC",
    description: "Casualty evacuation request. Low-confidence lines become the readback list.",
    max_score: null,
    has_routing: false,
    items: [
      {
        id: "line3",
        label: "Precedence",
        kind: "choice",
        levels: ["A · Urgent", "B · Urgent-surgical", "C · Priority", "D · Routine", "E · Convenience"],
        follow_up: "Confirm line 3 — patient precedence?",
      },
      {
        id: "line4",
        label: "Special equipment",
        kind: "choice",
        levels: ["A · None", "B · Hoist", "C · Extraction", "D · Ventilator"],
        follow_up: "Confirm line 4 — special equipment required?",
      },
      {
        id: "line5",
        label: "Patient type",
        kind: "choice",
        levels: ["L · Litter", "A · Ambulatory", "Both"],
        follow_up: "Confirm line 5 — litter or ambulatory?",
      },
      {
        id: "line6",
        label: "Security at pickup",
        kind: "choice",
        levels: ["N · No enemy", "P · Possible enemy", "E · Enemy, caution", "X · Armed escort"],
        follow_up: "Confirm line 6 — security at pickup site?",
      },
      {
        id: "line7",
        label: "Marking method",
        kind: "choice",
        levels: ["A · Panels", "B · Pyrotechnic", "C · Smoke", "D · None", "E · Other"],
        follow_up: "Confirm line 7 — how will the pickup site be marked?",
      },
      {
        id: "line8",
        label: "Nationality / status",
        kind: "choice",
        levels: ["A · US military", "B · US civilian", "C · Non-US military", "D · Non-US civilian", "E · EPW"],
        follow_up: "Confirm line 8 — patient nationality and status?",
      },
      {
        id: "line9",
        label: "NBC contamination",
        kind: "choice",
        levels: ["N · None", "C · Chemical", "B · Biological", "R · Radiological", "NUC · Nuclear"],
        follow_up: "Confirm line 9 — any NBC contamination?",
      },
    ],
  },
];

export const SCENARIOS: Scenario[] = [
  {
    id: "stroke_lvo",
    protocol_id: "stroke_race",
    title: "Suspected LVO",
    subtitle: "68 M · found down at home · LKW 40 min",
    transcript:
      "Okay, Medic 14 here. We've got a 68 year old male, wife found him on the kitchen floor, last known well about 40 minutes ago when she left for the store. He's got a pretty obvious right facial droop, moderate to severe when we ask him to smile. Right arm, he can't lift it at all, no effort against gravity. Right leg drifts down, some effort but it's falling to the bed. Head and eyes are deviated to the left, he won't look past midline. He'll close his eyes when asked but he won't make a fist, and he's not really getting words out. BGL is 128. Wife says no blood thinners. BP 178 over 96, heart rate 88.",
    unit_position: { x: 7, y: 8 },
    follow_up_answers: {},
  },
  {
    id: "stroke_missing_gaze",
    protocol_id: "stroke_race",
    title: "Gaze not reported",
    subtitle: "Same patient · one exam item skipped",
    transcript:
      "Medic 14. 68 year old male, found on the kitchen floor by his wife, last known well about 40 minutes ago. Obvious right facial droop, pretty severe on smile. Right arm, can't lift it, no effort against gravity. Right leg drifts, some effort but it falls. He'll close his eyes when asked but won't make a fist, not really getting words out. Glucose 128, no blood thinners.",
    unit_position: { x: 7, y: 8 },
    follow_up_answers: { gaze: "Yes, eyes and head deviated to the left." },
  },
  {
    id: "stroke_minor",
    protocol_id: "stroke_race",
    title: "Minor deficit",
    subtitle: "54 F · mild facial droop only",
    transcript:
      "Medic 14, 54 year old female, coworkers noticed a left facial droop, pretty mild, about an hour ago. Arms are both holding up fine, no drift. Legs strong both sides. Eyes midline, tracking normally. She's talking fine, follows commands, knows her left hand is hers. Glucose 110, no anticoagulants.",
    unit_position: { x: 9.5, y: 7.5 },
    follow_up_answers: {},
  },
  {
    id: "stroke_mimic",
    protocol_id: "stroke_race",
    title: "Possible mimic",
    subtitle: "71 M · confused · BGL 42",
    transcript:
      "Uh, 71 year old male, neighbour found him confused in the garden. Right arm kind of drifts, maybe some weakness. Face looks okay I think. He's slurring, not sure if it's word finding or just drowsy. Diabetic on insulin. BGL 42. Last seen normal last night, so last known well is unknown.",
    unit_position: { x: 12, y: 9 },
    follow_up_answers: {},
  },
  {
    id: "medevac_urgent",
    protocol_id: "medevac_9line",
    title: "9-Line · urgent",
    subtitle: "Two litter · marking unclear",
    transcript:
      "FirstMinute, this is a nine line. Line 1, grid 38S MB 4471 8812. Line 2, frequency 38.90, call sign Raven 2-6. Line 3, two patients urgent. Line 4, no special equipment. Line 5, two litter. Line 6, no enemy troops in the area. Line 7, uh, we'll mark it with either smoke or panels, stand by on that. Line 8, two US military. Line 9, no NBC contamination.",
    unit_position: null,
    follow_up_answers: { line7: "Line 7, marking with smoke." },
  },
];
