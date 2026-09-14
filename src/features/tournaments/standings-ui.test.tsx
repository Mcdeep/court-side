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

test('shows Double Americano groups separately using group ranks', () => {
  render(<StandingsTab leaderboard={[
    { ...entry('A', 9), group: 1, groupRank: 1, groupTied: false },
    { ...entry('B', 10), group: 2, groupRank: 1, groupTied: true },
  ]} />)
  expect(screen.getByRole('table', { name: 'Group 1 standings' })).toBeTruthy()
  expect(screen.getByRole('table', { name: 'Group 2 standings' })).toBeTruthy()
  expect(screen.getAllByLabelText('Position 1')).toHaveLength(1)
  expect(screen.getByLabelText('Tied for position 1')).toBeTruthy()
})

test('shows shared final placements while keeping group statistics', () => {
  render(<StandingsTab leaderboard={[
    { ...entry('A', 1), group: 1, groupRank: 1, groupTied: false, finalPlacement: 1 },
    { ...entry('B', 1), group: 2, groupRank: 1, groupTied: false, finalPlacement: 1 },
  ]} />)
  expect(screen.getByRole('table', { name: 'Final placements' })).toBeTruthy()
  expect(screen.getByText(/Finals decide shared placements/)).toBeTruthy()
  expect(screen.getAllByText('=1')).toHaveLength(2)
})

test('lets the organiser change the priority using accessible buttons', () => {
  function Settings() {
    const [value, onChange] = useState(DEFAULT_TIEBREAK_ORDER)
    return <TiebreakOrderField value={value} onChange={onChange} />
  }
  render(<Settings />)
  fireEvent.click(screen.getByRole('button', { name: 'Move Matches won up' }))
  const rows = within(screen.getByRole('list', { name: 'Ranking order' })).getAllByRole('listitem')
  expect(rows).toHaveLength(4)
  expect(rows[0].textContent).toContain('Matches won')
  expect(rows[1].textContent).toContain('Total points')
  expect(screen.getByRole('button', { name: 'Move Matches won up' }).hasAttribute('disabled')).toBe(true)
  expect(screen.getByRole('button', { name: 'Move Head-to-head down' }).hasAttribute('disabled')).toBe(true)
})

test('the standings caption follows a wins-first ranking order', () => {
  render(<StandingsTab leaderboard={[entry('A', 1)]} tiebreakOrder={['wins', 'points', 'point_diff', 'head_to_head']} />)
  expect(screen.getByText('Matches won \u2192 Total points \u2192 Point difference \u2192 Head-to-head. Equal results share a position.')).toBeTruthy()
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

test('fallback standings explain the rating basis and how to restore missing results', () => {
  render(<StandingsTab leaderboard={[{ ...entry('A', 1), pointDiff: null, tiebreaksUnavailable: true }]} />)
  expect(screen.getByText(/Standings and rating awards use total points/)).toBeTruthy()
  expect(screen.getByText(/Open a missing match score in the schedule to restore it/)).toBeTruthy()
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
