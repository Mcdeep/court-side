import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { useAuth, SignInButton } from '@clerk/tanstack-start'
import { api } from '#/../convex/_generated/api'
import { useState } from 'react'
import type { Id } from '#/../convex/_generated/dataModel'

export const Route = createFileRoute('/join/$tournamentId')({
  component: JoinPage,
})

const FORMAT_LABELS: Record<string, string> = {
  americano: 'Americano',
  mexicano: 'Mexicano',
  knockout: 'Knockout',
  round_robin: 'Round Robin',
  king_of_the_court: 'King of the Court',
  snakes_and_ladders: 'Snakes & Ladders',
  team_clash: 'Team Clash',
}

function JoinPage() {
  const { tournamentId } = Route.useParams()
  const { isSignedIn, isLoaded } = useAuth()
  const tournament = useQuery(api.tournaments.getPublic, {
    tournamentId: tournamentId as Id<'tournaments'>,
  })
  const selfJoin = useMutation(api.participants.selfJoin)
  const [status, setStatus] = useState<'idle' | 'joining' | 'joined' | 'error'>('idle')
  const [error, setError] = useState('')

  if (tournament === undefined || !isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-zinc-200 border-t-zinc-600 animate-spin" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-lg p-10 text-center max-w-sm">
          <div className="text-4xl mb-3">🏓</div>
          <h1 className="text-lg font-bold text-zinc-900 mb-2">Tournament not found</h1>
          <p className="text-sm text-zinc-500">This link may have expired or the tournament was removed.</p>
        </div>
      </div>
    )
  }

  const canJoin = tournament.state === 'draft' || tournament.state === 'registration_open'
  const date = new Date(tournament.startsAt)

  async function handleJoin() {
    setStatus('joining')
    setError('')
    try {
      await selfJoin({ tournamentId: tournamentId as Id<'tournaments'> })
      setStatus('joined')
    } catch (e: any) {
      const msg = e?.message ?? 'Something went wrong'
      if (msg.includes('Already joined')) {
        setStatus('joined')
      } else {
        setError(msg)
        setStatus('error')
      }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl ring-1 ring-zinc-200/80 shadow-lg p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🏓</div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            {tournament.clubName}
          </p>
          <h1 className="text-xl font-bold text-zinc-900">{tournament.name}</h1>
        </div>

        <div className="space-y-3 mb-6">
          <InfoRow label="Format" value={FORMAT_LABELS[tournament.format] ?? tournament.format} />
          <InfoRow label="Date" value={date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })} />
          <InfoRow label="Time" value={date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })} />
          <InfoRow label="Venue" value={tournament.venueName} />
          <InfoRow label="Players" value={`${tournament.playerCount} joined`} />
        </div>

        {!isSignedIn ? (
          <SignInButton mode="modal" forceRedirectUrl={`/join/${tournamentId}`}>
            <button className="w-full py-3 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 transition-colors">
              Sign in to join
            </button>
          </SignInButton>
        ) : status === 'joined' ? (
          <div className="text-center py-3 rounded-xl bg-emerald-50 ring-1 ring-emerald-200">
            <span className="text-emerald-700 font-semibold text-sm">You're in! See you on the court.</span>
          </div>
        ) : !canJoin ? (
          <div className="text-center py-3 rounded-xl bg-zinc-100">
            <span className="text-zinc-500 text-sm font-medium">Registration is closed</span>
          </div>
        ) : (
          <>
            <button
              onClick={handleJoin}
              disabled={status === 'joining'}
              className="w-full py-3 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {status === 'joining' ? 'Joining...' : 'Join tournament'}
            </button>
            {status === 'error' && (
              <p className="text-red-500 text-xs text-center mt-2">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="text-zinc-900 font-medium">{value}</span>
    </div>
  )
}
