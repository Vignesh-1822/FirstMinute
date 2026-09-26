import { cn } from "@/lib/utils";

interface CornerMarksProps {
  className?: string;
  /** Which corners get a mark. */
  corners?: Array<"tl" | "tr" | "bl" | "br">;
}

const POSITION: Record<"tl" | "tr" | "bl" | "br", string> = {
  tl: "-left-[5px] -top-[5px]",
  tr: "-right-[5px] -top-[5px]",
  bl: "-bottom-[5px] -left-[5px]",
  br: "-bottom-[5px] -right-[5px]",
};

/** Registration "+" marks on frame intersections (after Pixel-Perfect's section chrome). */
export function CornerMarks({ className, corners = ["tl", "tr", "bl", "br"] }: CornerMarksProps) {
  return (
    <>
      {corners.map((corner) => (
        <svg
          key={corner}
          aria-hidden
          viewBox="0 0 9 9"
          className={cn("pointer-events-none absolute z-10 size-[9px] text-border-strong", POSITION[corner], className)}
        >
          <path d="M4.5 0v9M0 4.5h9" stroke="currentColor" strokeWidth="1" />
        </svg>
      ))}
    </>
  );
}
