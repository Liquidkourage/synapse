"use client";

import { useSyncExternalStore } from "react";

/** Tailwind `md` breakpoint (768px). */
const MD_QUERY = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(MD_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(MD_QUERY).matches;
}

/** SSR / first client render: desktop layout to reduce sidebar flash on wide screens. */
function getServerSnapshot() {
  return true;
}

export function useMdUp(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
