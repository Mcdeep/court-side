import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '#/../convex/_generated/api'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Icon } from '#/components/ui/icon'
import { VenueCard } from '#/features/courts/venue-card'
import { VenueModal } from '#/features/courts/venue-modal'

export const Route = createFileRoute('/$slug/courts')({
  component: CourtsPage,
})

function CourtsPage() {
  const { slug } = useParams({ from: '/$slug/courts' })
  const [showAdd, setShowAdd] = useState(false)

  const org = useQuery(api.organizations.getBySlug, { slug })
  const venues = useQuery(api.venues.listByOrg, org ? { organizationId: org._id } : 'skip')

  if (org === undefined || venues === undefined) return <PageSkeleton />
  if (org === null) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-ink-mute">Organisation not found.</p>
    </div>
  )

  const totalCourts = venues.reduce((sum, v) => sum + v.courtCount, 0)

  return (
    <div className="max-w-[1100px] mx-auto px-10 py-8">
      {showAdd && <VenueModal orgId={org._id} onClose={() => setShowAdd(false)} />}

      <div className="flex items-end justify-between gap-4 mb-7">
        <div>
          <div className="text-ink-mute text-[13px] font-semibold mb-2 capitalize">{org.name}</div>
          <h1 className="font-display text-[34px] font-bold leading-tight tracking-tight">Courts</h1>
        </div>
        <Button variant="primary" size="lg" icon="plus" onClick={() => setShowAdd(true)}>Add venue</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-7">
        <Stat label="Venues" value={venues.length} icon="court" />
        <Stat label="Total courts" value={totalCourts} icon="grid" />
      </div>

      {venues.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-card p-14 flex flex-col items-center text-center">
          <span className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mb-4">
            <Icon name="court" className="w-8 h-8" stroke={1.8} />
          </span>
          <h3 className="font-display font-bold text-[20px]">No venues yet</h3>
          <p className="text-ink-mute text-sm mt-1 max-w-xs">Add a venue to start creating tournaments.</p>
          <div className="mt-5">
            <Button variant="primary" size="lg" icon="plus" onClick={() => setShowAdd(true)}>Add venue</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {venues.map(venue => <VenueCard key={venue._id} venue={venue} />)}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-2xl p-4 bg-white ring-1 ring-zinc-200/80 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-mute">{label}</span>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-100 text-zinc-400">
          <Icon name={icon as any} className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-2 font-display font-bold text-[30px] leading-none tnum">{value}</div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="max-w-[900px] mx-auto px-10 py-8 animate-pulse">
      <div className="h-9 w-28 bg-zinc-100 rounded-xl mb-7" />
      <div className="grid grid-cols-2 gap-4 mb-7">
        {[0, 1].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-2xl" />)}
      </div>
      <div className="space-y-3">
        {[0, 1].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-2xl" />)}
      </div>
    </div>
  )
}
