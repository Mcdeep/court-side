import { useState } from 'react'
import { errorMessage } from '#/lib/utils'

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
      setError(errorMessage(e))
      setWorking(false)
      return false
    }
  }

  return { working, error, setError, run }
}
