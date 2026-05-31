import { createFileRoute } from '@tanstack/react-router'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/tanstack-start'
import { useConvexAuth } from 'convex/react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth()

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">CourtOS</h1>
        <div>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-black text-white rounded-lg">Sign in</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>

      <div className="mt-8">
        {isLoading && <p className="text-gray-500">Loading auth...</p>}
        {!isLoading && isAuthenticated && (
          <p className="text-green-600 font-medium">Convex authenticated</p>
        )}
        {!isLoading && !isAuthenticated && (
          <p className="text-gray-500">Not signed in</p>
        )}
      </div>
    </div>
  )
}
