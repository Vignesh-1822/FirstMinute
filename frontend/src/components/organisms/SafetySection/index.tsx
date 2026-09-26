import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { CornerMarks, Eyebrow } from "@/components/atoms";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/queryKeys";

const PRINCIPLES = [
  { title: "Jev scores.", body: "Classification only — never arithmetic, never dates. Every item carries a probability." },
  { title: "Code decides.", body: "Totals, thresholds and routing live in one deterministic policy, with a rule trace for every choice." },
  { title: "The medic confirms.", body: "Nothing is sent until the medic taps confirm. Decision support, not autonomy." },
];

export function SafetySection() {
  return (
    <section id="safety" className="scroll-mt-14 border-b">
      <div className="relative mx-auto max-w-[1200px] border-x">
        <CornerMarks corners={["bl", "br"]} />
        <div className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          {PRINCIPLES.map((principle, index) => (
            <div key={principle.title} className="p-6 md:p-10">
              <span className="font-mono text-[11px] text-faint">0{index + 1}</span>
              <h3 className="mt-2 text-[26px] font-semibold tracking-[-0.025em] text-foreground">{principle.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{principle.body}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-start gap-5 border-t bg-dot-grid px-6 py-14 md:flex-row md:items-center md:justify-between md:px-10">
          <div>
            <Eyebrow>Try it</Eyebrow>
            <p className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">Play a scenario. Watch the scale fill itself.</p>
          </div>
          <Button asChild variant="tactile-ink" size="xl" className="px-5">
            <Link to={ROUTES.console}>
              Open the console
              <ArrowRight strokeWidth={1.75} />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
