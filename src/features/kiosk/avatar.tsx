import { kinitials } from './format'

export function Avatar({ name, size = 40, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold shrink-0 bg-white/10 text-paper ring-1 ring-white/10 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {kinitials(name)}
    </span>
  )
}
