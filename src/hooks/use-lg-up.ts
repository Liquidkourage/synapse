"use client";

import { useSyncExternalStore } from "react";

/** Tailwind `lg` breakpoint (1024px) — room for 15/70/15 viewer layout. */
const LG_QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(LG_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(LG_QUERY).matches;
}

/** SSR / hydration: prefer mobile layout until the real viewport is known (avoids broken canvas + missing chat below lg). */
function getServerSnapshot() {
  return false;
}

export function useLgUp(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
