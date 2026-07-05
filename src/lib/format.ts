export function toDatetimeLocal(ms: number) {
  const d = new Date(ms)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function formatDate(ms: number, opts?: Intl.DateTimeFormatOptions) {
  return new Date(ms).toLocaleDateString('en-ZA', opts ?? { day: 'numeric', month: 'short' })
}
