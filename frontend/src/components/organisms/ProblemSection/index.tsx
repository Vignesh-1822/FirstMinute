import { useEffect, useState } from "react";
import { CornerMarks, Eyebrow } from "@/components/atoms";
import { StatCell } from "@/components/molecules";

const NEURONS_PER_SECOND = 1_900_000 / 60;

function NeuronCounter() {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  const neurons = Math.round(((now - start) / 1000) * NEURONS_PER_SECOND);
  return <span className="font-mono tabular-nums text-foreground">{neurons.toLocaleString("en-US")}</span>;
}

export function ProblemSection() {
  return (
    <section id="problem" className="scroll-mt-14 border-b">
      <div className="relative mx-auto max-w-[1200px] border-x">
        <CornerMarks corners={["bl", "br"]} />
        <div className="grid gap-6 border-b px-6 py-14 md:grid-cols-[1fr_1fr] md:px-10">
          <div>
            <Eyebrow>The problem, in numbers</Eyebrow>
            <h2 className="mt-3 max-w-[18ch] text-[34px] leading-[1.05] font-semibold tracking-[-0.03em]">
              Stroke care is fast. The handoff isn't.
            </h2>
          </div>
          <p className="self-end text-[15px] leading-relaxed text-muted-foreground">
            Medics see a stroke in roughly 2% of calls, so the scale is rusty. The digital options are forms: minutes of tapping on a moving stretcher. So the hospital often hears late — by radio, in the last few minutes.
            <span className="mt-3 block text-[13px]">
              Since you opened this page, an untreated stroke would have cost <NeuronCounter /> neurons.
            </span>
          </p>
        </div>
        <div className="grid divide-y md:grid-cols-4 md:divide-x md:divide-y-0">
          <StatCell index="01" value="1.9M" label="neurons lost every minute a large stroke goes untreated" source="Saver · Stroke, 2006" />
          <StatCell index="02" value="1 in 3" label="EMS stroke patients arrive with no hospital pre-notification" source="GWTG-Stroke · 2003–2011" />
          <StatCell index="03" value="~2 min" label="of tapping to complete a guided stroke triage form" source="JoinTriage · vendor figure" />
          <StatCell index="04" value="5 min" label="before arrival is sometimes the first radio contact" source="NPSTC report" />
        </div>
      </div>
    </section>
  );
}
