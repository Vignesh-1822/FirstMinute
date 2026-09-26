import type { ReactNode } from "react";

interface StepCardProps {
  step: string;
  title: string;
  body: string;
  visual: ReactNode;
}

export function StepCard({ step, title, body, visual }: StepCardProps) {
  return (
    <article className="flex flex-col gap-5 p-6">
      <div className="flex h-[148px] items-center justify-center overflow-hidden rounded-xl well bg-dot-grid">{visual}</div>
      <div>
        <span className="font-mono text-[11px] text-faint">{step}</span>
        <h3 className="mt-1 text-[16px] font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </article>
  );
}
