/**
 * Helper to determine if the application is running in demonstration mode.
 */

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}
