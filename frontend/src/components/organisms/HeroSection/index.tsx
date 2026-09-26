import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { CornerMarks } from "@/components/atoms";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/queryKeys";
import { HeroConsolePreview } from "../HeroConsolePreview";

export function HeroSection() {
  return (
    <section className="relative border-b">
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 border-x bg-dot-grid px-6 py-20 md:px-10 lg:grid-cols-[1fr_520px] lg:py-28">
        <CornerMarks corners={["bl", "br"]} />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex flex-col"
        >
          <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            <span className="size-1.5 rounded-full bg-signal" aria-hidden />
            Pre-hospital stroke triage · voice first
          </span>
          <h1 className="mt-6 text-[44px] leading-[0.98] font-semibold tracking-[-0.035em] text-foreground sm:text-[60px] lg:text-[68px]">
            The first minute
            <br />
            decides the stroke.
          </h1>
          <p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-muted-foreground">
            The paramedic talks. FirstMinute scores the stroke scale from their words, asks only what's missing, and pre-alerts the right stroke team — before the ambulance turns the corner.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild variant="tactile-ink" size="xl" className="px-5">
              <Link to={ROUTES.console}>
                Open the console
                <ArrowRight strokeWidth={1.75} />
              </Link>
            </Button>
            <Button asChild variant="tactile" size="xl" className="px-5">
              <a href="#how">How it works</a>
            </Button>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t pt-5">
            {[
              { value: "0", label: "forms to fill" },
              { value: "~150 ms", label: "per Jev decision" },
              { value: "1 tap", label: "to pre-alert" },
            ].map((fact) => (
              <div key={fact.label}>
                <dt className="sr-only">{fact.label}</dt>
                <dd className="font-mono text-[18px] tabular-nums text-foreground">{fact.value}</dd>
                <dd className="mt-0.5 text-[12px] text-muted-foreground">{fact.label}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
          className="flex justify-center lg:justify-end"
        >
          <HeroConsolePreview />
        </motion.div>
      </div>
    </section>
  );
}
