import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProtocolId } from "@/types";

interface ProtocolSwitchProps {
  value: ProtocolId;
  onChange: (value: ProtocolId) => void;
  disabled?: boolean;
}

const OPTIONS: Array<{ id: ProtocolId; label: string }> = [
  { id: "stroke_race", label: "Stroke" },
  { id: "medevac_9line", label: "MEDEVAC" },
];

export function ProtocolSwitch({ value, onChange, disabled }: ProtocolSwitchProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        const option = OPTIONS.find((candidate) => candidate.id === next);
        if (option) onChange(option.id);
      }}
    >
      <TabsList aria-label="Protocol pack" className="h-7">
        {OPTIONS.map((option) => (
          <TabsTrigger key={option.id} value={option.id} disabled={disabled} className="px-2.5 text-xs">
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
