import type { Assessment, TranscriptHighlight, TranscriptSegment } from "@/types";

/**
 * Client-side cue lexicon: which spoken phrases most likely triggered each item.
 * Display-only — the backend does not return spans, so this is a visual aid,
 * never an input to scoring.
 */
const CUES: Record<string, { label: string; pattern: RegExp }> = {
  face: { label: "Facial palsy", pattern: /\b(facial droop|face|facial|droop|smile)\b/gi },
  arm: { label: "Arm motor", pattern: /\b(right arm|left arm|arms?)\b/gi },
  leg: { label: "Leg motor", pattern: /\b(right leg|left leg|legs?)\b/gi },
  gaze: { label: "Gaze", pattern: /\b(eyes (are )?deviated|deviated|eyes midline|gaze|midline|eyes)\b/gi },
  cortical: {
    label: "Aphasia / agnosia",
    pattern: /\b(follows commands|getting words out|won'?t make a fist|close his eyes|talking fine|slurring|knows her left hand|commands|words)\b/gi,
  },
  lkw_minutes: {
    label: "Last known well",
    pattern: /\b(last known well|last seen normal|(\d+|an?) (minutes?|hours?) ago)\b/gi,
  },
  glucose: { label: "Glucose", pattern: /\b(bgl|glucose) (is )?\d{2,3}\b/gi },
  grid: { label: "Line 1 · grid", pattern: /\bgrid [0-9]{1,2}[A-Z] ?[A-Z]{2} ?\d{3,5} ?\d{3,5}\b/gi },
  callsign: { label: "Line 2 · call sign", pattern: /\bcall ?sign [A-Za-z]+ ?[\d-]+\b/gi },
};

function activeCueIds(assessment: Assessment | null): Set<string> {
  const ids = new Set<string>();
  if (!assessment) return ids;
  assessment.items.forEach((item) => {
    if (item.status !== "missing") ids.add(item.id);
  });
  Object.entries(assessment.extracted).forEach(([key, value]) => {
    if (value !== null && value !== "" && key in CUES) ids.add(key);
  });
  return ids;
}

export function highlightTranscript(text: string, assessment: Assessment | null): TranscriptSegment[] {
  const active = activeCueIds(assessment);
  const matches: TranscriptHighlight[] = [];

  active.forEach((cueId) => {
    const cue = CUES[cueId];
    if (!cue) return;
    for (const match of text.matchAll(cue.pattern)) {
      const start = match.index ?? 0;
      matches.push({ start, end: start + match[0].length, itemId: cueId, label: cue.label });
    }
  });

  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const accepted: TranscriptHighlight[] = [];
  let cursor = -1;
  matches.forEach((match) => {
    if (match.start >= cursor) {
      accepted.push(match);
      cursor = match.end;
    }
  });

  const segments: TranscriptSegment[] = [];
  let position = 0;
  accepted.forEach((highlight) => {
    if (highlight.start > position) segments.push({ text: text.slice(position, highlight.start), highlight: null });
    segments.push({ text: text.slice(highlight.start, highlight.end), highlight });
    position = highlight.end;
  });
  if (position < text.length) segments.push({ text: text.slice(position), highlight: null });
  return segments;
}
