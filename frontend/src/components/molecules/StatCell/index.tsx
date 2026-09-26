import type { ReactNode } from "react";
import { Eyebrow } from "@/components/atoms";

interface StatCellProps {
  value: ReactNode;
  label: string;
  source: string;
  index: string;
}

export function StatCell({ value, label, source, index }: StatCellProps) {
  return (
    <div className="flex flex-col justify-between gap-10 p-6 md:p-8">
      <Eyebrow>{index}</Eyebrow>
      <div>
        <div className="font-mono text-[44px] leading-none font-medium tracking-tight text-foreground tabular-nums">{value}</div>
        <p className="mt-3 max-w-[26ch] text-[14.5px] leading-snug text-foreground/85">{label}</p>
        <p className="mt-3 font-mono text-[10.5px] text-faint">{source}</p>
      </div>
    </div>
  );
}
