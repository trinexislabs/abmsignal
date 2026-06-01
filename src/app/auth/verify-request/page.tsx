import Link from 'next/link'
import { Zap, Mail, ArrowLeft } from 'lucide-react'

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen bg-[#0B0F13] flex items-center justify-center px-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#0B3D2E]/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 group mb-10">
          <div className="w-10 h-10 rounded-xl bg-[#0B3D2E] border border-[#10B981]/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#10B981]" />
          </div>
          <span className="font-heading font-bold text-xl text-white">ABMSignal</span>
        </Link>

        <div className="bg-[#111827] border border-[#374151] rounded-2xl p-10 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#0B3D2E]/60 border border-[#10B981]/20 flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-[#10B981]" />
          </div>

          <div>
            <h1 className="font-heading text-2xl font-bold text-white mb-2">Check your email</h1>
            <p className="text-[#9CA3AF] text-sm leading-relaxed">
              We sent you a secure magic link. Click it in your email to sign in — no password needed.
            </p>
          </div>

          <div className="bg-[#0B0F13] border border-[#374151] rounded-xl p-4 text-sm text-[#9CA3AF] text-left space-y-1.5">
            <p className="font-medium text-white text-xs">Didn&apos;t get the email?</p>
            <p>Check your spam folder. The link expires in 24 hours.</p>
          </div>
        </div>

        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-1.5 mt-6 text-sm text-[#9CA3AF] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
