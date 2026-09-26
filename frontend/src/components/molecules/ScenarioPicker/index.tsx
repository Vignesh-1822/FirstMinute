import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Scenario } from "@/types";

interface ScenarioPickerProps {
  scenarios: Scenario[];
  selectedId: string | null;
  onSelect: (scenarioId: string) => void;
  disabled?: boolean;
}

export function ScenarioPicker({ scenarios, selectedId, onSelect, disabled }: ScenarioPickerProps) {
  return (
    <Select value={selectedId ?? undefined} onValueChange={onSelect} disabled={disabled || scenarios.length === 0}>
      <SelectTrigger aria-label="Demo scenario" className="h-8 w-full min-w-0 bg-card text-[13px] dark:bg-card">
        <SelectValue placeholder={scenarios.length ? "Choose a scenario" : "No scenarios"} />
      </SelectTrigger>
      <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
        {scenarios.map((scenario) => (
          <SelectItem key={scenario.id} value={scenario.id} className="py-1.5">
            <span className="flex min-w-0 flex-col">
              <span className="text-[13px] font-medium">{scenario.title}</span>
              <span className="truncate text-[11.5px] text-muted-foreground">{scenario.subtitle}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
