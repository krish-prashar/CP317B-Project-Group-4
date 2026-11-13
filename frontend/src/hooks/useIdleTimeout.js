import { useEffect, useRef } from "react";
import { IDLE_MS } from "../lib/session.js";

/** Calls onIdle after IDLE_MS without a click, key press or mouse movement. */
export function useIdleTimeout(enabled, onIdle, onActivity) {
  const lastActive = useRef(Date.now());
  const lastSaved = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    lastActive.current = Date.now();

    const touch = () => {
      lastActive.current = Date.now();
      // Keep the stored session fresh, but not on every mouse move.
      if (lastActive.current - lastSaved.current > 5000) {
        lastSaved.current = lastActive.current;
        onActivity?.();
      }
    };
    const events = ["click", "keydown", "pointermove"];
    events.forEach(ev => document.addEventListener(ev, touch));
    const timer = setInterval(() => {
      if (Date.now() - lastActive.current > IDLE_MS) onIdle();
    }, 15000);

    return () => {
      events.forEach(ev => document.removeEventListener(ev, touch));
      clearInterval(timer);
    };
  }, [enabled, onIdle, onActivity]);
}
