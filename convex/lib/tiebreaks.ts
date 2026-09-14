import { v } from "convex/values";
import type { Infer } from "convex/values";

export const tiebreakValidator = v.union(v.literal("wins"), v.literal("point_diff"), v.literal("head_to_head"));
export type Tiebreak = Infer<typeof tiebreakValidator>;
export const DEFAULT_TIEBREAK_ORDER: Tiebreak[] = ["wins", "point_diff", "head_to_head"];
export const TIEBREAK_LABELS = { wins: "Matches won", point_diff: "Point difference", head_to_head: "Head-to-head" };

export function validateTiebreakOrder(order: readonly Tiebreak[]) {
  if (order.length !== 3 || new Set(order).size !== 3) {
    throw new Error("Choose each tiebreak exactly once");
  }
}
