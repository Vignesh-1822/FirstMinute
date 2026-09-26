import type { ReactNode } from "react";

interface LandingTemplateProps {
  nav: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}

export function LandingTemplate({ nav, children, footer }: LandingTemplateProps) {
  return (
    <div className="grain min-h-svh bg-background text-foreground">
      {nav}
      <main>{children}</main>
      {footer}
    </div>
  );
}
