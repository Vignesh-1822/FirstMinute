import { CornerMarks, Eyebrow } from "@/components/atoms";

const STACK = [
  { name: "Jev", by: "by TypeSafe", role: "Item-level scoring with calibrated confidence", className: "font-mono font-semibold tracking-tight" },
  { name: "Photon", by: "Spectrum", role: "iMessage threads for medic and stroke team", className: "font-semibold tracking-[-0.02em]" },
  { name: "Browserbase", by: "headless browser", role: "Reads the regional hospital status board", className: "font-medium tracking-[-0.02em]" },
  { name: "Stagehand", by: "extract()", role: "Structured status from an unstructured page", className: "font-serif italic" },
  { name: "GMI Cloud", by: "inference", role: "SBAR handoff drafting", className: "font-semibold uppercase tracking-[0.06em] text-[15px]" },
  { name: "CodeRabbit", by: "review", role: "Reviewed every pull request", className: "font-medium" },
];

export function BuiltWithSection() {
  return (
    <section id="stack" className="scroll-mt-14 border-b">
      <div className="relative mx-auto max-w-[1200px] border-x">
        <CornerMarks corners={["bl", "br"]} />
        <div className="flex items-end justify-between gap-6 border-b px-6 py-10 md:px-10">
          <div>
            <Eyebrow>Built with</Eyebrow>
            <h2 className="mt-3 text-[26px] leading-tight font-semibold tracking-[-0.025em]">Each piece does one job.</h2>
          </div>
          <p className="hidden max-w-sm text-[13.5px] text-muted-foreground md:block">
            Every integration runs live when its key is set and says “simulated” when it isn't. The UI never pretends.
          </p>
        </div>
        <ul className="grid grid-cols-2 divide-x divide-y md:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
          {STACK.map((item) => (
            <li key={item.name} className="flex flex-col gap-3 p-6">
              <span className={`text-[19px] text-foreground ${item.className}`}>{item.name}</span>
              <span className="font-mono text-[10.5px] text-faint">{item.by}</span>
              <span className="text-[12.5px] leading-snug text-muted-foreground">{item.role}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
