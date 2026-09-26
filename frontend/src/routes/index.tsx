import { Route, Routes } from "react-router";
import { ConsolePage } from "@/pages/ConsolePage";
import { LandingPage } from "@/pages/LandingPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ROUTES } from "@/lib/queryKeys";

export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<LandingPage />} />
      <Route path={ROUTES.console} element={<ConsolePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
