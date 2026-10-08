/** Copy + announcement text for Zoom breakout self-select (one room per team name). */

export function breakoutAssignmentAnnouncementBody(teamNames: string[]): string {
  const teams = teamNames.map((n) => n.trim()).filter(Boolean);
  if (teams.length === 0) {
    return "Breakouts are open — in Zoom, open Breakout rooms and choose your team room.";
  }
  return `Breakouts are open — in Zoom: Breakout rooms → choose your team: ${teams.join(" · ")}`;
}

export function breakoutAssignmentPlayerInstructions(teamNames: string[]): string {
  const teams = teamNames.map((n) => n.trim()).filter(Boolean);
  const list = teams.length > 0 ? teams.join(", ") : "your team room";
  return [
    "Join the Zoom meeting in the video panel.",
    "When breakouts open, open Breakout rooms in the Zoom toolbar (or More menu).",
    `Choose the room named for your team (${list}).`,
    "Confirm Join when prompted.",
  ].join("\n");
}

export function breakoutAssignmentHostOpenChecklist(): string[] {
  return [
    "Create rooms, then Open breakouts.",
    "In the Zoom breakout dialog, enable Let participants choose room (if shown).",
    "Pin the team list for viewers (button below) or post in chat.",
    "Unmute and use Broadcast voice so all rooms hear you.",
  ];
}
