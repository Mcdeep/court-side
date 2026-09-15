import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "#/../convex/_generated/api";
import type { Id } from "#/../convex/_generated/dataModel";
import { AppDialog } from "#/components/app-dialog";
import { Button } from "#/components/ui/button";
import { Icon } from "#/components/ui/icon";
import { formatDate } from "#/lib/format";
import { useAsyncAction } from "#/hooks/use-async-action";

// Copies participants from another tournament in the same org, one
// participants.add call per member — same insert path as adding a player by
// hand, so it picks up each member's current rating rather than a stale copy.
export function CopyRosterModal({
  tournamentId,
  organizationId,
  existingMemberIds,
  onClose,
}: {
  tournamentId: Id<"tournaments">;
  organizationId: Id<"organizations">;
  existingMemberIds: Id<"members">[];
  onClose: () => void;
}) {
  const [sourceId, setSourceId] = useState<Id<"tournaments"> | null>(null);
  const [copiedCount, setCopiedCount] = useState(0);
  const { working, error, run } = useAsyncAction();

  const tournaments = useQuery(api.tournaments.list, { organizationId });
  const sourceParticipants = useQuery(
    api.participants.list,
    sourceId ? { tournamentId: sourceId } : "skip",
  );
  const addParticipant = useMutation(api.participants.add);

  const otherTournaments = (tournaments ?? []).filter((t) => t._id !== tournamentId);
  const toCopy = (sourceParticipants ?? []).filter(
    (p) => p.memberId && !existingMemberIds.includes(p.memberId),
  );

  async function copyRoster() {
    if (toCopy.length === 0) return;
    await run(async () => {
      for (const p of toCopy) {
        await addParticipant({ tournamentId, memberId: p.memberId!, entryType: "solo" });
        setCopiedCount((c) => c + 1);
      }
    });
  }

  return (
    <AppDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={
        <>
          Copy roster from…
          {copiedCount > 0 && (
            <span className="ml-2 text-[12px] font-semibold text-accent-dark bg-accent-soft px-2 py-0.5 rounded-full align-middle">
              {copiedCount} copied
            </span>
          )}
        </>
      }
    >
      <div className="space-y-3">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {!sourceId ? (
          <div className="max-h-72 overflow-y-auto -mx-1 space-y-0.5">
            {tournaments === undefined ? (
              <div className="text-center py-6 text-ink-mute text-sm animate-pulse">Loading…</div>
            ) : otherTournaments.length === 0 ? (
              <div className="text-center py-6 text-ink-mute text-sm">
                No other tournaments to copy from.
              </div>
            ) : (
              otherTournaments.map((t) => (
                <button
                  key={t._id}
                  onClick={() => setSourceId(t._id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{t.name}</div>
                    <div className="text-[12px] text-ink-mute">{formatDate(t.startsAt)}</div>
                  </div>
                  <Icon name="chevR" className="w-4 h-4 text-zinc-300 shrink-0" />
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            <button
              onClick={() => setSourceId(null)}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-mute hover:text-ink"
            >
              <Icon name="back" className="w-4 h-4" /> Choose a different tournament
            </button>
            {sourceParticipants === undefined ? (
              <div className="text-center py-6 text-ink-mute text-sm animate-pulse">Loading…</div>
            ) : toCopy.length === 0 ? (
              <div className="text-center py-6 text-ink-mute text-sm">
                Everyone from that roster is already on this one.
              </div>
            ) : (
              <div className="text-sm text-ink-mute">
                {toCopy.length} player{toCopy.length !== 1 ? "s" : ""} will be added
                {sourceParticipants.length - toCopy.length > 0 &&
                  ` (${sourceParticipants.length - toCopy.length} already on this roster will be skipped)`}
                .
              </div>
            )}
          </>
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {copiedCount > 0 ? "Done" : "Cancel"}
          </Button>
          {sourceId && (
            <Button
              variant="primary"
              className="flex-1"
              onClick={copyRoster}
              disabled={working || toCopy.length === 0}
            >
              {working
                ? "Copying…"
                : `Copy ${toCopy.length || ""} player${toCopy.length !== 1 ? "s" : ""}`}
            </Button>
          )}
        </div>
      </div>
    </AppDialog>
  );
}
