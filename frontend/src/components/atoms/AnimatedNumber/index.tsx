import { animate, useMotionValue, useReducedMotion, useTransform, motion } from "motion/react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  className?: string;
  /** Pads with figure spaces to avoid layout shift, e.g. 2 -> " 7". */
  minDigits?: number;
  prefix?: string;
  suffix?: string;
}

/** Tabular mono numeral that ticks to its new value. */
export function AnimatedNumber({ value, decimals = 0, className, minDigits = 0, prefix = "", suffix = "" }: AnimatedNumberProps) {
  const reducedMotion = useReducedMotion();
  const motionValue = useMotionValue(value);
  const text = useTransform(motionValue, (latest) => {
    const fixed = latest.toFixed(decimals);
    return `${prefix}${fixed.padStart(minDigits, " ")}${suffix}`;
  });

  useEffect(() => {
    if (reducedMotion) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, { type: "spring", stiffness: 300, damping: 30 });
    return () => controls.stop();
  }, [motionValue, reducedMotion, value]);

  return <motion.span className={cn("font-mono tabular-nums", className)}>{text}</motion.span>;
}
