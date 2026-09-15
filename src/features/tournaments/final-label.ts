const FINAL_LABELS = [
  "1st / 2nd place",
  "3rd / 4th place",
  "5th / 6th place",
  "7th / 8th place",
] as const;

export function finalPlacementLabel(index?: number) {
  return index === undefined ? undefined : FINAL_LABELS[index];
}
