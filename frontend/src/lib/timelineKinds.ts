import { Activity, FileText, Globe, MessageCircleQuestion, MessageSquare, Mic, Route } from "lucide-react";
import type { TimelineKindMap } from "@/types";

export const TIMELINE_KINDS: TimelineKindMap = {
  jev: { icon: Activity, label: "Jev decision" },
  routing: { icon: Route, label: "Routing" },
  browser: { icon: Globe, label: "Hospital status check" },
  photon: { icon: MessageSquare, label: "Photon message" },
  llm: { icon: FileText, label: "SBAR drafted" },
  followup: { icon: MessageCircleQuestion, label: "Follow-up" },
  medic: { icon: Mic, label: "Medic" },
};
