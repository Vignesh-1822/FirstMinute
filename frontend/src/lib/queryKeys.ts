export const queryKeys = {
  health: ["health"] as const,
  protocols: ["protocols"] as const,
  scenarios: ["scenarios"] as const,
  hospitals: ["hospitals"] as const,
  cases: ["cases"] as const,
  case: (caseId: string) => ["case", caseId] as const,
};

export const ROUTES = {
  home: "/",
  console: "/console",
} as const;
