import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EyebrowProps {
  children: ReactNode;
  className?: string;
}

/** Small mono uppercase label used for panel and section headings. */
export function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <span className={cn("font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground", className)}>
      {children}
    </span>
  );
}
