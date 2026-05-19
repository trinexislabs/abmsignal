'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  Link2,
  FileText,
  Plus,
  X,
  Zap,
  CheckCircle2,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formState } from '@/lib/form-state'

// Native select styled to match the dark form theme
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
// Step Indicator
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
// Value Propositions Input
// ──────────────────────────────────────────────────────────

function ValuePropsInput({
  values,
  onChange,
}: {
  values: string[]
  onChange: (values: string[]) => void
}) {
  const update = (i: number, val: string) => {
    const next = [...values]
    next[i] = val
    onChange(next)
  }

  const remove = (i: number) => {
    onChange(values.filter((_, idx) => idx !== i))
  }

  const add = () => {
    if (values.length < 6) onChange([...values, ''])
  }

  return (
    <div className="space-y-2">
      {values.map((val, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[#a1a1aa] text-xs w-4 text-right flex-shrink-0">{i + 1}.</span>
          <Input
            value={val}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Value prop ${i + 1}...`}
            className="flex-1 bg-[#0a0a0f] border-white/10 text-white placeholder:text-[#a1a1aa]/50 focus:border-[#339af0]/50 h-9 text-sm"
          />
          {values.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="p-1.5 text-[#a1a1aa] hover:text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      {values.length < 6 && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 text-xs text-[#339af0] hover:text-[#339af0]/80 transition-colors mt-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add value prop
        </button>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Form state
// ──────────────────────────────────────────────────────────

interface ProductFormState {
  product_name: string
  description: string
  value_propositions: string[]
  target_personas: string
  differentiators: string
  competitors: string
  deployment_model: 'saas' | 'on-prem' | 'hybrid' | 'open-source' | ''
  deal_size: string
  sales_cycle: string
}

const INITIAL_FORM: ProductFormState = {
  product_name: '',
  description: '',
  value_propositions: ['', '', ''],
  target_personas: '',
  differentiators: '',
  competitors: '',
  deployment_model: '',
  deal_size: '',
  sales_cycle: '',
}

// ──────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────

type Mode = 'form' | 'url'

// Read saved brief synchronously — runs once during initial render,
// so the form is never blank even for a single frame after a page reload.
function readSaved() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('abmsignal_product_brief')
    return raw ? (JSON.parse(raw) as Partial<ProductFormState & { mode: Mode; url: string }>) : null
  } catch { return null }
}

export default function ProductBriefPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(() => readSaved()?.mode ?? 'form')
  const [urlInput, setUrlInput] = useState<string>(() => readSaved()?.url ?? '')
  const [form, setForm] = useState<ProductFormState>(() => ({ ...INITIAL_FORM, ...readSaved() }))
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)

  // Auto-save to localStorage on every change
  useEffect(() => {
    formState.saveBrief({ ...form, mode, url: urlInput })
  }, [form, mode, urlInput])

  const set = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleAnalyzeUrl = async () => {
    if (!urlInput.trim()) return
    setAnalyzing(true)
    await new Promise((r) => setTimeout(r, 2000))
    setAnalyzing(false)
    setAnalyzed(true)
  }

  const handleSaveDraft = () => {
    formState.saveBrief({ ...form, mode })
  }

  const handleNext = () => {
    formState.saveBrief({ ...form, mode, url: urlInput })
    router.push('/playbook/new/account')
  }

  const isFormValid =
    mode === 'url'
      ? urlInput.trim().length > 0 && analyzed
      : form.product_name.trim().length > 0 &&
        form.description.trim().length > 0 &&
        form.value_propositions.some((v) => v.trim().length > 0)

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
          <StepIndicator current={1} />
          <div className="w-24" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-white mb-1">
            Step 1: Product Brief
          </h1>
          <p className="text-sm text-[#a1a1aa]">
            Tell us about your product so we can personalize the outreach perfectly.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-[#141419] border border-white/[0.06] rounded-xl mb-6 w-fit">
          {(['form', 'url'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                mode === m
                  ? 'bg-[#1e3a5f] text-white border border-[#339af0]/25 shadow-sm'
                  : 'text-[#a1a1aa] hover:text-white'
              )}
            >
              {m === 'form' ? (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  Form Mode
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  URL Mode
                </>
              )}
            </button>
          ))}
        </div>

        {/* ── URL Mode ── */}
        {mode === 'url' && (
          <Card className="bg-[#141419] border-white/[0.06] p-6">
            <Label className="text-sm font-medium text-white mb-3 block">Product URL</Label>
            <div className="flex gap-3">
              <Input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value)
                  setAnalyzed(false)
                }}
                placeholder="https://yourproduct.com"
                className="flex-1 bg-[#0a0a0f] border-white/10 text-white placeholder:text-[#a1a1aa]/50 focus:border-[#339af0]/50 h-10"
              />
              <Button
                onClick={handleAnalyzeUrl}
                disabled={!urlInput.trim() || analyzing}
                className="bg-[#339af0] hover:bg-[#339af0]/90 text-white gap-2 px-5 h-10 flex-shrink-0"
              >
                {analyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : analyzed ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {analyzing ? 'Analyzing…' : analyzed ? 'Analyzed' : 'Analyze URL'}
              </Button>
            </div>
            <p className="text-xs text-[#a1a1aa] mt-2.5">
              We'll scrape your positioning, value props, and target personas automatically.
            </p>

            {analyzed && (
              <div className="mt-5 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">Analysis complete</span>
                </div>
                <p className="text-xs text-[#a1a1aa]">
                  We detected your product positioning, 4 value props, and 3 target personas from
                  the page. Click "Next: Target Account" to continue.
                </p>
              </div>
            )}
          </Card>
        )}

        {/* ── Form Mode ── */}
        {mode === 'form' && (
          <Card className="bg-[#141419] border-white/[0.06] p-6 space-y-6">
            {/* Product Name */}
            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">
                Product Name <span className="text-[#339af0]">*</span>
              </Label>
              <Input
                value={form.product_name}
                onChange={(e) => set('product_name', e.target.value)}
                placeholder="e.g. FinFlow AI"
                className="bg-[#0a0a0f] border-white/10 text-white placeholder:text-[#a1a1aa]/50 focus:border-[#339af0]/50 h-10"
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">
                Product Description <span className="text-[#339af0]">*</span>
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="What does your product do? What problem does it solve?"
                rows={3}
                className="bg-[#0a0a0f] border-white/10 text-white placeholder:text-[#a1a1aa]/50 focus:border-[#339af0]/50 resize-none text-sm"
              />
            </div>

            {/* Value Propositions */}
            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">
                Value Propositions <span className="text-[#339af0]">*</span>
              </Label>
              <p className="text-xs text-[#a1a1aa] mb-3">
                List 3–5 specific, measurable value props your product delivers.
              </p>
              <ValuePropsInput
                values={form.value_propositions}
                onChange={(v) => set('value_propositions', v ?? '')}
              />
            </div>

            {/* Target Personas */}
            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">
                Target Personas <span className="text-[#339af0]">*</span>
              </Label>
              <Input
                value={form.target_personas}
                onChange={(e) => set('target_personas', e.target.value)}
                placeholder="e.g. Head of Payments, CTO, CDO"
                className="bg-[#0a0a0f] border-white/10 text-white placeholder:text-[#a1a1aa]/50 focus:border-[#339af0]/50 h-10"
              />
              <p className="text-xs text-[#a1a1aa] mt-1.5">Separate multiple personas with commas.</p>
            </div>

            {/* Key Differentiators */}
            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">
                Key Differentiators
              </Label>
              <Textarea
                value={form.differentiators}
                onChange={(e) => set('differentiators', e.target.value)}
                placeholder="What makes you different vs. alternatives? Be specific."
                rows={2}
                className="bg-[#0a0a0f] border-white/10 text-white placeholder:text-[#a1a1aa]/50 focus:border-[#339af0]/50 resize-none text-sm"
              />
            </div>

            {/* Competitors */}
            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">
                Known Competitors
              </Label>
              <Input
                value={form.competitors}
                onChange={(e) => set('competitors', e.target.value)}
                placeholder="e.g. Kyriba, TreasuryXpress, ION Treasury"
                className="bg-[#0a0a0f] border-white/10 text-white placeholder:text-[#a1a1aa]/50 focus:border-[#339af0]/50 h-10"
              />
              <p className="text-xs text-[#a1a1aa] mt-1.5">Comma-separated.</p>
            </div>

            {/* Grid row: Deployment + Deal Size + Sales Cycle */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">
                  Deployment Model
                </Label>
                <FormSelect
                  value={form.deployment_model}
                  onChange={(v) => set('deployment_model', v as ProductFormState['deployment_model'])}
                  placeholder="Select…"
                  options={[
                    { value: 'saas', label: 'SaaS' },
                    { value: 'on-prem', label: 'On-Premise' },
                    { value: 'hybrid', label: 'Hybrid' },
                    { value: 'open-source', label: 'Open Source' },
                  ]}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">
                  Typical Deal Size
                </Label>
                <FormSelect
                  value={form.deal_size}
                  onChange={(v) => set('deal_size', v)}
                  placeholder="Select…"
                  options={[
                    { value: '<50k', label: '<$50K' },
                    { value: '50k-250k', label: '$50K–$250K' },
                    { value: '250k-1m', label: '$250K–$1M' },
                    { value: '1m+', label: '$1M+' },
                  ]}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">
                  Sales Cycle
                </Label>
                <FormSelect
                  value={form.sales_cycle}
                  onChange={(v) => set('sales_cycle', v)}
                  placeholder="Select…"
                  options={[
                    { value: '<30d', label: '<30 days' },
                    { value: '30-90d', label: '30–90 days' },
                    { value: '90-180d', label: '90–180 days' },
                    { value: '180d+', label: '180+ days' },
                  ]}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            className="text-[#a1a1aa] hover:text-white"
            onClick={handleSaveDraft}
          >
            Save Draft
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isFormValid && mode === 'form'}
            className="bg-[#339af0] hover:bg-[#339af0]/90 text-white font-semibold gap-2 px-6"
          >
            Next: Target Account
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
