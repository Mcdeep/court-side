export function lastName(name: string) {
  return name.split(' ').slice(-1)[0]
}

export function participantName(p: { user?: { name: string } | null; walkInName?: string | null } | null | undefined) {
  return p?.user?.name ?? p?.walkInName ?? '?'
}

export function pairNames(pair: {
  participantA?: { user?: { name: string } | null; walkInName?: string | null } | null
  participantB?: { user?: { name: string } | null; walkInName?: string | null } | null
} | null | undefined) {
  return [participantName(pair?.participantA), participantName(pair?.participantB)] as [string, string]
}
