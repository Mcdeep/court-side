import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "#/../convex/_generated/api";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { StatusChip } from "#/components/ui/status-chip";
import { useAsyncAction } from "#/hooks/use-async-action";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "#/../convex/_generated/dataModel";

type Organization = NonNullable<FunctionReturnType<typeof api.organizations.getBySlug>>;

export const Route = createFileRoute("/$slug/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { slug } = useParams({ from: "/$slug/settings" });
  const org = useQuery(api.organizations.getBySlug, { slug });

  if (org === undefined) return <PageSkeleton />;
  if (org === null)
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-ink-mute">Organisation not found.</p>
      </div>
    );

  return (
    <div className="max-w-[680px] mx-auto px-10 py-8">
      <div className="mb-8">
        <div className="text-ink-mute text-[13px] font-semibold mb-2 capitalize">{org.name}</div>
        <h1 className="font-display text-[34px] font-bold leading-tight tracking-tight">
          Settings
        </h1>
      </div>

      <GeneralSection org={org} slug={slug} />
      <SeriesSection org={org} />
      <DangerSection org={org} />
    </div>
  );
}

function GeneralSection({ org, slug }: { org: Organization; slug: string }) {
  const [name, setName] = useState(org.name);
  const [saved, setSaved] = useState(false);
  const { working, error, run } = useAsyncAction();
  const updateOrg = useMutation(api.organizations.update);

  const dirty = name.trim() !== org.name;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setSaved(false);
    const ok = await run(() => updateOrg({ organizationId: org._id, name }));
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <Section title="General" description="Basic information about your organisation.">
      <form onSubmit={save} className="space-y-4">
        <Field label="Organisation name">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            required
          />
        </Field>
        <Field label="Slug" hint="URL identifier — cannot be changed.">
          <div className="relative">
            <Input value={slug} disabled />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-zinc-300 uppercase tracking-wide">
              Read only
            </span>
          </div>
        </Field>
        <Field label="Status">
          <div className="h-10 flex items-center">
            <StatusChip status={org.status === "active" ? "live" : "draft"} />
          </div>
        </Field>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" variant="primary" size="md" disabled={!dirty || working}>
            {working ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
          </Button>
          {dirty && !working && (
            <button
              type="button"
              onClick={() => setName(org.name)}
              className="text-[13px] text-ink-mute hover:text-ink transition-colors font-medium"
            >
              Discard
            </button>
          )}
        </div>
      </form>
    </Section>
  );
}

function SeriesSection({ org }: { org: Organization }) {
  const series = useQuery(api.series.list, { organizationId: org._id });
  const createSeries = useMutation(api.series.create);
  const [name, setName] = useState("");
  const { working, error, run } = useAsyncAction();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const ok = await run(() => createSeries({ organizationId: org._id, name }));
    if (ok) setName("");
  }

  return (
    <Section
      title="Series"
      description="Group recurring tournaments, like a weekly Tuesday Americano, to rank them on their own."
    >
      {series === undefined ? (
        <div className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
      ) : (
        <div className="space-y-4">
          {series.length > 0 && (
            <ul className="divide-y divide-zinc-100 ring-1 ring-zinc-200/80 rounded-xl">
              {series.map((s) => (
                <SeriesRow key={s._id} seriesId={s._id} name={s.name} />
              ))}
            </ul>
          )}
          <form onSubmit={add} className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tuesday Americano"
              aria-label="New series name"
            />
            <Button type="submit" variant="primary" size="md" disabled={!name.trim() || working}>
              {working ? "Adding…" : "Add series"}
            </Button>
          </form>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      )}
    </Section>
  );
}

