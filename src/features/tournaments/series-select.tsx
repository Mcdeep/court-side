import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "#/../convex/_generated/api";
import type { Id } from "#/../convex/_generated/dataModel";
import { useAsyncAction } from "#/hooks/use-async-action";

const NEW_SERIES = "__new__";

const DEFAULT_CLS =
  "w-full h-10 px-3.5 rounded-xl bg-white ring-1 ring-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-dark/40 transition-all";

// Picks the series a tournament belongs to ("" = none), with an inline
// "New series…" option so admins don't have to detour to Settings.
export function SeriesSelect({
  organizationId,
  value,
  onChange,
  className = DEFAULT_CLS,
}: {
  organizationId: Id<"organizations">;
  value: Id<"series"> | "";
  onChange: (seriesId: Id<"series"> | "") => void;
  className?: string;
}) {
  const series = useQuery(api.series.list, { organizationId });
  const createSeries = useMutation(api.series.create);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const { working, error, run } = useAsyncAction();

  async function add() {
    if (!name.trim()) return;
    await run(async () => {
      const id = await createSeries({ organizationId, name });
      onChange(id);
      setName("");
      setAdding(false);
    });
  }

  if (adding)
    return (
      <div>
        <div className="flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              // Don't submit the surrounding tournament form.
              if (e.key === "Enter") {
                e.preventDefault();
                void add();
              }
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder="e.g. Tuesday Americano"
            aria-label="New series name"
            className={className}
          />
          <button
            type="button"
            onClick={add}
            disabled={!name.trim() || working}
            className="h-10 px-4 rounded-xl text-sm font-semibold bg-ink text-paper hover:bg-ink/90 disabled:opacity-50 transition-colors shrink-0"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="text-[13px] font-medium text-ink-mute hover:text-ink transition-colors shrink-0"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === NEW_SERIES) setAdding(true);
        else onChange(e.target.value as Id<"series"> | "");
      }}
      className={className}
      disabled={series === undefined}
    >
      <option value="">None</option>
      {series?.map((s) => (
        <option key={s._id} value={s._id}>
          {s.name}
        </option>
      ))}
      <option value={NEW_SERIES}>New series…</option>
    </select>
  );
}
