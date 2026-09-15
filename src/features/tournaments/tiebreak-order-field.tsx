import type { Tiebreak } from "#/../convex/lib/tiebreaks";
import { TIEBREAK_LABELS } from "#/../convex/lib/tiebreaks";
import { Button } from "#/components/ui/button";
import { Field } from "#/components/ui/field";

export function TiebreakOrderField({
  value,
  onChange,
  disabled = false,
}: {
  value: readonly Tiebreak[];
  onChange: (value: Tiebreak[]) => void;
  disabled?: boolean;
}) {
  function move(index: number, direction: number) {
    const next = [...value];
    const target = index + direction;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <Field label="Ranking order">
      <p className="mb-3 text-xs text-ink-mute">
        Move the criteria into your preferred order. The first determines the ranking; the rest
        break ties.
      </p>
      <ol
        aria-label="Ranking order"
        className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white px-3"
      >
        {value.map((criterion, index) => (
          <li key={criterion} className="flex items-center gap-3 py-2">
            <span className="w-5 text-center font-mono text-xs text-ink-mute">{index + 1}</span>
            <span className="flex-1 text-sm font-semibold">{TIEBREAK_LABELS[criterion]}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled || index === 0}
              aria-label={`Move ${TIEBREAK_LABELS[criterion]} up`}
              onClick={() => move(index, -1)}
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled || index === value.length - 1}
              aria-label={`Move ${TIEBREAK_LABELS[criterion]} down`}
              onClick={() => move(index, 1)}
            >
              ↓
            </Button>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-ink-mute">
        Players still level share a position. The order locks when the tournament is completed.
      </p>
    </Field>
  );
}
