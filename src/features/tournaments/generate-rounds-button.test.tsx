// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { GenerateRoundsButton } from './generate-rounds-button'

afterEach(cleanup)

test('disables generation while it is running and shows failures for retry', async () => {
  let reject = (_error: Error) => {}
  const pending = new Promise<void>((_resolve, fail) => { reject = fail })
  const onGenerate = vi.fn().mockReturnValueOnce(pending).mockResolvedValue(undefined)
  render(<GenerateRoundsButton onGenerate={onGenerate} icon="bolt">Generate rounds</GenerateRoundsButton>)
  fireEvent.click(screen.getByRole('button', {name:'Generate rounds'}))
  const busy = screen.getByRole('button', {name:/Generating/}) as HTMLButtonElement
  expect(busy.disabled).toBe(true)
  fireEvent.click(busy)
  expect(onGenerate).toHaveBeenCalledTimes(1)
  reject(new Error('Tournament inputs changed. Please generate again.'))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Please generate again'))
  fireEvent.click(screen.getByRole('button', {name:'Generate rounds'}))
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  expect(onGenerate).toHaveBeenCalledTimes(2)
})
