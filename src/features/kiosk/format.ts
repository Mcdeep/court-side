export function kinitials(n: string) {
  if (!n) return '?'
  return n.split(' ').map(x => x[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

export function klast(n: string) {
  if (!n) return '—'
  return n.split(' ').slice(-1)[0] ?? n
}
