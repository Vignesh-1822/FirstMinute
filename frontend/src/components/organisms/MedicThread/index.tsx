import { useEffect, useRef } from "react";
import { ComposeBox, MessageBubble, PhoneFrame } from "@/components/molecules";
import type { ConsoleSession } from "@/types";
import { cn } from "@/lib/utils";

interface MedicThreadProps {
  session: ConsoleSession;
  className?: string;
}

/**
 * The medic's side of the Photon conversation. Messages typed here go to
 * /api/photon/inbound as "Medic 14" (simulated: true) — the same path a real iMessage takes.
 */
export function MedicThread({ session, className }: MedicThreadProps) {
  const messages = (session.caseData?.messages ?? []).filter((message) => message.thread === "medic");
  const scrollAnchor = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <PhoneFrame
      title="FirstMinute"
      subtitle="iMessage · via Photon"
      initials="FM"
      className={cn("min-h-0", className)}
      footer={
        <ComposeBox
          label="Message FirstMinute as Medic 14"
          placeholder="iMessage"
          rows={1}
          onSubmit={(text) => void session.sendMedicMessage(text)}
          disabled={session.isSendingMedic}
          className="[&_textarea]:rounded-2xl [&_textarea]:py-1.5 [&_textarea]:text-[12.5px]"
        />
      }
    >
      {messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-1.5 px-3 text-center">
          <p className="text-[11.5px] font-medium text-foreground">No messages on this case</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            A medic can run the whole flow over iMessage. Text a report — replies land here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} outgoing={message.role === "medic"} />
          ))}
          <div ref={scrollAnchor} />
        </div>
      )}
    </PhoneFrame>
  );
}
