// Tiny client-side event bus connecting AI responses to the billing UI:
// usage updates drive the "approaching your limit" toast, and entitlement
// blocks (402 ai_limit / 403 feature_locked) drive the upgrade modal.

export type UsageInfo = { used: number; limit: number; plan: string };
export type EntitlementBlock =
  | { kind: "ai_limit"; used: number; limit: number; plan: string }
  | { kind: "feature_locked"; feature: string; requiredPlan: string; plan: string }
  // Generic plan limit prompt (e.g. subject cap) raised by the client.
  | { kind: "limit"; title: string; description: string; requiredPlan: string };

type UsageFn = (u: UsageInfo) => void;
type BlockFn = (b: EntitlementBlock) => void;

const usageSubs = new Set<UsageFn>();
const blockSubs = new Set<BlockFn>();

export function onUsage(fn: UsageFn): () => void {
  usageSubs.add(fn);
  return () => void usageSubs.delete(fn);
}
export function emitUsage(u: UsageInfo): void {
  usageSubs.forEach((f) => f(u));
}

export function onBlock(fn: BlockFn): () => void {
  blockSubs.add(fn);
  return () => void blockSubs.delete(fn);
}
export function emitBlock(b: EntitlementBlock): void {
  blockSubs.forEach((f) => f(b));
}

// Fired when an AI call fell back to the offline generator (AI unreachable) —
// so the UI can tell the user the output isn't from the real model.
type VoidFn = () => void;
const offlineSubs = new Set<VoidFn>();
export function onOffline(fn: VoidFn): () => void {
  offlineSubs.add(fn);
  return () => void offlineSubs.delete(fn);
}
export function emitOffline(): void {
  offlineSubs.forEach((f) => f());
}
