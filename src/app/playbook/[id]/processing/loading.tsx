import { Zap } from 'lucide-react'

export default function ProcessingLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 rounded-xl bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center mx-auto mb-5">
          <Zap className="w-7 h-7 text-[#339af0] animate-pulse" />
        </div>
        <p className="text-white font-semibold text-lg mb-1">Loading playbook…</p>
        <p className="text-[#a1a1aa] text-sm">Please wait</p>
      </div>
    </div>
  )
}