import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function errorMessage(e: unknown, fallback = 'Something went wrong') {
  return (e as { message?: string })?.message ?? fallback
}

// Local Convex dev deployments report thrown errors as a verbose
// "[CONVEX M(...)] ... Uncaught Error: <message>\n  at handler ..."
// string. Pull out just the message so it reads as a clean sentence.
export function cleanErrorText(message: string) {
  return message.match(/Uncaught Error: (.+)/)?.[1]?.split('\n')[0] ?? message
}

export function cleanConvexError(e: unknown, fallback = 'Something went wrong') {
  return cleanErrorText(errorMessage(e, fallback))
}
