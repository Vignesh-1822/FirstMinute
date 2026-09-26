import type { LucideIcon } from "lucide-react";
import type { Point, Scenario, TimelineKind } from "./api";

export type Theme = "light" | "dark";

export type InputSource = "idle" | "scenario" | "mic" | "typed";

export type PlaybackState = "idle" | "playing" | "paused" | "done";

export interface TranscriptState {
  /** Text already committed (finished utterances, answers, finished playback). */
  committed: string;
  /** Text still being streamed or recognised. */
  live: string;
}

export interface TranscriptHighlight {
  start: number;
  end: number;
  itemId: string;
  label: string;
}

export interface TranscriptSegment {
  text: string;
  highlight: TranscriptHighlight | null;
}

export interface JevMeterTotals {
  calls: number;
  questions: number;
  latencyMs: number;
  costUsd: number;
  lastLatencyMs: number | null;
  lastComputedAt: string | null;
}

export interface ActiveScenario {
  scenario: Scenario;
  unitPosition: Point | null;
}

export type SpeechSupport = "unknown" | "supported" | "unsupported";

export interface SpeechState {
  support: SpeechSupport;
  listening: boolean;
  error: string | null;
}

export interface TimelineKindMeta {
  icon: LucideIcon;
  label: string;
}

export type TimelineKindMap = Record<TimelineKind, TimelineKindMeta>;

export type RightPanelView = "routing" | "team";

export interface NavLink {
  href: string;
  label: string;
}
