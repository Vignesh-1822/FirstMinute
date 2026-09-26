import { CornerDownLeft, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FollowUp } from "@/types";
import { cn } from "@/lib/utils";

interface FollowUpPromptProps {
  followUp: FollowUp;
  itemLabel: string;
  quickAnswers: string[];
  scenarioAnswer?: string;
  pending: boolean;
  /** While the medic is still talking the gap may close by itself. */
  provisional: boolean;
  onAnswer: (text: string) => void;
}

/** One targeted question back to the medic, with quick answers and a free-text reply. */
export function FollowUpPrompt({
  followUp,
  itemLabel,
  quickAnswers,
  scenarioAnswer,
  pending,
  provisional,
  onAnswer,
}: FollowUpPromptProps) {
  const [draft, setDraft] = useState("");
  const inputId = `followup-${followUp.item_id}`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    onAnswer(draft.trim());
    setDraft("");
  };

  return (
    <li
      className={cn(
        "rounded-lg border bg-uncertain-soft/60 p-3 transition-opacity",
        followUp.reason === "missing" ? "border-dashed border-uncertain/60" : "border-uncertain/40",
        provisional && "opacity-70",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-[5px] size-1.5 shrink-0 rounded-full bg-uncertain" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] text-uncertain-ink">
            <span className="font-medium">{itemLabel}</span>
            <span aria-hidden>·</span>
            <span>{followUp.reason === "missing" ? "Not mentioned" : "Low confidence"}</span>
            {provisional ? <span className="ml-auto text-muted-foreground">may resolve as they talk</span> : null}
          </div>
          <label htmlFor={inputId} className="mt-0.5 block text-[13.5px] font-medium text-foreground">
            {followUp.question}
          </label>
          <form onSubmit={submit} className="mt-2.5 flex items-center gap-1.5">
            {quickAnswers.map((answer) => (
              <Button
                key={answer}
                type="button"
                variant="tactile"
                size="xs"
                className="h-7 rounded-md px-2 text-xs"
                disabled={pending}
                onClick={() => onAnswer(answer)}
              >
                {answer}
              </Button>
            ))}
            <div className="relative min-w-0 flex-1">
              <Input
                id={inputId}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type the medic's answer"
                disabled={pending}
                className="h-7 bg-card pr-8 text-xs md:text-xs dark:bg-card"
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon-xs"
                disabled={pending || !draft.trim()}
                aria-label="Send answer"
                className="absolute top-0.5 right-0.5"
              >
                {pending ? <Loader2 className="animate-spin" /> : <CornerDownLeft strokeWidth={1.5} />}
              </Button>
            </div>
          </form>
          {scenarioAnswer ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => onAnswer(scenarioAnswer)}
              className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate rounded text-left text-[11.5px] text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground disabled:opacity-50"
            >
              Use scenario answer: <span className="truncate text-foreground">“{scenarioAnswer}”</span>
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
