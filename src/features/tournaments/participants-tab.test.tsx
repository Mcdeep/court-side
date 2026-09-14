// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getFunctionName } from 'convex/server'
import type { FunctionReference } from 'convex/server'
import type { Id, Participant } from './types'
import { ParticipantsTab } from './participants-tab'

const save = vi.hoisted(() => vi.fn())
const other = vi.hoisted(() => vi.fn())
vi.mock('convex/react', () => ({ useMutation: (reference: FunctionReference<'mutation'>) => getFunctionName(reference) === 'ratings:setSkillRating' ? save : other }))
afterEach(cleanup)
beforeEach(() => { save.mockReset().mockResolvedValue(null); other.mockReset() })
const participant: Participant = {_id:'p' as Id<'participants'>,_creationTime:0,tournamentId:'t' as Id<'tournaments'>,memberId:'m' as Id<'members'>,resolvedUserId:'u' as Id<'users'>,isWalkIn:true,walkInName:'Linked later',entryType:'solo',rating:undefined,user:null}
function view() { render(<ParticipantsTab participants={[participant]} tournamentId={participant.tournamentId} organizationId={'org' as Id<'organizations'>} format="americano" canAdd onAdd={()=>{}} onCopyRoster={()=>{}} />) }

test('saves a newly linked player rating to the account rating',async()=>{
  view()
  fireEvent.click(screen.getByTitle('Set skill rating'))
  const input=screen.getByRole('textbox')
  fireEvent.change(input,{target:{value:'4.25'}})
  fireEvent.keyDown(input,{key:'Enter'})
  await waitFor(()=>expect(save).toHaveBeenCalledWith({organizationId:'org',userId:'u',skillRating:4.25}))
  expect(other).not.toHaveBeenCalled()
})

test('disables rating editing until the save completes',async()=>{
  let finish!:()=>void
  save.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve}))
  view()
  fireEvent.click(screen.getByTitle('Set skill rating'))
  const input=screen.getByRole('textbox')
  fireEvent.change(input,{target:{value:'4.25'}})
  fireEvent.keyDown(input,{key:'Enter'})
  expect(input.hasAttribute('disabled')).toBe(true)
  finish()
  await waitFor(()=>expect(screen.queryByRole('textbox')).toBeNull())
})
