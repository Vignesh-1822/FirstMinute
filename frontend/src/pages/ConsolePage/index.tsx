import { useEffect } from "react";
import {
  BackendBanner,
  ConsoleTopBar,
  MedicInputPanel,
  MedicThread,
  RoutingPanel,
  ScoringPanel,
  TimelineRail,
} from "@/components/organisms";
import { Toaster } from "@/components/ui/sonner";
import { useConsoleSession, useTheme } from "@/hooks";
import { ConsoleTemplate } from "@/templates/ConsoleTemplate";

export function ConsolePage() {
  const { theme, toggleTheme } = useTheme("dark", "fm-theme-console");
  const session = useConsoleSession();

  useEffect(() => {
    document.title = "Console · FirstMinute";
  }, []);

  return (
    <>
      <ConsoleTemplate
        topBar={<ConsoleTopBar session={session} theme={theme} onToggleTheme={toggleTheme} />}
        banner={<BackendBanner />}
        left={
          <>
            <MedicInputPanel session={session} className="min-h-[260px] flex-1" />
            <MedicThread session={session} className="h-[300px] shrink-0" />
          </>
        }
        center={<ScoringPanel session={session} className="h-full" />}
        right={<RoutingPanel session={session} className="h-full" />}
        bottom={<TimelineRail caseData={session.caseData} />}
      />
      <Toaster theme={theme} position="bottom-right" />
    </>
  );
}
