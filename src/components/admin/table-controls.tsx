'use client'

import { useCallback, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

// Shared helpers for the admin list pages. Filtering/pagination is driven
// entirely through URL searchParams so the pages stay server-rendered.

function useSetParams() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') params.delete(key)
        else params.set(key, value)
      }
      // Any filter/search change resets pagination.
      if (!('page' in updates)) params.delete('page')
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )
}

export function SearchInput({ placeholder = 'Search…' }: { placeholder?: string }) {
  const searchParams = useSearchParams()
  const setParams = useSetParams()
  const [value, setValue] = useState(searchParams.get('search') ?? '')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setParams({ search: value || null })
      }}
      className="relative flex-1 min-w-[200px] max-w-sm"
    >
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#0B0F13] border border-[#374151] text-sm text-white placeholder:text-[#9CA3AF]/50 focus:outline-none focus:border-amber-500/40"
      />
    </form>
  )
}

export function FilterSelect({
  param,
  options,
}: {
  param: string
  options: { value: string; label: string }[]
}) {
  const searchParams = useSearchParams()
  const setParams = useSetParams()
  const current = searchParams.get(param) ?? options[0]?.value ?? ''

  return (
    <select
      value={current}
      onChange={(e) => setParams({ [param]: e.target.value })}
      className="h-9 px-3 rounded-lg bg-[#0B0F13] border border-[#374151] text-sm text-white focus:outline-none focus:border-amber-500/40 cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#111827]">
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export function Pagination({
  page,
  totalPages,
  total,
}: {
  page: number
  totalPages: number
  total: number
}) {
  const setParams = useSetParams()
  if (totalPages <= 1) {
    return <p className="text-xs text-[#9CA3AF]">{total} total</p>
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-[#9CA3AF]">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => setParams({ page: String(page - 1) })}
          className="flex items-center gap-1 h-8 px-3 rounded-lg bg-[#0B0F13] border border-[#374151] text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#374151]/60 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => setParams({ page: String(page + 1) })}
          className="flex items-center gap-1 h-8 px-3 rounded-lg bg-[#0B0F13] border border-[#374151] text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#374151]/60 transition-colors"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
