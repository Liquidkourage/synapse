/** Client-safe constants (no Prisma / Node imports). */

export const ALLOCATION_TOTAL_BPS = 10_000;

export type AllocationLineInput = {
  /** null / undefined = UNALLOCATED pool */
  creatorId: string | null;
  weightBps: number;
};
