'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Zap, Menu, X, LayoutDashboard } from 'lucide-react'
import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const isLanding = pathname === '/'
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'
  const isLoggedIn = !!session?.user

  async function handleSignOut() {
    await signOut({ redirect: false })
    router.push('/')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center group-hover:border-[#339af0]/60 transition-colors">
              <Zap className="w-4 h-4 text-[#339af0]" />
            </div>
            <span className="font-heading font-bold text-lg text-white">ABMSignal</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-[#1e3a5f] text-[#339af0] border border-[#339af0]/30 hidden sm:flex">
              BETA
            </Badge>
          </Link>

          {isLanding && (
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-white transition-colors">How It Works</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-white transition-colors">Pricing</a>
            </nav>
          )}

          <div className="flex items-center gap-3">
            {!isLoading && (
              isLoggedIn ? (
                <>
                  <Link href="/dashboard">
                    <Button size="sm" variant="ghost" className="hidden sm:flex text-muted-foreground hover:text-white gap-1.5">
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    onClick={handleSignOut}
                    variant="ghost"
                    className="text-muted-foreground hover:text-white border border-white/10 hover:border-white/20"
                  >
                    Sign out
                  </Button>
                </>
              ) : isLanding ? (
                <>
                  <Link href="/auth/signin">
                    <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground hover:text-white">
                      Sign in
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button size="sm" className="bg-[#339af0] hover:bg-[#339af0]/90 text-white font-medium">
                      Start free trial
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href="/dashboard">
                  <Button size="sm" className="bg-[#339af0] hover:bg-[#339af0]/90 text-white font-medium">
                    Dashboard
                  </Button>
                </Link>
              )
            )}
            <button
              className="md:hidden p-1.5 text-muted-foreground hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-background/95 px-4 py-4 flex flex-col gap-4">
          {isLanding && (
            <>
              <a href="#features" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>How It Works</a>
              <a href="#pricing" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Pricing</a>
            </>
          )}
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">Dashboard</Button>
              </Link>
              <Button variant="ghost" size="sm" className="w-full justify-start text-red-400" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Link href="/auth/signin" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">Sign in</Button>
            </Link>
          )}
        </div>
      )}
    </header>
  )
}
