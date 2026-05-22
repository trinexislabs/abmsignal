'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Zap, CheckCircle2, Layers, Layers2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formState } from '@/lib/form-state'

function FormSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full h-10 rounded-xl bg-[#0a0a0f] border border-white/10 px-3 pr-8 text-sm appearance-none cursor-pointer',
          'focus:outline-none focus:border-[#339af0]/50',
          value ? 'text-white' : 'text-[#a1a1aa]/60'
        )}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#141419] text-white">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa]" />
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Step Indicator (reused from product page)
// ──────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 }) {
  const steps = [
    { number: 1, label: 'Product Brief' },
    { number: 2, label: 'Target Account' },
  ]
  return (
    <div className="flex items-center gap-3">
      {steps.map((step, i) => {
        const isDone = step.number < current
        const isActive = step.number === current
        return (
          <div key={step.number} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all',
                  isDone
                    ? 'bg-green-500/20 border-green-500/40 text-green-400'
                    : isActive
                    ? 'bg-[#339af0]/20 border-[#339af0]/60 text-[#339af0]'
                    : 'bg-white/5 border-white/15 text-[#a1a1aa]'
                )}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.number}
              </div>
              <span
                className={cn(
                  'text-sm font-medium',
                  isActive ? 'text-white' : 'text-[#a1a1aa]'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-px w-12 transition-colors',
                  isDone ? 'bg-[#339af0]/40' : 'bg-white/10'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Priority Tier Radio
// ──────────────────────────────────────────────────────────

interface TierOption {
  value: 'tier1' | 'tier2'
  label: string
  badge: string
  description: string
  icon: React.ElementType
  recommended?: boolean
}

const TIER_OPTIONS: TierOption[] = [
  {
    value: 'tier1',
    label: 'Tier 1 — Full Depth',
    badge: 'Strategic',
    description:
      'Complete research across all 12 sections, full contact discovery with verification, cultural adaptation, and 16-point quality review. Recommended for strategic accounts.',
    icon: Layers,
    recommended: true,
  },
  {
    value: 'tier2',
    label: 'Tier 2 — Standard',
    badge: 'Fast',
    description:
      'Core sections (8 of 12), top 5 contacts discovered, faster delivery in 30–60 minutes. Best for prospecting lists and exploratory accounts.',
    icon: Layers2,
  },
]

// ──────────────────────────────────────────────────────────
// Form state
// ──────────────────────────────────────────────────────────

interface AccountFormState {
  company_name: string
  company_website: string
  industry: string
  geography: string
  priority_tier: 'tier1' | 'tier2'
  known_contacts: string
  additional_notes: string
}

const INITIAL_FORM: AccountFormState = {
  company_name: '',
  company_website: '',
  industry: '',
  geography: '',
  priority_tier: 'tier1',
  known_contacts: '',
  additional_notes: '',
}

const INDUSTRIES = [
  'Banking & Finance',
  'Insurance',
  'Healthcare',
  'Manufacturing',
  'Retail',
  'Technology',
  'Telecommunications',
  'Government',
  'Energy',
  'Other',
]

const GEOGRAPHIES = [
  'United States',
  'United Kingdom',
  'Switzerland',
  'Netherlands',
  'France',
  'Germany',
  'Switzerland',
  'Australia',
  'Singapore',
  'Japan',
  'Other APAC',
  'Other EU',
  'Global',
]

// ──────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────

function readSavedAccount() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('abmsignal_account')
    return raw ? (JSON.parse(raw) as Partial<AccountFormState>) : null
  } catch { return null }
}

export default function TargetAccountPage() {
  const router = useRouter()
  const [form, setForm] = useState<AccountFormState>(() => ({ ...INITIAL_FORM, ...readSavedAccount() }))
  const [submitting, setSubmitting] = useState(false)

  // Auto-save to localStorage on every change
  useEffect(() => {
    formState.saveAccount(form)
  }, [form])

  const set = <K extends keyof AccountFormState>(key: K, value: AccountFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const isValid =
    form.company_name.trim().length > 0 &&
    form.industry.length > 0 &&
    form.geography.length > 0

  const handleStartResearch = async () => {
    if (!isValid) return
    setSubmitting(true)

    let brief: Record<string, unknown> = {}
    const briefRaw = formState.readBrief()
    if (briefRaw) {
      try { brief = JSON.parse(briefRaw) as Record<string, unknown> } catch {}
    }
    formState.saveAccount({ ...form, brief })

    await new Promise((r) => setTimeout(r, 500))
    router.push('/playbook/new/processing')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Top nav */}
      <div className="border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-[#339af0]" />
            </div>
            <span className="font-heading font-bold text-sm text-white">ABMSignal</span>
          </Link>
          <StepIndicator current={2} />
          <div className="w-24" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-white mb-1">
            Step 2: Target Account
          </h1>
          <p className="text-sm text-[#a1a1aa]">
            Tell us about the company you're targeting. The more detail, the better the playbook.
          </p>
        </div>

        <Card className="bg-[#141419] border-white/[0.06] p-6 space-y-6">
          {/* Company Name */}
          <div>
            <Label className="text-sm font-medium text-white mb-1.5 block">
              Company Name <span className="text-[#339af0]">*</span>
            </Label>
            <Input
              value={form.company_name}
              onChange={(e) => set('company_name', e.target.value)}
              placeholder="e.g. Meridian Financial Group"
              className="bg-[#0a0a0f] border-white/10 text-white placeholder:text-[#a1a1aa]/50 focus:border-[#339af0]/50 h-10"
            />
          </div>

          {/* Company Website */}
          <div>
            <Label className="text-sm font-medium text-white mb-1.5 block">
              Company Website
            </Label>
            <Input
              type="url"
              value={form.company_website}
              onChange={(e) => set('company_website', e.target.value)}
              placeholder="https://example.com"
              className="bg-[#0a0a0f] border-white/10 text-white placeholder:text-[#a1a1aa]/50 focus:border-[#339af0]/50 h-10"
            />
          </div>

          {/* Industry + Geography */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">
                Industry / Vertical <span className="text-[#339af0]">*</span>
              </Label>
              <FormSelect
                value={form.industry}
                onChange={(v) => set('industry', v)}
                placeholder="Select industry…"
                options={INDUSTRIES.map((ind) => ({ value: ind, label: ind }))}
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">
                Geography <span className="text-[#339af0]">*</span>
              </Label>
              <FormSelect
                value={form.geography}
                onChange={(v) => set('geography', v)}
                placeholder="Select geography…"
                options={GEOGRAPHIES.map((geo) => ({ value: geo, label: geo }))}
              />
            </div>
          </div>

          {/* Priority Tier */}
          <div>
            <Label className="text-sm font-medium text-white mb-3 block">
              Priority Tier <span className="text-[#339af0]">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TIER_OPTIONS.map((tier) => {
                const Icon = tier.icon
                const selected = form.priority_tier === tier.value
                return (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => set('priority_tier', tier.value)}
                    className={cn(
                      'relative text-left p-4 rounded-xl border transition-all duration-150',
                      selected
                        ? 'bg-[#1e3a5f]/50 border-[#339af0]/40 shadow-[0_0_0_1px_rgba(51,154,240,0.15)]'
                        : 'bg-[#0a0a0f] border-white/10 hover:border-white/20'
                    )}
                  >
                    {tier.recommended && (
                      <span className="absolute top-3 right-3 text-[10px] font-semibold text-[#339af0] bg-[#339af0]/10 border border-[#339af0]/25 px-1.5 py-0.5 rounded-full">
                        Recommended
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                          selected
                            ? 'border-[#339af0] bg-[#339af0]'
                            : 'border-white/30 bg-transparent'
                        )}
                      >
                        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <Icon
                        className={cn(
                          'w-4 h-4',
                          selected ? 'text-[#339af0]' : 'text-[#a1a1aa]'
                        )}
                      />
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          selected ? 'text-white' : 'text-[#a1a1aa]'
                        )}
                      >
                        {tier.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#a1a1aa] leading-relaxed pl-7">
                      {tier.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Known Contacts */}
          <div>
            <Label className="text-sm font-medium text-white mb-1.5 block">
              Known Contacts{' '}
              <span className="text-[#a1a1aa] font-normal">(optional)</span>
            </Label>
            <Textarea
              value={form.known_contacts}
              onChange={(e) => set('known_contacts', e.target.value)}
              placeholder="Paste any known contact names, titles, or LinkedIn URLs to seed the research..."
              rows={3}
              className="bg-[#0a0a0f] border-white/10 text-white placeholder:text-[#a1a1aa]/50 focus:border-[#339af0]/50 resize-none text-sm"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <Label className="text-sm font-medium text-white mb-1.5 block">
              Additional Notes{' '}
              <span className="text-[#a1a1aa] font-normal">(optional)</span>
            </Label>
            <Textarea
              value={form.additional_notes}
              onChange={(e) => set('additional_notes', e.target.value)}
              placeholder="Any specific intel, focus areas, or constraints the AI should know about..."
              rows={2}
              className="bg-[#0a0a0f] border-white/10 text-white placeholder:text-[#a1a1aa]/50 focus:border-[#339af0]/50 resize-none text-sm"
            />
          </div>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6">
          <Link href="/playbook/new/product">
            <Button
              variant="ghost"
              className="text-[#a1a1aa] hover:text-white gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <Button
            onClick={handleStartResearch}
            disabled={!isValid || submitting}
            size="lg"
            className="bg-[#339af0] hover:bg-[#339af0]/90 text-white font-semibold gap-2 px-8 shadow-[0_0_20px_rgba(51,154,240,0.25)] hover:shadow-[0_0_30px_rgba(51,154,240,0.35)] transition-shadow disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting…
              </>
            ) : (
              <>
                Start Research
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
