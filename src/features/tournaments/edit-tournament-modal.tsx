import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "#/../convex/_generated/api";
import { AppDialog } from "#/components/app-dialog";
import { Button } from "#/components/ui/button";
import { Field } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Switch } from "#/components/ui/switch";
import { toDatetimeLocal } from "#/lib/format";
import { useAsyncAction } from "#/hooks/use-async-action";
import type { Id, Tournament } from "./types";
import { getRankingOrder } from "#/../convex/lib/tiebreaks";
import { TiebreakOrderField } from "./tiebreak-order-field";

export function EditTournamentModal({
  tournament,
  tournamentId,
  hasRounds,
  onClose,
}: {
  tournament: Tournament;
  tournamentId: Id<"tournaments">;
  hasRounds: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(tournament.name);
  const [tiebreakOrder, setTiebreakOrder] = useState(getRankingOrder(tournament.tiebreakOrder));
  const [seededScheduling, setSeededScheduling] = useState(!!tournament.seededScheduling);
  const tiebreaksLocked = tournament.tiebreakOrderLocked;
  const legacyStandings = tiebreaksLocked && !tournament.tiebreakOrder;
  const [roundMinutes, setRoundMinutes] = useState(
    tournament.roundDurationMs ? String(tournament.roundDurationMs / 60_000) : "",
  );
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(tournament.startsAt));
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(tournament.endsAt));
  const { working, error, setError, run } = useAsyncAction();
  const updateTournament = useMutation(api.tournaments.update);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name required");
      return;
    }
    await run(async () => {
      await updateTournament({
        tournamentId,
        name: name.trim(),
        tiebreakOrder:
          tournament.format === "americano" && !legacyStandings ? tiebreakOrder : undefined,
        seededScheduling:
          tournament.format === "round_robin" && seededScheduling !== !!tournament.seededScheduling
            ? seededScheduling
            : undefined,
        roundDurationMs: roundMinutes ? Number(roundMinutes) * 60_000 : undefined,
        startsAt: new Date(startsAt).getTime(),
        endsAt: new Date(endsAt).getTime(),
      });
      onClose();
    });
  }

  return (
    <AppDialog open onOpenChange={(o) => !o && onClose()} title="Edit tournament">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Round duration (minutes)">
          <Input
            type="number"
            min={1}
            max={60}
            value={roundMinutes}
            onChange={(e) => setRoundMinutes(e.target.value)}
            placeholder="Leave empty for no timer"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts">
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </Field>
          <Field label="Ends">
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </Field>
        </div>
        {tournament.format === "round_robin" && (
          <label className="flex items-center justify-between gap-2">
            <span className="text-sm">
              Seeded scheduling
              <span className="block text-[12.5px] text-ink-mute">
                Rank teams, and the closest match plays in the final round.
              </span>
            </span>
            <Switch
              checked={seededScheduling}
              onCheckedChange={setSeededScheduling}
              disabled={working || hasRounds}
            />
          </label>
        )}
        {tournament.format === "americano" &&
          (legacyStandings ? (
            <p className="text-sm text-ink-mute">
              This completed tournament keeps its original ranking by total points.
            </p>
          ) : (
            <TiebreakOrderField
              value={tiebreakOrder}
              onChange={setTiebreakOrder}
              disabled={working || tiebreaksLocked}
            />
          ))}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={working}>
            {working ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </AppDialog>
  );
}
