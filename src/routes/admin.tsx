import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useAuth, UserButton } from '@clerk/tanstack-react-start'
import { api } from '#/../convex/_generated/api'
import { useEffect, useState } from 'react'
import { Icon } from '#/components/ui/icon'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { OrgsTab } from '#/features/admin/orgs-tab'
import { UsersTab } from '#/features/admin/users-tab'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

function AdminPage() {
  const [tab, setTab] = useState('orgs')
  const navigate = useNavigate()
  const { isSignedIn, isLoaded } = useAuth()
  const me = useQuery(api.users.me)
  const stats = useQuery(api.organizations.globalStats)

  useEffect(() => {
    if (isLoaded && !isSignedIn) navigate({ to: '/' })
  }, [isLoaded, isSignedIn, navigate])

  if (!isLoaded || me === undefined || stats === undefined) return <PageSkeleton />
  if (!isSignedIn) return null

  if (!me?.isSuperAdmin) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="font-display text-[24px] font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground text-sm">Super admin access required.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[1000px] mx-auto px-10 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center font-display font-bold text-sm">C</span>
            <span className="font-display font-bold text-[17px] tracking-tight">CourtOS</span>
            <Badge variant="destructive" className="ml-1 text-[10px] font-bold uppercase">Admin</Badge>
          </div>
          <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
        </div>
      </header>

      <div className="max-w-[1000px] mx-auto px-10 py-8">
        <div className="grid grid-cols-4 gap-4 mb-7">
          <Stat label="Users" value={stats.users} icon="users" />
          <Stat label="Organisations" value={stats.organizations} icon="grid" />
          <Stat label="Tournaments" value={stats.tournaments} icon="trophy" />
          <Stat label="Active" value={stats.activeTournaments} icon="medal" />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="orgs">Organisations</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>
          <TabsContent value="orgs"><OrgsTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <Card className="p-4 gap-2">
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted text-muted-foreground">
            <Icon name={icon as any} className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 font-display font-bold text-[30px] leading-none tnum">{value}</div>
      </CardContent>
    </Card>
  )
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 border-b border-border" />
      <div className="max-w-[1000px] mx-auto px-10 py-8">
        <div className="grid grid-cols-4 gap-4 mb-7">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  )
}
