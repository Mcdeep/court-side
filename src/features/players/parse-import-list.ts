export type ParsedImportRow = { name: string; startingPoints?: number }

const NUMERIC = /^-?\d+(\.\d+)?$/

// Accepts one entry per line. Handles a plain name, a name with a trailing
// points value, and a column-separated export like "Full Name  First Name
// Points" (columns separated by a tab or 2+ spaces; the middle column is
// redundant and ignored).
export function parseImportLine(line: string): ParsedImportRow | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const columns = trimmed.split(/\s{2,}|\t+/).map(f => f.trim()).filter(Boolean)
  if (columns.length > 1) {
    const last = columns[columns.length - 1]
    return NUMERIC.test(last)
      ? { name: columns[0], startingPoints: Number(last) }
      : { name: columns[0] }
  }

  const tokens = trimmed.split(/\s+/)
  if (tokens.length > 1 && NUMERIC.test(tokens[tokens.length - 1])) {
    return { name: tokens.slice(0, -1).join(' '), startingPoints: Number(tokens[tokens.length - 1]) }
  }
  return { name: trimmed }
}

export function parseImportList(text: string): ParsedImportRow[] {
  return text
    .split('\n')
    .map(parseImportLine)
    .filter((row): row is ParsedImportRow => row !== null)
}
