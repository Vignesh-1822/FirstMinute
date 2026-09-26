import { PlugZap, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHealth } from "@/hooks";
import { apiConfig } from "@/services";

/** Shown when /api/health fails: says what is wrong and how to fix it. */
export function BackendBanner() {
  const health = useHealth();
  if (apiConfig.useMocks || !health.isError) return null;

  return (
    <div role="alert" className="flex shrink-0 items-center gap-3 border-b border-signal/30 bg-signal-soft px-4 py-2 text-[12.5px]">
      <PlugZap className="size-4 shrink-0 text-signal-ink" strokeWidth={1.5} aria-hidden />
      <span className="font-medium text-foreground">Backend unreachable at {apiConfig.baseUrl}.</span>
      <span className="hidden text-muted-foreground md:inline">
        Start it with{" "}
        <code className="rounded bg-foreground/[0.07] px-1.5 py-0.5 font-mono text-[11.5px] text-foreground">
          cd backend && source venv/bin/activate && uvicorn main:app --port 8000
        </code>{" "}
        — or run the UI standalone with <code className="font-mono text-[11.5px] text-foreground">VITE_USE_MOCKS=true</code>.
      </span>
      <Button
        variant="ghost"
        size="xs"
        className="ml-auto"
        onClick={() => void health.refetch()}
        disabled={health.isFetching}
      >
        <RotateCw className={health.isFetching ? "animate-spin" : undefined} strokeWidth={1.5} />
        Retry
      </Button>
    </div>
  );
}
