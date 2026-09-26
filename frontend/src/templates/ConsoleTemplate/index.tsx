import type { ReactNode } from "react";

interface ConsoleTemplateProps {
  topBar: ReactNode;
  banner?: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  bottom: ReactNode;
}

/** Ops-room layout: fits 1440×900 without page scroll; columns scroll internally. */
export function ConsoleTemplate({ topBar, banner, left, center, right, bottom }: ConsoleTemplateProps) {
  return (
    <div className="flex h-svh min-h-[640px] flex-col overflow-hidden bg-background text-foreground">
      {topBar}
      {banner}
      <main className="grid min-h-0 flex-1 grid-cols-[292px_minmax(0,1fr)_336px] gap-3 bg-dot-grid p-3 xl:grid-cols-[340px_minmax(0,1fr)_392px]">
        <div className="flex min-h-0 flex-col gap-3">{left}</div>
        <div className="flex min-h-0 flex-col">{center}</div>
        <div className="flex min-h-0 flex-col">{right}</div>
      </main>
      {bottom}
    </div>
  );
}
