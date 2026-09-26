import type { ReactNode } from "react";
import { Eyebrow } from "@/components/atoms";
import { cn } from "@/lib/utils";

interface PanelProps {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: "section" | "div";
}

/** Console surface: hairline border, inner highlight, 40px header. */
export function Panel({ title, meta, actions, children, className, bodyClassName, as = "section" }: PanelProps) {
  const Element = as;
  return (
    <Element className={cn("surface flex min-h-0 flex-col overflow-hidden rounded-xl", className)}>
      <header className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        <Eyebrow className="truncate">{title}</Eyebrow>
        {meta ? <span className="min-w-0 truncate text-[11px] text-muted-foreground">{meta}</span> : null}
        {actions ? <span className="ml-auto flex shrink-0 items-center gap-1">{actions}</span> : null}
      </header>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </Element>
  );
}
