import { Avatar } from './avatar'

export function TeamMark({ names, size = 26 }: { names: string[]; size?: number }) {
  return (
    <span className="inline-flex" style={{ marginRight: size * 0.35 }}>
      {names.map((name, i) => (
        <span key={i} style={{ marginLeft: i ? -size * 0.35 : 0, zIndex: 2 - i }}
          className="ring-2 ring-white rounded-full inline-flex">
          <Avatar name={name} size={size} />
        </span>
      ))}
    </span>
  )
}
