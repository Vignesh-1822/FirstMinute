import { MotionConfig } from "motion/react";
import { BrowserRouter } from "react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppRoutes } from "@/routes";

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={150}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </MotionConfig>
  );
}

export default App;
