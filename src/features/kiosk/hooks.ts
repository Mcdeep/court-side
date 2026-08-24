import { useEffect, useMemo, useRef, useState } from 'react'

export function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function useRotatingPages<T>(items: T[], perPage: number, intervalMs: number) {
  const pages = useMemo(() => {
    const p: T[][] = []
    for (let i = 0; i < items.length; i += perPage) p.push(items.slice(i, i + perPage))
    return p.length ? p : ([] as T[][])
  }, [items, perPage])
  const [page, setPage] = useState(0)
  useEffect(() => {
    if (pages.length <= 1) return
    const t = setInterval(() => setPage(p => (p + 1) % pages.length), intervalMs)
    return () => clearInterval(t)
  }, [pages.length, intervalMs])
  return [pages[page % pages.length] ?? [], page, pages.length] as const
}

/**
 * Measures overflow on a `<container><track>…</track></container>` pair and
 * toggles a CSS-driven auto-scroll animation when the track no longer fits.
 * Shared by every kiosk marquee/ticker/board-scroll — they only differ in
 * axis, class name, and which CSS custom properties drive their animation.
 */
export function useAutoScroll<T extends HTMLElement>(
  options: {
    axis: 'x' | 'y'
    activeClass: string
    shiftVar: string
    durationVar?: string
    minDurationSec?: number
    speedDivisor?: number
    extraPadding?: number
  },
  deps: unknown[]
) {
  const { axis, activeClass, shiftVar, durationVar, minDurationSec = 10, speedDivisor = 12, extraPadding = 0 } = options
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const track = el.firstElementChild as HTMLElement | null
    if (!track) return

    const check = () => {
      const overflow = axis === 'x'
        ? track.scrollWidth - el.clientWidth
        : track.scrollHeight - el.clientHeight
      if (overflow > 4) {
        el.classList.add(activeClass)
        el.style.setProperty(shiftVar, `-${overflow + extraPadding}px`)
        if (durationVar) {
          el.style.setProperty(durationVar, `${Math.max(minDurationSec, overflow / speedDivisor)}s`)
        }
      } else {
        el.classList.remove(activeClass)
      }
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ref
}
