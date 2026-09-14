// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getFunctionName } from 'convex/server'
import type { FunctionReference } from 'convex/server'
import type { Id, Participant } from './types'
import { DoubleAmericanoGroups } from './double-americano-groups'

const assignGroups = vi.hoisted(() => vi.fn())
const swapGroups = vi.hoisted(() => vi.fn())
const useMutation = vi.hoisted(() => vi.fn())
vi.mock('convex/react', () => ({ useMutation }))

beforeEach(() => {
  useMutation.mockReset().mockImplementation((reference: FunctionReference<'mutation'>) => getFunctionName(reference) === 'participants:assignGroups' ? assignGroups : swapGroups)
  assignGroups.mockReset().mockResolvedValue(null)
  swapGroups.mockReset().mockResolvedValue(null)
})
afterEach(cleanup)

function player(index: number, rating: number | undefined, group?: 1 | 2): Participant {
  return { _id: `p${index}` as Id<'participants'>, _creationTime: index, tournamentId: 't' as Id<'tournaments'>, entryType: 'solo', checkedIn: false, walkInName: `Player ${index}`, isWalkIn: true, rating, group } as unknown as Participant
}

test('rated modes stay disabled until all sixteen ratings exist', () => {
  const players = Array.from({ length: 16 }, (_, i) => player(i, i === 15 ? undefined : 4))
  render(<DoubleAmericanoGroups tournamentId={'t' as Id<'tournaments'>} participants={players} canEdit />)
  fireEvent.click(screen.getByText('Balanced'))
  expect(screen.getByRole('button', { name: 'Assign groups' }).hasAttribute('disabled')).toBe(true)
  expect(screen.getByText(/1 missing/)).toBeTruthy()
})

test('manual selection swaps one player from each group', async () => {
  const players = Array.from({ length: 16 }, (_, i) => player(i, 3 + i / 10, i < 8 ? 1 : 2))
  render(<DoubleAmericanoGroups tournamentId={'t' as Id<'tournaments'>} participants={players} mode="balanced" canEdit />)
  fireEvent.click(screen.getByRole('button', { name: /Player 0/ }))
  fireEvent.click(screen.getByRole('button', { name: /Player 8/ }))
  await waitFor(() => expect(swapGroups).toHaveBeenCalledWith({ tournamentId: 't', participantAId: 'p0', participantBId: 'p8' }))
})
