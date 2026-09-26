import { CheckCheck } from "lucide-react";
import { MessageBubble, PhoneFrame, SbarCard } from "@/components/molecules";
import type { Case } from "@/types";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TeamThreadProps {
  caseData: Case;
  className?: string;
}

/** The CODE STROKE group thread the stroke team receives after the medic confirms. */
export function TeamThread({ caseData, className }: TeamThreadProps) {
  const alert = caseData.alert;
  const messages = caseData.messages.filter((message) => message.thread === "team");
  if (!alert) return null;
  return (
    <PhoneFrame
      title={alert.group_name}
      subtitle={`${alert.channel === "live" ? "iMessage group · Photon" : "Photon simulated"} · stroke team`}
      initials="CS"
      accent="signal"
      className={cn("min-h-0", className)}
    >
      <div className="flex flex-col gap-2">
        {messages.map((message) =>
          message.kind === "text" && message.text.startsWith("S:") ? (
            <SbarCard key={message.id} sbar={alert.sbar} source={alert.sbar_source} />
          ) : (
            <MessageBubble key={message.id} message={message} outgoing={false} showAuthor />
          ),
        )}
        {!messages.some((message) => message.text.startsWith("S:")) ? (
          <SbarCard sbar={alert.sbar} source={alert.sbar_source} />
        ) : null}
        <span className="flex items-center justify-end gap-1 pr-1 text-[10px] text-muted-foreground">
          <CheckCheck className="size-3" strokeWidth={1.75} aria-hidden />
          Delivered {formatClock(alert.sent_at)}
        </span>
      </div>
    </PhoneFrame>
  );
}
