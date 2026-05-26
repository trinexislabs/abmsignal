'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { formState } from '@/lib/form-state'

export default function NewPlaybookProcessingPage() {
  const router = useRouter()
  const ran = useRef(false)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (ran.current) return
    ran.current = true

    async function submit() {
      try {
        console.log('[new/processing] Starting playbook creation flow')

        const briefRaw = formState.readBrief()
        const accountRaw = formState.readAccount()

        console.log('[new/processing] briefRaw:', briefRaw ? `exists (${briefRaw.length} chars)` : 'MISSING')
        console.log('[new/processing] accountRaw:', accountRaw ? `exists (${accountRaw.length} chars)` : 'MISSING')

        if (!briefRaw || !accountRaw) {
          console.warn('[new/processing] Missing localStorage data, redirecting to product page')
          router.replace('/playbook/new/product')
          return
        }

        let brief: Record<string, unknown>
        let account: Record<string, unknown>
        try {
          brief = JSON.parse(briefRaw) as Record<string, unknown>
          console.log('[new/processing] Parsed brief:', { product_name: brief.product_name, mode: brief.mode })
        } catch (parseErr) {
          console.error('[new/processing] Failed to parse brief JSON:', parseErr)
          setError('Failed to read product brief data. Please go back and try again.')
          return
        }
        try {
          account = JSON.parse(accountRaw) as Record<string, unknown>
          console.log('[new/processing] Parsed account:', { company_name: account.company_name, industry: account.industry })
        } catch (parseErr) {
          console.error('[new/processing] Failed to parse account JSON:', parseErr)
          setError('Failed to read account data. Please go back and try again.')
          return
        }

        const product_brief = {
          product_name: String(brief.product_name ?? ''),
          product_url: String(brief.url ?? ''),
          description: String(brief.description ?? ''),
          value_propositions: Array.isArray(brief.value_propositions)
            ? (brief.value_propositions as string[]).filter(Boolean).join('\n')
            : String(brief.value_propositions ?? ''),
          target_personas: String(brief.target_personas ?? ''),
          differentiators: String(brief.differentiators ?? ''),
          competitors: String(brief.competitors ?? ''),
          deployment_model: (brief.deployment_model as 'saas' | 'on-prem' | 'hybrid') || 'saas',
          deal_size: String(brief.deal_size ?? ''),
          sales_cycle: String(brief.sales_cycle ?? ''),
        }

        const target_account = {
          target_company: String(account.company_name ?? ''),
          target_url: String(account.company_website ?? ''),
          industry: String(account.industry ?? ''),
          geography: String(account.geography ?? ''),
          priority_tier: (String(account.priority_tier ?? 'tier1')) as 'tier1' | 'tier2',
          notes: account.additional_notes ? String(account.additional_notes) : undefined,
        }

        console.log('[new/processing] Creating playbook with:', { product_name: product_brief.product_name, target_company: target_account.target_company })

        let createRes: Response
        try {
          createRes = await fetch('/api/playbooks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_brief, target_account }),
          })
        } catch (fetchErr) {
          console.error('[new/processing] Fetch failed:', fetchErr)
          setError('Network error creating playbook. Please check your connection and try again.')
          return
        }

        console.log('[new/processing] Create response status:', createRes.status)

        if (createRes.status === 402) {
          // No credits — route through the mock payment gateway. After paying
          // the user returns to this page and we re-submit using the same
          // localStorage form data, so they don't have to refill anything.
          // (We intentionally do NOT clear formState here.)
          console.log('[new/processing] Payment required — redirecting to mock gateway')
          router.replace(
            `/payment/mock?purpose=playbook&amount=49&returnTo=${encodeURIComponent('/playbook/new/processing')}`,
          )
          return
        }

        if (!createRes.ok) {
          const errorBody = await createRes.text()
          console.error('[new/processing] Create failed:', createRes.status, errorBody)
          let errorMsg = 'Failed to create playbook'
          try {
            const errorJson = JSON.parse(errorBody)
            errorMsg = errorJson.error || errorMsg
          } catch {}
          setError(`${errorMsg} (${createRes.status}). Please go back and try again.`)
          return
        }

        let createData: { data: { playbook_id: string } }
        try {
          createData = (await createRes.json()) as { data: { playbook_id: string } }
        } catch (jsonErr) {
          console.error('[new/processing] Failed to parse create response:', jsonErr)
          setError('Invalid server response. Please try again.')
          return
        }

        const playbookId = createData.data.playbook_id
        console.log('[new/processing] Playbook created:', playbookId)

        // Trigger OpenClaw (or simulation) — fire and don't wait for it
        fetch(`/api/playbooks/${playbookId}/generate`, { method: 'POST' })
          .then((res) => console.log('[new/processing] Generate triggered:', res.status))
          .catch((err) => console.warn('[new/processing] Generate trigger failed (non-critical):', err))

        formState.clear()

        console.log('[new/processing] Redirecting to /playbook/', playbookId, '/processing')
        router.replace(`/playbook/${playbookId}/processing`)
      } catch (err) {
        console.error('[new/processing] Unexpected error:', err)
        setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    submit()
  }, [router, mounted])

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-red-400 mb-4 text-sm">{error}</p>
          <Link
            href="/playbook/new/product"
            className="text-[#339af0] text-sm hover:underline"
          >
            ← Start over
          </Link>
        </div>
      </div>
    )
  }

  // Don't render dynamic content until client-side hydration is complete
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center mx-auto mb-5">
            <Zap className="w-7 h-7 text-[#339af0] animate-pulse" />
          </div>
          <p className="text-white font-semibold text-lg mb-1">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 rounded-xl bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center mx-auto mb-5">
          <Zap className="w-7 h-7 text-[#339af0] animate-pulse" />
        </div>
        <p className="text-white font-semibold text-lg mb-1">Starting your playbook…</p>
        <p className="text-[#a1a1aa] text-sm">Setting up your research pipeline</p>
      </div>
    </div>
  )
}