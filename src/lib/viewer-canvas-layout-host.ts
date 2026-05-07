import { z } from "zod";
import type { ViewerCanvasLayoutV1 } from "@/lib/viewer-canvas-layout-geometry";

const mobileTabZ = z.enum(["video", "primary", "secondary", "chat"]);

const normPanelZ = z.object({
  nx: z.number().min(0).max(1),
  ny: z.number().min(0).max(1),
  nw: z.number().min(0).max(1),
  nh: z.number().min(0).max(1),
  z: z.number().min(1).max(99),
});

export const viewerCanvasLayoutV1Z = z.object({
  version: z.literal(1),
  panels: z
    .object({
      video: normPanelZ.optional(),
      primary: normPanelZ.optional(),
      secondary: normPanelZ.optional(),
    })
    .strict(),
  mobile: z.object({ defaultTab: mobileTabZ }).optional(),
});

export function parseViewerCanvasLayoutFromDb(raw: unknown): ViewerCanvasLayoutV1 | null {
  const r = viewerCanvasLayoutV1Z.safeParse(raw);
  return r.success ? (r.data as ViewerCanvasLayoutV1) : null;
}
