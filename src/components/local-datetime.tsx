"use client";

/** Renders an instant in the viewer's local timezone (browser). */
export function LocalDateTime({
  iso,
  options,
}: {
  iso: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return <span>—</span>;
  return (
    <time dateTime={iso}>
      {d.toLocaleString(undefined, options ?? { dateStyle: "medium", timeStyle: "short" })}
    </time>
  );
}
