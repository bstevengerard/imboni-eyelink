import { describe, expect, it, vi } from "vitest";
import { publishLiveEvent, shouldShowToast, subscribeLiveEvents } from "@/lib/liveEvents";

describe("liveEvents", () => {
  it("delivers published events to matching audiences", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLiveEvents("patient", listener);

    const event = publishLiveEvent({
      audience: "patient",
      level: "info",
      title: "Appointment synced",
    });

    expect(event).toEqual(expect.objectContaining({ audience: "patient", title: "Appointment synced" }));
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ audience: "patient", title: "Appointment synced" }));

    unsubscribe();
  });

  it("ignores non-matching audiences", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLiveEvents("doctor", listener);

    publishLiveEvent({
      audience: "patient",
      level: "info",
      title: "Patient event",
    });

    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  it("rate-limits toast bursts", () => {
    expect(shouldShowToast(1000)).toBe(true);
    expect(shouldShowToast(1001)).toBe(true);
    expect(shouldShowToast(1002)).toBe(true);
    expect(shouldShowToast(1003)).toBe(true);
    expect(shouldShowToast(1004)).toBe(false);
  });
});
