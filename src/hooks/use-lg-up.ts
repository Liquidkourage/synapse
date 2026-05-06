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

/** SSR / first client render: wide layout to reduce column flash on desktops. */
function getServerSnapshot() {
  return true;
}

export function useLgUp(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
