import { useEffect } from "react";
import {
  BuiltWithSection,
  HeroSection,
  HowItWorksSection,
  LandingFooter,
  LandingNav,
  ProblemSection,
  SafetySection,
} from "@/components/organisms";
import { useTheme } from "@/hooks";
import { LandingTemplate } from "@/templates/LandingTemplate";

export function LandingPage() {
  const { theme, toggleTheme } = useTheme("light", "fm-theme-landing");

  useEffect(() => {
    document.title = "FirstMinute — the first minute decides the stroke";
  }, []);

  return (
    <LandingTemplate nav={<LandingNav theme={theme} onToggleTheme={toggleTheme} />} footer={<LandingFooter />}>
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <BuiltWithSection />
      <SafetySection />
    </LandingTemplate>
  );
}
