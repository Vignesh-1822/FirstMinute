import { Link } from "react-router";
import { DotMatrix } from "@/components/atoms";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/queryKeys";

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-dot-grid text-center">
      <DotMatrix size={40} pattern="cross" className="text-foreground" />
      <h1 className="text-xl font-semibold">Nothing at this address</h1>
      <Button asChild variant="tactile">
        <Link to={ROUTES.home}>Back to FirstMinute</Link>
      </Button>
    </main>
  );
}
