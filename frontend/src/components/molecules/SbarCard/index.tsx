import type { Mode, Sbar } from "@/types";
import { Eyebrow } from "@/components/atoms";

interface SbarCardProps {
  sbar: Sbar;
  source: Mode;
}

const ROWS: Array<{ key: keyof Sbar; letter: string; label: string }> = [
  { key: "situation", letter: "S", label: "Situation" },
  { key: "background", letter: "B", label: "Background" },
  { key: "assessment", letter: "A", label: "Assessment" },
  { key: "recommendation", letter: "R", label: "Recommendation" },
];

/** SBAR handoff as sent to the stroke team. */
export function SbarCard({ sbar, source }: SbarCardProps) {
  return (
    <div className="rounded-2xl rounded-bl-md border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <Eyebrow>SBAR handoff</Eyebrow>
        <span className="font-mono text-[9.5px] text-faint">{source === "live" ? "GMI Cloud" : "template · simulated"}</span>
      </div>
      <dl className="flex flex-col gap-1.5">
        {ROWS.map((row) => (
          <div key={row.key} className="grid grid-cols-[18px_1fr] gap-2">
            <dt className="flex size-[18px] items-center justify-center rounded-[5px] bg-muted font-mono text-[10px] font-semibold text-foreground" title={row.label}>
              {row.letter}
            </dt>
            <dd className="text-[11.5px] leading-snug text-foreground/90">{sbar[row.key]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
