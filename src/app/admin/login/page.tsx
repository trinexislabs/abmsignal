'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, getSession, signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { ShieldAlert, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      const res = await signIn('credentials', { email, password, redirect: false })
      if (res?.error) {
        toast.error('Invalid email or password.')
        return
      }
      // Credentials are valid — now confirm this account is actually an admin.
      // Non-admins are signed back out so they don't hold an admin-looking session.
      const session = await getSession()
      if (session?.user?.role !== 'admin') {
        await signOut({ redirect: false })
        toast.error('This account does not have admin access.')
        return
      }
      router.push('/admin')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F13] flex items-center justify-center px-4 py-16">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-5">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-white text-center">Admin Portal</h1>
          <p className="text-[#9CA3AF] text-sm mt-2 text-center">
            Restricted access — operator sign-in only.
          </p>
        </div>

        <div className="bg-[#111827] border border-[#374151] rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-white text-sm font-medium">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@abmsignal.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-10 h-11 bg-[#0B0F13] border-[#374151] text-white placeholder:text-[#9CA3AF] focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-white text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pl-10 h-11 bg-[#0B0F13] border-[#374151] text-white placeholder:text-[#9CA3AF] focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20 rounded-xl"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-11 bg-amber-500 hover:bg-amber-500/90 text-[#0B0F13] font-semibold rounded-xl"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>
              ) : (
                <>Sign in to Admin <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#9CA3AF]/60 mt-6">
          Authorized personnel only. Activity may be monitored.
        </p>
      </div>
    </div>
  )
}
