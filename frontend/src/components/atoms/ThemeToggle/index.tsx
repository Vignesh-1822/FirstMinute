import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Theme } from "@/types";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Button variant="ghost" size="icon-sm" onClick={onToggle} aria-label={`Switch to ${next} theme`}>
      {theme === "dark" ? <Sun strokeWidth={1.5} /> : <Moon strokeWidth={1.5} />}
    </Button>
  );
}
