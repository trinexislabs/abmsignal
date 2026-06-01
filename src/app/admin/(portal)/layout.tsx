import { requireAdmin } from '@/lib/auth/admin'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

// Server-side gate for the entire admin portal (defense in depth on top of
// middleware). /admin/login lives outside this group so it stays public.
export default async function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()

  return (
    <div className="min-h-screen bg-[#0B0F13]">
      <AdminSidebar name={admin.name} email={admin.email} image={admin.image} />
      <div className="lg:ml-60">
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl">{children}</main>
      </div>
    </div>
  )
}
