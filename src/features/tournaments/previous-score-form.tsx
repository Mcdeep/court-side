import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Field } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { pairNames } from "#/lib/names";
import type { Match, PreviousScore } from "./types";

export function PreviousScoreForm({
  match,
  onConfirm,
}: {
  match: Match;
  onConfirm: (score: PreviousScore) => void;
}) {
  const [a, setA] = useState(match.scoreA === undefined ? "" : String(match.scoreA));
  const [b, setB] = useState(match.scoreB === undefined ? "" : String(match.scoreB));
  const [error, setError] = useState("");

  function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!a.trim() || !b.trim()) {
      setError("Enter both previous scores");
      return;
    }
    const scoreA = Number(a),
      scoreB = Number(b);
    if ([scoreA, scoreB].some((score) => !Number.isInteger(score) || score < 0)) {
      setError("Previous scores must be non-negative whole numbers");
      return;
    }
    onConfirm({ scoreA, scoreB });
  }

  return (
    <form onSubmit={confirm} noValidate className="space-y-4">
      <div>
        <h2 className="font-semibold">Restore previous result</h2>
        <p className="mt-1 text-sm text-ink-mute">
          This completed match has no saved result. Enter the score previously counted in standings.
          You can then keep it or correct it.
        </p>
      </div>
      <Field label={pairNames(match.pairA).join(" / ")}>
        <Input
          type="number"
          min={0}
          step={1}
          value={a}
          onChange={(e) => setA(e.target.value)}
          aria-label="Previous score for side A"
        />
      </Field>
      <Field label={pairNames(match.pairB).join(" / ")}>
        <Input
          type="number"
          min={0}
          step={1}
          value={b}
          onChange={(e) => setB(e.target.value)}
          aria-label="Previous score for side B"
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" className="w-full">
        Continue
      </Button>
    </form>
  );
}
