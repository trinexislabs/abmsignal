'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn, getUserInitials } from '@/lib/utils'
import { LayoutDashboard, Users, FileText, BarChart3, ShieldAlert, LogOut, ArrowUpRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const NAV_ITEMS = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Playbooks', href: '/admin/playbooks', icon: FileText },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
]

interface AdminSidebarProps {
  name: string | null
  email: string
  image: string | null
}

export function AdminSidebar({ name, email, image }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut({ redirect: false })
    router.push('/admin/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col bg-[#0d0d15] border-r border-amber-500/10 z-40">
      {/* Brand */}
      <div className="flex items-center gap-2.5 h-16 px-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
        </div>
        <div className="leading-tight">
          <div className="font-heading font-bold text-sm text-white tracking-tight">ABMSignal</div>
          <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest">Admin</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer',
                  isActive
                    ? 'bg-amber-500/10 text-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]'
                    : 'text-[#a1a1aa] hover:text-white hover:bg-white/5',
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Back to customer app */}
      <div className="px-2 pb-2">
        <Link href="/dashboard">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#a1a1aa] hover:text-white hover:bg-white/5 transition-colors">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Customer app
          </div>
        </Link>
      </div>

      {/* User */}
      <div className="px-2 py-3 border-t border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar className="w-7 h-7 flex-shrink-0">
            {image && <AvatarImage src={image} alt={name ?? ''} />}
            <AvatarFallback className="bg-amber-500/15 text-amber-400 font-bold text-[10px]">
              {getUserInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{name ?? 'Admin'}</p>
            <p className="text-[10px] text-[#a1a1aa] truncate">{email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-2 py-2 mt-1 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
