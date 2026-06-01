'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { cn, getUserInitials } from '@/lib/utils'
import {
  LayoutDashboard,
  Settings,
  Zap,
  LogOut,
  Menu,
  X,
  Plus,
  Bell,
  ChevronDown,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Billing', href: '/dashboard/settings/billing', icon: CreditCard },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

function UserAvatar({ image, name, size = 'sm' }: { image?: string | null; name?: string | null; size?: 'sm' | 'md' }) {
  const initials = getUserInitials(name)
  const dim = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'
  return (
    <Avatar className={cn(dim, 'flex-shrink-0')}>
      {image && <AvatarImage src={image} alt={name ?? ''} />}
      <AvatarFallback className={cn('bg-[#0B3D2E] text-[#10B981] font-bold', textSize)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

function Sidebar({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user

  async function handleSignOut() {
    await signOut({ redirect: false })
    router.push('/')
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full flex flex-col bg-[#0B0F13] border-r border-[#374151] z-40 transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-[#374151] flex-shrink-0', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed ? (
          <>
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-[#0B3D2E] border border-[#10B981]/30 flex items-center justify-center group-hover:border-[#10B981]/60 transition-colors">
                <Zap className="w-3.5 h-3.5 text-[#10B981]" />
              </div>
              <span className="font-heading font-bold text-base text-white tracking-tight">ABMSignal</span>
            </Link>
            <button onClick={onCollapse} className="p-1.5 rounded-md text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-colors">
              <Menu className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button onClick={onCollapse} className="p-1.5 rounded-md text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-colors">
            <div className="w-7 h-7 rounded-lg bg-[#0B3D2E] border border-[#10B981]/30 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-[#10B981]" />
            </div>
          </button>
        )}
      </div>

      {/* New Playbook CTA */}
      <div className={cn('px-2 pt-4 pb-2', collapsed && 'flex justify-center')}>
        <Link href="/playbook/new/product" className={collapsed ? '' : 'block'}>
          {collapsed ? (
            <button className="w-10 h-10 rounded-lg bg-[#10B981] hover:bg-[#10B981]/90 flex items-center justify-center transition-colors" title="New Playbook">
              <Plus className="w-4 h-4 text-white" />
            </button>
          ) : (
            <Button className="w-full bg-[#10B981] hover:bg-[#10B981]/90 text-white text-sm font-medium gap-2 h-9">
              <Plus className="w-3.5 h-3.5" />
              New Playbook
            </Button>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer',
                  collapsed && 'justify-center px-0 w-10 h-10 mx-auto',
                  isActive
                    ? 'bg-[#0B3D2E] text-white shadow-[0_0_0_1px_rgba(16,185,129,0.2)]'
                    : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && item.label}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-2 py-4 border-t border-[#374151] flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors text-left',
              collapsed && 'justify-center'
            )}
          >
            <UserAvatar image={user?.image} name={user?.name} size="sm" />
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{user?.name ?? 'User'}</p>
                  <p className="text-[10px] text-[#9CA3AF] truncate">{user?.email}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52 bg-[#111827] border-[#374151]">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-white">{user?.name ?? 'User'}</p>
              <p className="text-xs text-[#9CA3AF]">{user?.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings/billing')} className="cursor-pointer">
              <CreditCard className="w-4 h-4 mr-2" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}

function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user

  async function handleSignOut() {
    await signOut({ redirect: false })
    router.push('/')
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 flex flex-col bg-[#0B0F13] border-r border-[#374151] z-50 transition-transform duration-300 lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#374151]">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-7 h-7 rounded-lg bg-[#0B3D2E] border border-[#10B981]/30 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-[#10B981]" />
            </div>
            <span className="font-heading font-bold text-base text-white">ABMSignal</span>
          </Link>
          <button onClick={onClose} className="p-1.5 text-[#9CA3AF] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 pt-4 pb-2">
          <Link href="/playbook/new/product" onClick={onClose}>
            <Button className="w-full bg-[#10B981] hover:bg-[#10B981]/90 text-white text-sm gap-2 h-9">
              <Plus className="w-3.5 h-3.5" />
              New Playbook
            </Button>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} onClick={onClose}>
                <div className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all', isActive ? 'bg-[#0B3D2E] text-white' : 'text-[#9CA3AF] hover:text-white hover:bg-white/5')}>
                  <Icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-[#374151]">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
            <UserAvatar image={user?.image} name={user?.name} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name ?? 'User'}</p>
              <p className="text-[11px] text-[#9CA3AF] truncate">{user?.email}</p>
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
    </>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user

  async function handleSignOut() {
    await signOut({ redirect: false })
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-[#0B0F13]">
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)} />
      </div>

      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className={cn('transition-all duration-300', collapsed ? 'lg:ml-16' : 'lg:ml-60')}>
        {/* Top bar */}
        <header className="h-16 border-b border-[#374151] bg-[#0B0F13]/80 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <button className="lg:hidden p-1.5 text-[#9CA3AF] hover:text-white transition-colors" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 lg:flex-none" />

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <Link href="/playbook/new/product" className="hidden sm:block">
              <Button size="sm" className="bg-[#10B981] hover:bg-[#10B981]/90 text-white text-xs font-medium gap-1.5 h-8 px-3">
                <Plus className="w-3.5 h-3.5" />
                New Playbook
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none">
                <UserAvatar image={user?.image} name={user?.name} size="md" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-[#111827] border-[#374151]">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-white truncate">{user?.name ?? 'User'}</p>
                  <p className="text-xs text-[#9CA3AF] truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer">
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
