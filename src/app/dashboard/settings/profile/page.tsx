import { requireAuth } from '@/lib/auth/session'
import { Card } from '@/components/ui/card'
import { getUserInitials } from '@/lib/utils'

export default async function ProfilePage() {
  const session = await requireAuth()
  const user = session.user

  const initials = getUserInitials(user?.name)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Profile</h1>
        <p className="text-sm text-[#9CA3AF] mt-0.5">Your account information</p>
      </div>

      <Card className="bg-[#111827] border-[#374151] p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-[#0B3D2E] border border-[#10B981]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-[#10B981]">{initials}</span>
          </div>
          <div>
            <p className="font-heading text-base font-semibold text-white">{user?.name ?? 'User'}</p>
            <p className="text-sm text-[#9CA3AF]">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4 border-t border-[#1F2937] pt-5">
          <div>
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">Name</p>
            <p className="text-sm text-white">{user?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">Email</p>
            <p className="text-sm text-white">{user?.email ?? '—'}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
