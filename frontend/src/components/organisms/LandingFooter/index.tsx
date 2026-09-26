import { Link } from "react-router";
import { Logo } from "@/components/atoms";
import { ROUTES } from "@/lib/queryKeys";

export function LandingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 border-x px-6 py-10 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
            Hackathon prototype. Synthetic patients and a fictional city. Decision support, not a medical device — the medic always confirms.
          </p>
        </div>
        <div className="flex items-center gap-5 text-[12.5px] text-muted-foreground">
          <Link to={ROUTES.console} className="rounded hover:text-foreground">Console</Link>
          <a href="#how" className="rounded hover:text-foreground">How it works</a>
          <span className="font-mono text-[11px] text-faint">© 2026 FirstMinute</span>
        </div>
      </div>
    </footer>
  );
}
