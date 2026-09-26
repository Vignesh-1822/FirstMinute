import { ModeBadge } from "@/components/atoms";
import type { Health } from "@/types";

interface ModeBadgesProps {
  health: Health | undefined;
  mockMode: boolean;
}

/** Honest integration modes from /api/health — LIVE only when the backend says so. */
export function ModeBadges({ health, mockMode }: ModeBadgesProps) {
  if (!health) {
    return (
      <div className="flex items-center gap-1.5" aria-label="Integration modes unknown">
        {["Jev", "GMI", "Browser", "Photon"].map((name) => (
          <ModeBadge key={name} name={name} state="––" live={false} className="opacity-60" />
        ))}
      </div>
    );
  }
  const { modes } = health;
  return (
    <div className="flex items-center gap-1.5">
      {mockMode ? <ModeBadge name="Backend" state="MOCK" live={false} title="VITE_USE_MOCKS=true — in-browser simulation" /> : null}
      <ModeBadge name="Jev" state={modes.jev === "live" ? "LIVE" : "SIM"} live={modes.jev === "live"} title={`Jev scoring: ${modes.jev}`} />
      <ModeBadge name="GMI" state={modes.gmi === "live" ? "LIVE" : "SIM"} live={modes.gmi === "live"} title={`GMI Cloud SBAR: ${modes.gmi}`} />
      <ModeBadge
        name="Status"
        state={modes.browser === "browserbase" ? "BROWSERBASE" : "DIRECT"}
        live={modes.browser === "browserbase"}
        title={modes.browser === "browserbase" ? "Hospital board scraped via Browserbase + Stagehand" : "Hospital board read by direct HTML scrape"}
      />
      <ModeBadge name="Photon" state={modes.photon === "live" ? "LIVE" : "SIM"} live={modes.photon === "live"} title={`Photon messaging: ${modes.photon}`} />
    </div>
  );
}
