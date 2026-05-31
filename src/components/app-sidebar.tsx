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
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface AppSidebarProps {
  className?: string
}

export function AppSidebar({ className }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
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

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-[#0d0d15] border-r border-white/[0.06] transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
        className
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-white/[0.06]', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-[#339af0]" />
            </div>
            <span className="font-heading font-bold text-base text-white">ABMSignal</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-[#339af0]" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn('p-1 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 transition-colors', collapsed && 'hidden')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {/* New Playbook — interactive check before navigating */}
        <button
          onClick={handleNewPlaybook}
          disabled={checking}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
            collapsed && 'justify-center px-2',
            'bg-[#339af0]/10 text-[#339af0] hover:bg-[#339af0]/20 border border-[#339af0]/20',
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
            <Badge className="ml-auto bg-[#339af0]/20 text-[#339af0] text-[10px] px-1.5 py-0 border-0">
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
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-[#1e3a5f] text-white border border-[#339af0]/20'
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
      <div className="px-2 py-4 border-t border-white/[0.06] space-y-1">
        <Link href="/dashboard/settings/billing">
          <div className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors',
            collapsed && 'justify-center px-2'
          )}>
            <CreditCard className="w-4 h-4 flex-shrink-0" />
            {!collapsed && 'Billing'}
          </div>
        </Link>
        <Link href="/dashboard/settings/profile">
          <div className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors',
            collapsed && 'justify-center px-2'
          )}>
            <User className="w-4 h-4 flex-shrink-0" />
            {!collapsed && 'Profile'}
          </div>
        </Link>
        {!collapsed && (
          <div className="px-3 py-3 mt-2 rounded-lg bg-[#1e3a5f]/40 border border-[#339af0]/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-white">Growth Plan</span>
              <Badge className="text-[10px] bg-[#339af0]/20 text-[#339af0] border-0 px-1.5 py-0">Active</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">3/5 playbooks used</p>
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#339af0] rounded-full" style={{ width: '60%' }} />
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
    </aside>
  )
}
