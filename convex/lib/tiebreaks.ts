import { v } from "convex/values";
import type { Infer } from "convex/values";

export const tiebreakValidator = v.union(
  v.literal("points"),
  v.literal("wins"),
  v.literal("point_diff"),
  v.literal("head_to_head"),
);
export type Tiebreak = Infer<typeof tiebreakValidator>;
export const DEFAULT_TIEBREAK_ORDER: Tiebreak[] = ["points", "wins", "point_diff", "head_to_head"];
export const TIEBREAK_LABELS = {
  points: "Total points",
  wins: "Matches won",
  point_diff: "Point difference",
  head_to_head: "Head-to-head",
};

export function getRankingOrder(order: readonly Tiebreak[] = DEFAULT_TIEBREAK_ORDER): Tiebreak[] {
  // Previously stored orders omitted the implicit points-first criterion.
  return order.includes("points") ? [...order] : ["points", ...order];
}

export function validateTiebreakOrder(order: readonly Tiebreak[]) {
  if (order.length !== 4 || new Set(order).size !== 4) {
    throw new Error("Choose each ranking criterion exactly once");
  }
}
