import Script from "next/script";
import "./embed.css";

/** Embed routes need cross-origin isolation for Zoom gallery view (SharedArrayBuffer). */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/coi-serviceworker@2.0.0/coi-serviceworker.min.js"
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}
