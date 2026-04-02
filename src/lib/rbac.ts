import type { Role } from "@/generated/prisma";

const order: Role[] = ["PLAYER", "HOST", "PRODUCER", "ADMIN"];

export function hasRole(userRole: Role | undefined, min: Role): boolean {
  if (!userRole) return false;
  return order.indexOf(userRole) >= order.indexOf(min);
}

export function isAdmin(role: Role | undefined) {
  return role === "ADMIN";
}

export function isProducerOrAbove(role: Role | undefined) {
  return hasRole(role, "PRODUCER");
}

export function isHostOrAbove(role: Role | undefined) {
  return hasRole(role, "HOST");
}
