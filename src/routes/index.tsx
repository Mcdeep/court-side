import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "#/../convex/_generated/api";
import { AccountMenu } from "#/components/account-menu";
import { useEffect, useRef } from "react";
import type { FunctionReturnType } from "convex/server";

type Org = FunctionReturnType<typeof api.memberships.myOrgs>[number];

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      <header className="flex items-center justify-between px-8 h-16 border-b border-zinc-200/80">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-ink text-paper flex items-center justify-center font-display font-bold text-lg">
            C
          </span>
          <span className="font-display font-bold text-[19px] tracking-tight">CourtOS</span>
        </div>
        <div>
          {!isLoading && !isAuthenticated && (
            <Link
              to="/sign-in"
              className="px-4 py-2 bg-ink text-paper rounded-xl text-sm font-semibold hover:bg-ink/90 transition-colors"
            >
              Sign in
            </Link>
          )}
          {!isLoading && isAuthenticated && <AccountMenu />}
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-8 py-12">
        {isLoading && (
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-zinc-100 rounded-xl mb-4" />
            <div className="h-32 bg-zinc-100 rounded-2xl" />
          </div>
        )}

        {!isLoading && !isAuthenticated && (
          <div className="text-center py-20">
            <h1 className="font-display text-[40px] font-bold tracking-tight mb-3">
              Tournament management for padel
            </h1>
            <p className="text-ink-mute text-lg mb-8 max-w-md mx-auto">
              Run tournaments across 6 formats, manage players, and display live scores.
            </p>
            <Link
              to="/sign-in"
              className="inline-block px-6 py-3 bg-ink text-paper rounded-xl text-sm font-semibold hover:bg-ink/90 transition-colors"
            >
              Sign in to get started
            </Link>
          </div>
        )}

        {!isLoading && isAuthenticated && <SmartRedirect />}
      </main>
    </div>
  );
}

function SmartRedirect() {
  const navigate = useNavigate();
  const me = useQuery(api.users.me);
  const myOrgs = useQuery(api.memberships.myOrgs);
  const allOrgs = useQuery(api.organizations.list, me?.isSuperAdmin ? {} : "skip");
  const navigatedRef = useRef(false);

  function enterOrg(org: Org) {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    navigate({ to: `/${org.slug}/tournaments` as any });
  }

  useEffect(() => {
    if (navigatedRef.current) return;
    if (me === undefined || myOrgs === undefined) return;

    if (me?.isSuperAdmin) {
      if (allOrgs === undefined) return;
      navigatedRef.current = true;
      const firstOrg = allOrgs[0];
      navigate({ to: firstOrg ? (`/${firstOrg.slug}/tournaments` as any) : "/admin" });
      return;
    }

    if (myOrgs.length === 0) {
      navigatedRef.current = true;
      navigate({ to: "/dashboard" });
      return;
    }

    if (myOrgs.length === 1) {
      enterOrg(myOrgs[0]);
      return;
    }

    // Belongs to multiple orgs — fall through and let the picker below render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, myOrgs, allOrgs, navigate]);

  if (myOrgs && myOrgs.length > 1) {
    return <OrgPicker orgs={myOrgs} onSelect={enterOrg} />;
  }

  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-zinc-100 rounded-xl mb-4" />
      <div className="h-32 bg-zinc-100 rounded-2xl" />
    </div>
  );
}

function OrgPicker({ orgs, onSelect }: { orgs: Org[]; onSelect: (org: Org) => void }) {
  return (
    <div>
      <h1 className="font-display text-[26px] font-bold tracking-tight mb-1">
        Choose an organisation
      </h1>
      <p className="text-ink-mute text-sm mb-6">
        You're a member of more than one club — pick which one to sign in to.
      </p>
      <div className="space-y-2.5">
        {orgs.map((org) => (
          <button
            key={org._id}
            onClick={() => onSelect(org)}
            className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card hover:ring-zinc-300 transition-all text-left"
          >
            <div className="w-11 h-11 shrink-0 rounded-xl bg-ink text-paper flex items-center justify-center font-display font-bold text-lg">
              {org.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[15px] truncate">{org.name}</div>
              {org.status === "suspended" && (
                <div className="text-[12px] text-red-500 font-medium">Suspended</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
