/** Parse/save preset breakout team names (one room per team). */

export function parseBreakoutTeamNamesFromForm(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 50);
}

export function breakoutTeamNamesFromDb(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => x.length > 0)
    .slice(0, 50);
}

export function breakoutTeamNamesToFormValue(names: string[]): string {
  return names.join("\n");
}
