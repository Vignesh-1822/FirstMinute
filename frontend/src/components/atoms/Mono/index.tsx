import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MonoProps {
  children: ReactNode;
  className?: string;
}

/** Inline tabular mono text for numbers, stamps and ids. */
export function Mono({ children, className }: MonoProps) {
  return <span className={cn("font-mono tabular-nums", className)}>{children}</span>;
}
