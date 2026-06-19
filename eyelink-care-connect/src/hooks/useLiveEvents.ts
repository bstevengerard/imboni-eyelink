import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  LiveEvent,
  LiveEventAudience,
  MAX_QUEUE,
  publishLiveEvent,
  shouldShowToast,
  subscribeLiveEvents,
} from "@/lib/liveEvents";

interface Options {
  /** Show sonner toasts for incoming events (rate-limited globally). */
  toastEnabled?: boolean;
}

/**
 * useLiveEvents — subscribe a portal to the live event bus.
 *
 * Returns the most recent events (bounded queue) so dashboards can render an
 * activity feed without unbounded memory growth. Toasts are globally
 * rate-limited via `shouldShowToast`.
 */
export function useLiveEvents(audience: LiveEventAudience, options: Options = {}) {
  const { toastEnabled = true } = options;
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const pageVisibleRef = useRef(true);

  useEffect(() => {
    const onVis = () => {
      pageVisibleRef.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeLiveEvents(audience, (event) => {
      setEvents((prev) => {
        const next = [event, ...prev];
        if (next.length > MAX_QUEUE) next.length = MAX_QUEUE;
        return next;
      });

      if (!toastEnabled || !pageVisibleRef.current) return;
      if (!shouldShowToast()) return;

      const fn =
        event.level === "success"
          ? toast.success
          : event.level === "error"
            ? toast.error
            : event.level === "warning"
              ? toast.warning
              : toast.info;

      fn(event.title, { description: event.body });
    });

    return unsubscribe;
  }, [audience, toastEnabled]);

  return events;
}

