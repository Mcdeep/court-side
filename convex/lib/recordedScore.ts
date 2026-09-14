import type { Doc } from "../_generated/dataModel";

export function getRecordedScore(match: Doc<"matches">) {
  if (match.scoreA !== undefined && match.scoreB !== undefined) {
    return { scoreA: match.scoreA, scoreB: match.scoreB };
  }
  // Old admin resolutions approved submissions without saving the chosen
  // result, so even agreeing approved submissions cannot prove the final score.
  return null;
}
