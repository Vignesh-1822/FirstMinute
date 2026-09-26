import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { Logo, ThemeToggle } from "@/components/atoms";
import { Button } from "@/components/ui/button";
import type { Theme } from "@/types";
import { ROUTES } from "@/lib/queryKeys";

interface LandingNavProps {
  theme: Theme;
  onToggleTheme: () => void;
}

const LINKS = [
  { href: "#problem", label: "Problem" },
  { href: "#how", label: "How it works" },
  { href: "#stack", label: "Built with" },
  { href: "#safety", label: "Safety" },
];

export function LandingNav({ theme, onToggleTheme }: LandingNavProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 border-x px-5" aria-label="Main">
        <Link to={ROUTES.home} aria-label="FirstMinute home" className="rounded-md">
          <Logo />
        </Link>
        <ul className="hidden items-center gap-5 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="rounded text-[13px] text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <Button asChild variant="tactile-ink" size="sm" className="h-8 rounded-lg px-3">
            <Link to={ROUTES.console}>
              Open the console
              <ArrowRight strokeWidth={1.75} />
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
