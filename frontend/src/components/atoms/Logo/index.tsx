import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}

/** 3×3 dot mark: eight neutral dots, one signal dot — the first minute. */
export function Logo({ className, showWordmark = true, size = 18 }: LogoProps) {
  const cells = Array.from({ length: 9 }, (_, index) => index);
  const dot = size / 5;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="grid shrink-0"
        style={{ width: size, height: size, gridTemplateColumns: "repeat(3, 1fr)", placeItems: "center" }}
      >
        {cells.map((cell) => (
          <span
            key={cell}
            className={cn("rounded-full", cell === 0 ? "bg-signal" : "bg-foreground/80")}
            style={{ width: dot, height: dot, opacity: cell === 0 ? 1 : 0.35 + (cell % 3) * 0.2 }}
          />
        ))}
      </span>
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
          First<span className="text-muted-foreground">Minute</span>
        </span>
      ) : null}
    </span>
  );
}
