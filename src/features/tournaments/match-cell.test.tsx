// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MatchCell } from './match-cell'
import type { Id, Match } from './types'

const saveResult = vi.hoisted(() => vi.fn())
vi.mock('convex/react', () => ({ useMutation: () => saveResult }))
beforeEach(() => saveResult.mockReset().mockResolvedValue(null))
afterEach(cleanup)

const match: Match = {
  _id: 'match' as Id<'matches'>, _creationTime: 0, roundId: 'round' as Id<'rounds'>,
  pairAId: 'a' as Id<'pairs'>, pairBId: 'b' as Id<'pairs'>, courtNumber: 1, state: 'completed',
  pairA: { participantA: null, participantB: null }, pairB: { participantA: null, participantB: null },
}

function enterPreviousScore(a: string, b: string) {
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Previous score for side A' }), { target: { value: a } })
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Previous score for side B' }), { target: { value: b } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
}

test('repairs a missing score through the normal editor before applying a correction', async () => {
  render(<MatchCell match={match} pin="1234" />)
  fireEvent.click(screen.getByRole('button', { name: /Court 1/ }))
  enterPreviousScore('10', '8')
  expect(saveResult).not.toHaveBeenCalled()
  fireEvent.click(screen.getAllByRole('button', { name: '12' })[0])
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(saveResult).toHaveBeenCalledWith({ matchId: match._id, scoreA: 12, scoreB: 8, pin: '1234', previousScore: { scoreA: 10, scoreB: 8 } }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})

test('requires both previous scores and accepts zero as a real score', async () => {
  render(<MatchCell match={match} />)
  fireEvent.click(screen.getByRole('button', { name: /Court 1/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByRole('alert').textContent).toContain('Enter both previous scores')
  expect(saveResult).not.toHaveBeenCalled()
  enterPreviousScore('0', '8')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(saveResult).toHaveBeenCalledWith({ matchId: match._id, scoreA: 0, scoreB: 8, pin: undefined, previousScore: { scoreA: 0, scoreB: 8 } }))
})

test('keeps a failed save open and shows its error', async () => {
  saveResult.mockRejectedValueOnce(new Error('Score could not be saved'))
  render(<MatchCell match={{ ...match, scoreA: 10, scoreB: 8 }} />)
  fireEvent.click(screen.getByRole('button', { name: /Court 1/ }))
  expect(screen.queryByRole('spinbutton')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Score could not be saved'))
  expect(screen.getByRole('dialog')).toBeTruthy()
})

test('explains that a finals match requires a winner', () => {
  render(<MatchCell match={{ ...match, state: 'in_progress', finalMatchIndex: 0 }} />)
  fireEvent.click(screen.getByRole('button', { name: /Court 1/ }))
  expect(screen.getByText(/Finals require a winner/)).toBeTruthy()
  expect(screen.getByText(/do not change group standings/)).toBeTruthy()
  expect(screen.getByText(/1st \/ 2nd place · Court 1 · Score/)).toBeTruthy()
})
