'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Plus,
  Zap,
  ChevronLeft,
  CreditCard,
  LogOut,
  User,
  AlertCircle,
  Loader2,
  Settings,
  Menu,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

/**
 * Shared "New Playbook" gate. Checks quota before navigating so the user gets a
 * friendly blocked reason instead of bouncing off the create flow.
 */
function useNewPlaybook() {
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [blockedReason, setBlockedReason] = useState<string | null>(null)

  const handleNewPlaybook = async () => {
    if (checking) return
    setBlockedReason(null)
    setChecking(true)
    try {
      const res = await fetch('/api/playbooks/can-create')
      const data = (await res.json()) as { allowed: boolean; reason?: string }
      if (!data.allowed) {
        setBlockedReason(data.reason ?? 'Unable to start a new playbook right now.')
        return
      }
      router.push('/playbook/new/product')
    } catch {
      router.push('/playbook/new/product')
    } finally {
      setChecking(false)
    }
  }

  return { checking, blockedReason, handleNewPlaybook }
}

/**
 * The nav body shared by the desktop sidebar and the mobile drawer. `collapsed`
 * only applies on desktop; the mobile drawer always renders expanded and calls
 * `onNavigate` (to close the drawer) when a destination is chosen.
 */
function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const { checking, blockedReason, handleNewPlaybook } = useNewPlaybook()

  return (
    <>
      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {/* New Playbook — interactive check before navigating */}
        <button
          onClick={() => {
            handleNewPlaybook()
            onNavigate?.()
          }}
          disabled={checking}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
            collapsed && 'justify-center px-2',
            'bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20 border border-[#10B981]/20',
            checking && 'opacity-70 cursor-not-allowed',
          )}
          title={collapsed ? 'New Playbook' : undefined}
        >
          {checking
            ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
            : <Plus className="w-4 h-4 flex-shrink-0" />
          }
          {!collapsed && (checking ? 'Checking…' : 'New Playbook')}
          {!collapsed && !checking && (
            <Badge className="ml-auto bg-[#10B981]/20 text-[#10B981] text-[10px] px-1.5 py-0 border-0">
              NEW
            </Badge>
          )}
        </button>

        {/* Blocked reason tooltip under nav item */}
        {blockedReason && !collapsed && (
          <div className="mx-1 flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-300 leading-relaxed">{blockedReason}</p>
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-[#0B3D2E] text-white border border-[#10B981]/20'
                    : 'text-muted-foreground hover:text-white hover:bg-white/5'
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

      {/* Bottom section */}
      <div className="px-2 py-4 border-t border-[#374151] space-y-1">
        <Link href="/dashboard/settings/billing" onClick={onNavigate}>
          <div className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors',
            collapsed && 'justify-center px-2'
          )}>
            <CreditCard className="w-4 h-4 flex-shrink-0" />
            {!collapsed && 'Billing'}
          </div>
        </Link>
        <Link href="/dashboard/settings/profile" onClick={onNavigate}>
          <div className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors',
            collapsed && 'justify-center px-2'
          )}>
            <User className="w-4 h-4 flex-shrink-0" />
            {!collapsed && 'Profile'}
          </div>
        </Link>
        {!collapsed && (
          <div className="px-3 py-3 mt-2 rounded-lg bg-[#0B3D2E]/40 border border-[#10B981]/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-white">Growth Plan</span>
              <Badge className="text-[10px] bg-[#10B981]/20 text-[#10B981] border-0 px-1.5 py-0">Active</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">3/5 playbooks used</p>
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#10B981] rounded-full" style={{ width: '60%' }} />
            </div>
          </div>
        )}
        <button className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors',
          collapsed && 'justify-center px-2'
        )}>
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </>
  )
}

interface AppSidebarProps {
  className?: string
}

/**
 * Desktop sidebar. Hidden below `lg` — on small screens use {@link MobileSidebar}
 * (a hamburger + off-canvas drawer) which is rendered in each page header.
 */
export function AppSidebar({ className }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen bg-[#0B0F13] border-r border-[#374151] transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
        className
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-[#374151]', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-[#0B3D2E] border border-[#10B981]/30 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-[#10B981]" />
            </div>
            <span className="font-heading font-bold text-base text-white">ABMSignal</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-[#0B3D2E] border border-[#10B981]/30 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-[#10B981]" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn('p-1 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 transition-colors', collapsed && 'hidden')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <SidebarNav collapsed={collapsed} />
    </aside>
  )
}

/**
 * Mobile navigation: a hamburger button (visible below `lg`) that opens the
 * sidebar as an off-canvas drawer. Drop into the left of a page header.
 */
export function MobileSidebar({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={cn('lg:hidden', className)}>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="p-1.5 -ml-1.5 rounded-md text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 flex flex-col bg-[#0B0F13] border-r border-[#374151] z-50 transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#374151] flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <div className="w-7 h-7 rounded-lg bg-[#0B3D2E] border border-[#10B981]/30 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-[#10B981]" />
            </div>
            <span className="font-heading font-bold text-base text-white">ABMSignal</span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="p-1.5 text-[#9CA3AF] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <SidebarNav collapsed={false} onNavigate={() => setOpen(false)} />
      </aside>
    </div>
  )
}
