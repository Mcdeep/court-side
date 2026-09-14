// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { Id, LeaderboardEntry } from './types'
import { StandingsTab } from './standings-tab'
import { TiebreakOrderField } from './tiebreak-order-field'
import { DEFAULT_TIEBREAK_ORDER } from '#/../convex/lib/tiebreaks'
import { PodiumOverlay } from '#/features/kiosk/podium-overlay'

afterEach(() => { cleanup(); vi.useRealTimers() })

const entry = (name: string, rank: number, tied = false, wins = 1): LeaderboardEntry => ({
  _id: name as Id<'participants'>, participantId: name as Id<'participants'>, participantIds: [name as Id<'participants'>],
  players: [{ displayName: `Player ${name}` }], points: 20, wins, losses: 1, played: wins + 1, pointDiff: 2, rank, tied,
  tiebreaksUnavailable: false,
})

test('lets the organiser change the priority using accessible buttons', () => {
  function Settings() {
    const [value, onChange] = useState(DEFAULT_TIEBREAK_ORDER)
    return <TiebreakOrderField value={value} onChange={onChange} />
  }
  render(<Settings />)
  fireEvent.click(screen.getByRole('button', { name: 'Move Point difference up' }))
  const rows = within(screen.getByRole('list', { name: 'Tiebreak order' })).getAllByRole('listitem')
  expect(rows[0].textContent).toContain('Point difference')
  expect(rows[1].textContent).toContain('Matches won')
  expect(screen.getByRole('button', { name: 'Move Point difference up' }).hasAttribute('disabled')).toBe(true)
  expect(screen.getByRole('button', { name: 'Move Head-to-head down' }).hasAttribute('disabled')).toBe(true)
})

test('locked settings cannot reorder the rules', () => {
  render(<TiebreakOrderField value={DEFAULT_TIEBREAK_ORDER} onChange={() => { throw new Error('Locked setting changed') }} disabled />)
  for (const button of screen.getAllByRole('button')) expect(button.hasAttribute('disabled')).toBe(true)
})

test('shows official shared ranks and point difference, even after sorting another column', () => {
  render(<StandingsTab leaderboard={[entry('A', 1, false, 1), entry('B', 2, true, 3), entry('C', 2, true, 2), entry('D', 4)]} />)
  expect(screen.getAllByText('=2')).toHaveLength(2)
  expect(screen.getAllByText('+2')).toHaveLength(4)
  expect(within(screen.getByRole('row', { name: /Player A/ })).getByLabelText('Position 1')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /Won/ }))
  expect(screen.getAllByText('=2')).toHaveLength(2)
  expect(within(screen.getByRole('row', { name: /Player A/ })).getByLabelText('Position 1')).toBeTruthy()
  expect(within(screen.getByRole('row', { name: /Player D/ })).getByLabelText('Position 4')).toBeTruthy()
})

test('the podium includes every player sharing third place', () => {
  vi.useFakeTimers()
  render(<PodiumOverlay tournamentName="Final" top3={[entry('A', 1), entry('B', 2), entry('C', 3, true), entry('D', 3, true)]} onDismiss={() => {}} />)
  for (const name of ['A', 'B', 'C', 'D']) expect(screen.getByText(`Player ${name}`)).toBeTruthy()
  expect(screen.getByText('=3')).toBeTruthy()
})

test('the podium can share first place without inventing second or third place', () => {
  vi.useFakeTimers()
  render(<PodiumOverlay tournamentName="Final" top3={[entry('A', 1, true), entry('B', 1, true), entry('C', 1, true)]} onDismiss={() => {}} />)
  expect(screen.getByText('=1')).toBeTruthy()
  expect(screen.queryByText('2')).toBeNull()
  expect(screen.queryByText('3')).toBeNull()
})
