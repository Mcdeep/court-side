import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function errorMessage(e: unknown, fallback = 'Something went wrong') {
  return (e as { message?: string })?.message ?? fallback
}
