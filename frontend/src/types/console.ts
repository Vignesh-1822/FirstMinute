import type { useConsoleSession } from "@/hooks/useConsoleSession";

/** Everything the console page hands down to its organisms. */
export type ConsoleSession = ReturnType<typeof useConsoleSession>;
