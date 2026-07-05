import { useState } from 'react'

export function useAsyncAction() {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  async function run(fn: () => unknown) {
    setWorking(true)
    setError('')
    try {
      await fn()
      setWorking(false)
      return true
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Something went wrong')
      setWorking(false)
      return false
    }
  }

  return { working, error, setError, run }
}
