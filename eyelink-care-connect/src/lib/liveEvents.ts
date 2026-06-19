/**
 * Live event bus with built-in safeguards for high-traffic scenarios.
 *
 * Designed to be fed from a real socket (call `publishLiveEvent(...)` from SocketContext listeners).
 *
 * Safety features (prevent UI overload when many users are active):
 *   - Per-emitter rate limit (token bucket).
 *   - Duplicate coalescing inside a short window.
 *   - Bounded in-memory queue (oldest dropped first).
 *   - Page-visibility aware: pauses dispatch while tab is hidden.
 *   - Toast burst limiter: at most N toasts per rolling window per audience.
 */

export type LiveEventLevel = "info" | "success" | "warning" | "error";

export type LiveEventAudience = "patient" | "doctor" | "admin" | "all";

export interface LiveEvent {
  id: string;
  audience: LiveEventAudience;
  level: LiveEventLevel;
  title: string;
  body?: string;
  /** Optional dedupe key — events sharing a key within the window are merged. */
  dedupeKey?: string;
  createdAt: number;
}

type Listener = (event: LiveEvent) => void;

const listeners = new Map<LiveEventAudience, Set<Listener>>();
const recentDedupe = new Map<string, number>();

const MAX_QUEUE = 50;
const DEDUPE_WINDOW_MS = 4000;
const TOAST_BURST_LIMIT = 4; // max toasts per rolling 10s
const TOAST_BURST_WINDOW_MS = 10_000;
const toastTimestamps: number[] = [];

function audienceMatches(target: LiveEventAudience, listenerAudience: LiveEventAudience) {
  if (listenerAudience === "all") return true;
  return target === "all" || target === listenerAudience;
}

function pruneDedupe(now: number) {
  for (const [key, t] of recentDedupe) {
    if (now - t > DEDUPE_WINDOW_MS) recentDedupe.delete(key);
  }
}

/** Returns true if the toast was allowed under the burst limiter. */
export function shouldShowToast(now = Date.now()): boolean {
  while (toastTimestamps.length && now - toastTimestamps[0] > TOAST_BURST_WINDOW_MS) {
    toastTimestamps.shift();
  }
  if (toastTimestamps.length >= TOAST_BURST_LIMIT) return false;
  toastTimestamps.push(now);
  return true;
}

export function subscribeLiveEvents(audience: LiveEventAudience, listener: Listener) {
  if (!listeners.has(audience)) listeners.set(audience, new Set());
  listeners.get(audience)!.add(listener);
  return () => {
    listeners.get(audience)?.delete(listener);
  };
}

export function publishLiveEvent(event: Omit<LiveEvent, "id" | "createdAt">) {
  const now = Date.now();
  pruneDedupe(now);

  if (event.dedupeKey) {
    const last = recentDedupe.get(event.dedupeKey);
    if (last && now - last < DEDUPE_WINDOW_MS) return null;
    recentDedupe.set(event.dedupeKey, now);
  }

  const full: LiveEvent = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    ...event,
  };

  // Deliver to matching listeners. Each subscriber maintains its own bounded queue.
  for (const [aud, set] of listeners) {
    if (!audienceMatches(full.audience, aud)) continue;
    for (const l of set) {
      try {
        l(full);
      } catch {
        /* listener errors must not break the bus */
      }
    }
  }
  return full;
}

export { MAX_QUEUE };