function SeriesRow({ seriesId, name }: { seriesId: Id<"series">; name: string }) {
  const [mode, setMode] = useState<"view" | "rename" | "confirmDelete">("view");
  const [draft, setDraft] = useState(name);
  const { working, error, run } = useAsyncAction();
  const renameSeries = useMutation(api.series.rename);
  const removeSeries = useMutation(api.series.remove);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    const ok = await run(() => renameSeries({ seriesId, name: draft }));
    if (ok) setMode("view");
  }

  return (
    <li className="px-4 py-3">
      {mode === "rename" ? (
        <form onSubmit={rename} className="flex gap-2 items-center">
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Series name"
          />
          <Button type="submit" variant="primary" size="sm" disabled={!draft.trim() || working}>
            Save
          </Button>
          <button
            type="button"
            onClick={() => {
              setDraft(name);
              setMode("view");
            }}
            className="text-[13px] font-medium text-ink-mute hover:text-ink transition-colors"
          >
            Cancel
          </button>
        </form>
      ) : mode === "confirmDelete" ? (
        <div className="flex items-center justify-between gap-4">
          <div className="text-[13px] text-ink-mute">
            Delete <span className="font-semibold text-ink">{name}</span>? Tournaments in this
            series keep their results but won't belong to a series.
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMode("view")}
              className="text-[13px] font-medium text-ink-mute hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="!text-red-500 !ring-red-200 hover:!bg-red-50"
              onClick={() => run(() => removeSeries({ seriesId }))}
              disabled={working}
            >
              {working ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold text-[14px] truncate">{name}</span>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setDraft(name);
                setMode("rename");
              }}
              className="text-[13px] font-medium text-ink-mute hover:text-ink transition-colors"
            >
              Rename
            </button>
            <button
              onClick={() => setMode("confirmDelete")}
              className="text-[13px] font-medium text-red-500 hover:text-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </li>
  );
}

function DangerSection({ org }: { org: Organization }) {
  const [confirm, setConfirm] = useState(false);
  const { working, run } = useAsyncAction();
  const suspendOrg = useMutation(api.organizations.suspend);
  const activateOrg = useMutation(api.organizations.activate);

  const isSuspended = org.status === "suspended";

  async function toggleStatus() {
    await run(async () => {
      if (isSuspended) {
        await activateOrg({ organizationId: org._id });
      } else {
        await suspendOrg({ organizationId: org._id });
      }
      setConfirm(false);
    });
  }

  return (
    <Section title="Danger zone" danger>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-[14px]">
            {isSuspended ? "Reactivate organisation" : "Suspend organisation"}
          </div>
          <div className="text-[13px] text-ink-mute mt-0.5">
            {isSuspended
              ? "Restore access to this organisation."
              : "Disable access to this organisation. Tournaments remain intact."}
          </div>
        </div>
        {confirm ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setConfirm(false)}
              className="text-[13px] font-medium text-ink-mute hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="!text-red-500 !ring-red-200 hover:!bg-red-50 shrink-0"
              onClick={toggleStatus}
              disabled={working}
            >
              {working ? "Working…" : "Confirm"}
            </Button>
          </div>
        ) : (
          <Button
            variant={isSuspended ? "outline" : "ghost"}
            size="sm"
            className={!isSuspended ? "!text-red-500 !ring-red-200 hover:!bg-red-50" : ""}
            onClick={() => setConfirm(true)}
          >
            {isSuspended ? "Reactivate" : "Suspend"}
          </Button>
        )}
      </div>
    </Section>
  );
}

function Section({
  title,
  description,
  danger,
  children,
}: {
  title: string;
  description?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mb-6 bg-white rounded-2xl ring-1 shadow-card overflow-hidden
      ${danger ? "ring-red-200" : "ring-zinc-200/80"}`}
    >
      <div
        className={`px-5 py-4 border-b ${danger ? "border-red-100 bg-red-50/40" : "border-zinc-100"}`}
      >
        <div className={`font-semibold text-[15px] ${danger ? "text-red-600" : ""}`}>{title}</div>
        {description && <div className="text-[13px] text-ink-mute mt-0.5">{description}</div>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="text-[12px] font-bold uppercase tracking-wide text-ink-mute">
          {label}
        </label>
        {hint && <span className="text-[11px] text-zinc-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-[680px] mx-auto px-10 py-8 animate-pulse">
      <div className="h-9 w-28 bg-zinc-100 rounded-xl mb-8" />
      <div className="h-64 bg-zinc-100 rounded-2xl mb-6" />
      <div className="h-32 bg-zinc-100 rounded-2xl" />
    </div>
  );
}
