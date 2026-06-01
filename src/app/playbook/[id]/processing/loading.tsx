import { Zap } from 'lucide-react'

export default function ProcessingLoading() {
  return (
    <div className="min-h-screen bg-[#0B0F13] flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 rounded-xl bg-[#0B3D2E] border border-[#10B981]/30 flex items-center justify-center mx-auto mb-5">
          <Zap className="w-7 h-7 text-[#10B981] animate-pulse" />
        </div>
        <p className="text-white font-semibold text-lg mb-1">Loading playbook…</p>
        <p className="text-[#9CA3AF] text-sm">Please wait</p>
      </div>
    </div>
  )
}