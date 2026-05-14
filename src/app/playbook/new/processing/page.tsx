'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function NewPlaybookProcessingPage() {
  const router = useRouter()
  const ran = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    async function submit() {
      try {
        const briefRaw = localStorage.getItem('abmsignal_product_brief')
        const accountRaw = localStorage.getItem('abmsignal_account')

        if (!briefRaw || !accountRaw) {
          router.replace('/playbook/new/product')
          return
        }

        const brief = JSON.parse(briefRaw) as Record<string, unknown>
        const account = JSON.parse(accountRaw) as Record<string, unknown>

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

        const createRes = await fetch('/api/playbooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_brief, target_account }),
        })

        if (!createRes.ok) {
          throw new Error(`Failed to create playbook: ${createRes.status}`)
        }

        const createData = (await createRes.json()) as { data: { playbook_id: string } }
        const playbookId = createData.data.playbook_id

        // Trigger OpenClaw (or simulation) — fire and don't wait for it
        fetch(`/api/playbooks/${playbookId}/generate`, { method: 'POST' }).catch(() => {})

        localStorage.removeItem('abmsignal_product_brief')
        localStorage.removeItem('abmsignal_account')

        router.replace(`/playbook/${playbookId}/processing`)
      } catch (err) {
        console.error('[new/processing]', err)
        setError('Something went wrong. Please go back and try again.')
      }
    }

    submit()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4 text-sm">{error}</p>
          <Link
            href="/playbook/new/account"
            className="text-[#339af0] text-sm hover:underline"
          >
            ← Go back
          </Link>
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
