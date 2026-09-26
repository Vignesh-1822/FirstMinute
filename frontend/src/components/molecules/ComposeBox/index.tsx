import { ArrowUp } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ComposeBoxProps {
  placeholder: string;
  label: string;
  onSubmit: (text: string) => void;
  disabled?: boolean;
  className?: string;
  rows?: number;
}

/** Textarea + send. Enter sends, Shift+Enter adds a line. */
export function ComposeBox({ placeholder, label, onSubmit, disabled, className, rows = 2 }: ComposeBoxProps) {
  const [draft, setDraft] = useState("");

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    if (!draft.trim() || disabled) return;
    onSubmit(draft.trim());
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <form onSubmit={send} className={cn("relative", className)}>
      <Textarea
        aria-label={label}
        value={draft}
        rows={rows}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="field-sizing-fixed min-h-0 resize-none bg-card pr-10 text-[13px] md:text-[13px] dark:bg-card"
      />
      <Button
        type="submit"
        size="icon-sm"
        variant="tactile-ink"
        disabled={disabled || !draft.trim()}
        aria-label="Send"
        className="absolute right-1.5 bottom-1.5 rounded-md"
      >
        <ArrowUp strokeWidth={2} />
      </Button>
    </form>
  );
}
