// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ConfirmDialog } from './confirm-dialog'

afterEach(cleanup)

test('keeps the dialog open and shows the error when confirming fails', async () => {
  const onConfirm = vi.fn().mockRejectedValueOnce(new Error('Cannot reset finals after the tournament has finished')).mockResolvedValue(undefined)
  const onCancel = vi.fn()
  render(<ConfirmDialog title="Reset crossover finals?" body="Final matches will be deleted." confirmLabel="Reset finals" danger onConfirm={onConfirm} onCancel={onCancel} />)
  fireEvent.click(screen.getByRole('button', { name: 'Reset finals' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Cannot reset finals after the tournament has finished'))
  expect(onCancel).not.toHaveBeenCalled()
  const retry = screen.getByRole('button', { name: 'Reset finals' }) as HTMLButtonElement
  expect(retry.disabled).toBe(false)
  fireEvent.click(retry)
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  expect(onConfirm).toHaveBeenCalledTimes(2)
})
