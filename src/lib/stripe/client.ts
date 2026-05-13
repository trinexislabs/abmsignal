import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

// Server-side Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

// Browser-side Stripe loader (singleton)
let stripePromise: ReturnType<typeof loadStripe>
export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

export const PLANS = {
  starter: {
    name: 'Starter',
    price: 299,
    playbooks: 2,
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: ['2 playbooks/month', 'Full playbook generation', 'PDF export', '1 user'],
  },
  growth: {
    name: 'Growth',
    price: 799,
    playbooks: 5,
    priceId: process.env.STRIPE_GROWTH_PRICE_ID,
    features: ['5 playbooks/month', 'Contact verification', 'CRM sync', '3 users'],
  },
  professional: {
    name: 'Professional',
    price: 1999,
    playbooks: 15,
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    features: ['15 playbooks/month', 'Human SME review', 'Email sequence export', 'Custom templates', '10 users'],
  },
  agency: {
    name: 'Agency',
    price: 4999,
    playbooks: -1,
    priceId: process.env.STRIPE_AGENCY_PRICE_ID,
    features: ['Unlimited playbooks', 'White-label', 'API access', 'Custom cultural rules', 'Priority support', 'Unlimited users'],
  },
} as const
