import type { SVGProps } from 'react'

/**
 * ABMSignal brand mark — a target dot with signal waves radiating outward.
 * Account-Based (precise target) + Signal (detection/broadcast).
 * Uses `currentColor`, so color it via the parent's text color
 * (e.g. `text-[#10B981]`). Outer waves fade for a "signal" falloff.
 */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <circle cx="9" cy="23" r="3" fill="currentColor" />
      <path
        d="M9 15.5 A7.5 7.5 0 0 1 16.5 23"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M9 10 A13 13 0 0 1 22 23"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M9 4.5 A18.5 18.5 0 0 1 27.5 23"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  )
}
