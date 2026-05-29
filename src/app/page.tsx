import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Bot,
  Users,
  Globe,
  ShieldCheck,
  FileText,
  Download,
  ArrowRight,
  Zap,
  Search,
  PenLine,
  CheckCircle2,
  ChevronRight,
  Star,
} from 'lucide-react'

const features = [
  {
    icon: Bot,
    title: 'Agent Swarm Research',
    description:
      '4 specialized AI agents run parallel research loops across 47+ sources — LinkedIn, news, earnings calls, tech stack signals, and more.',
  },
  {
    icon: Users,
    title: 'Contact Verification Gate',
    description:
      'Human-in-the-loop checkpoint prevents wrong contacts from killing your campaign. Every contact verified before delivery.',
  },
  {
    icon: Globe,
    title: 'Cultural Adaptation',
    description:
      'Geography + industry rules from our Cultural Knowledge Base ensure outreach resonates in every region and vertical.',
  },
  {
    icon: ShieldCheck,
    title: '16-Point Quality Gate',
    description:
      'Every playbook validated against our ABM quality rubric by the Reviewer agent before delivery — no cutting corners.',
  },
  {
    icon: FileText,
    title: 'Hyper-Personalized Sequences',
    description:
      'Per-persona outreach referencing specific account signals, recent news, and stakeholder priorities — not templates.',
  },
  {
    icon: Download,
    title: 'PDF Export',
    description:
      'Download print-ready playbooks or export sequences directly to your outreach tool. One click to launch.',
  },
]

const steps = [
  {
    number: '01',
    icon: PenLine,
    title: 'Input your brief',
    description:
      'Describe your product, ICP, and the specific target account. Takes less than 5 minutes.',
  },
  {
    number: '02',
    icon: Search,
    title: 'Agents research the account',
    description:
      'Our 4-agent swarm runs parallel deep research — news, financials, org charts, tech stack, competitor signals.',
  },
  {
    number: '03',
    icon: Download,
    title: 'Receive your playbook',
    description:
      'Review verified contacts, approve the outreach sequences, and export your launch-ready ABM playbook.',
  },
]

const pricingPlans = [
  {
    name: 'One Off',
    price: '$29',
    period: 'one-time',
    playbooks: '1 playbook',
    badge: null,
    features: [
      'Full playbook generation',
      'PDF export',
      'Email support',
    ],
    highlight: false,
    oneTime: true,
    cta: 'Buy now',
    ctaHref: '/auth/signup?plan=one_off',
  },
  {
    name: 'Growth',
    price: '$229',
    period: '/mo',
    playbooks: '10 playbooks/month',
    badge: 'Most Popular',
    features: [
      'Everything in One Off',
      '10 playbooks / month',
      '1 user seat',
      'Contact verification gate',
    ],
    highlight: true,
    oneTime: false,
    cta: 'Get started',
    ctaHref: '/auth/signup?plan=growth',
  },
  {
    name: 'Professional',
    price: '$799',
    period: '/mo',
    playbooks: '30 playbooks/month',
    badge: null,
    features: [
      'Everything in Growth',
      '30 playbooks / month',
      '3 user seats',
    ],
    highlight: false,
    oneTime: false,
    cta: 'Get started',
    ctaHref: '/auth/signup?plan=professional',
  },
  {
    name: 'Agency',
    price: '$1,999',
    period: '/mo',
    playbooks: 'Unlimited playbooks',
    badge: null,
    features: [
      'Everything in Professional',
      'Human SME review on demand',
      '10 user seats',
      'API access',
      'White-label branding',
      'Human-reinforced research loops',
    ],
    highlight: false,
    oneTime: false,
    cta: 'Contact sales',
    ctaHref: '/auth/signup?plan=agency',
  },
]

const agentStatuses = [
  { name: 'Orchestrator', status: 'routing tasks', color: '#339af0', active: true },
  { name: 'Researcher', status: 'scanning 47 sources', color: '#22c55e', active: true },
  { name: 'Writer', status: 'drafting sequences', color: '#f59e0b', active: true },
  { name: 'Reviewer', status: 'quality check pending', color: '#a78bfa', active: false },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#1e3a5f]/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-32 left-1/4 w-[300px] h-[300px] bg-[#339af0]/8 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left column */}
            <div className="space-y-8">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#1e3a5f] text-[#339af0] border border-[#339af0]/30 px-3 py-1 text-xs font-medium rounded-full">
                  <Zap className="w-3 h-3 mr-1" />
                  AI-Powered ABM Engine
                </Badge>
              </div>

              <h1 className="font-heading text-5xl sm:text-6xl font-bold leading-[1.08] tracking-tight">
                Turn Any Target Account Into a{' '}
                <span className="text-gradient">Launch-Ready ABM Playbook</span>
              </h1>

              <p className="text-lg text-[#a1a1aa] leading-relaxed max-w-lg">
                Input your product + target account. Get hyper-personalized outreach, verified
                contacts, and culturally-adapted sequences — generated by 4 specialized AI agents
                in under 2 hours.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    className="bg-[#339af0] hover:bg-[#339af0]/90 text-white font-semibold px-6 h-12 text-base rounded-xl glow-blue-sm"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="text-[#a1a1aa] hover:text-white border border-white/10 hover:border-white/20 h-12 text-base rounded-xl px-6"
                  >
                    See example playbook
                  </Button>
                </a>
              </div>

              {/* Stats bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/[0.06]">
                {[
                  { value: '47+', label: 'sources per playbook' },
                  { value: '16-pt', label: 'quality gate' },
                  { value: '6', label: 'languages & geos' },
                  { value: '< 2hr', label: 'delivery time' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center sm:text-left">
                    <div className="text-2xl font-heading font-bold text-[#339af0]">
                      {stat.value}
                    </div>
                    <div className="text-xs text-[#a1a1aa] mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column — agent terminal mock */}
            <div className="relative">
              <div className="bg-[#141419] border border-white/[0.08] rounded-2xl overflow-hidden glow-blue">
                {/* Terminal header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-[#0d0d15]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-xs text-[#a1a1aa] ml-2 font-mono">
                    abmsignal — agent-cluster
                  </span>
                </div>

                {/* Target account header */}
                <div className="px-4 pt-4 pb-3 border-b border-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-[#a1a1aa] mb-1">Target Account</div>
                      <div className="font-heading font-semibold text-white text-lg">
                        Meridian Financial Group — Zurich, CH
                      </div>
                      <div className="text-xs text-[#a1a1aa] mt-0.5">
                        Financial Services · 3,800 employees · €1.2B revenue
                      </div>
                    </div>
                    <Badge className="bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 text-xs">
                      IN PROGRESS
                    </Badge>
                  </div>
                </div>

                {/* Agent list */}
                <div className="p-4 space-y-3">
                  {agentStatuses.map((agent) => (
                    <div
                      key={agent.name}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[#0d0d15] border border-white/[0.04]"
                    >
                      <div className="relative">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: agent.color }}
                        />
                        {agent.active && (
                          <div
                            className="absolute inset-0 rounded-full animate-ping opacity-60"
                            style={{ backgroundColor: agent.color }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{agent.name}</div>
                        <div className="text-xs text-[#a1a1aa] truncate font-mono">
                          {agent.active ? `→ ${agent.status}` : `◎ ${agent.status}`}
                        </div>
                      </div>
                      {agent.active ? (
                        <div className="flex gap-0.5">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className="w-1 rounded-full animate-pulse-glow"
                              style={{
                                height: `${8 + i * 4}px`,
                                backgroundColor: agent.color,
                                animationDelay: `${i * 0.2}s`,
                                opacity: 0.7,
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/10 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-between text-xs text-[#a1a1aa] mb-2">
                    <span>Research complete</span>
                    <span className="text-[#339af0] font-medium">68%</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#1e3a5f] to-[#339af0]"
                      style={{ width: '68%' }}
                    />
                  </div>
                  <div className="mt-3 p-2.5 rounded-lg bg-[#339af0]/5 border border-[#339af0]/10">
                    <div className="text-xs text-[#339af0] font-mono">
                      ✓ Found 14 verified contacts · 3 C-suite · 47 sources analyzed
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-3 -right-3 bg-[#1e3a5f] border border-[#339af0]/30 rounded-xl px-3 py-2 flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-[#339af0]" fill="#339af0" />
                <span className="text-xs font-medium text-white">16/16 quality checks passed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-[#1e3a5f] text-[#339af0] border border-[#339af0]/30 mb-4">
              Features
            </Badge>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-4">
              Everything your ABM team needs
            </h2>
            <p className="text-[#a1a1aa] text-lg max-w-2xl mx-auto">
              From deep account research to culturally-adapted outreach sequences — ABMSignal
              handles the entire playbook production workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="group p-6 rounded-2xl bg-[#141419] border border-white/[0.06] card-hover"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1e3a5f]/60 border border-[#339af0]/20 flex items-center justify-center mb-4 group-hover:border-[#339af0]/40 transition-colors">
                    <Icon className="w-5 h-5 text-[#339af0]" />
                  </div>
                  <h3 className="font-heading font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-[#a1a1aa] leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0d0d15]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-[#1e3a5f] text-[#339af0] border border-[#339af0]/30 mb-4">
              How It Works
            </Badge>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-4">
              From brief to playbook in 3 steps
            </h2>
            <p className="text-[#a1a1aa] text-lg max-w-2xl mx-auto">
              No consultants, no 2-week timelines. Your ABM playbook is researched, written, and
              verified by AI in under 2 hours.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px bg-gradient-to-r from-transparent via-[#339af0]/30 to-transparent" />

            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.number} className="relative text-center">
                  <div className="inline-flex flex-col items-center">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-2xl bg-[#141419] border border-[#339af0]/20 flex items-center justify-center glow-blue-sm">
                        <Icon className="w-8 h-8 text-[#339af0]" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#1e3a5f] border border-[#339af0]/40 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-[#339af0]">{i + 1}</span>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-[#339af0] mb-2">{step.number}</div>
                    <h3 className="font-heading font-semibold text-white text-xl mb-3">
                      {step.title}
                    </h3>
                    <p className="text-sm text-[#a1a1aa] leading-relaxed max-w-xs">
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Example account callout */}
          <div className="mt-16 p-6 rounded-2xl bg-[#141419] border border-[#339af0]/15 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#1e3a5f]/10 to-transparent pointer-events-none" />
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6 text-[#339af0]" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-[#339af0] font-medium mb-1">
                  EXAMPLE PLAYBOOK GENERATED IN 1H 43MIN
                </div>
                <h4 className="font-heading font-semibold text-white text-lg">
                  Meridian Financial Group — Digital Transformation Initiative
                </h4>
                <p className="text-sm text-[#a1a1aa] mt-1">
                  14 verified contacts · 6 persona outreach sequences · Dutch + French cultural
                  adaptation · 3 LinkedIn, 4 email, 2 cold call scripts
                </p>
              </div>
              <Link href="/auth/signup">
                <Button
                  size="sm"
                  className="bg-[#339af0] hover:bg-[#339af0]/90 text-white shrink-0"
                >
                  Try it yourself
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-[#1e3a5f] text-[#339af0] border border-[#339af0]/30 mb-4">
              Pricing
            </Badge>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-[#a1a1aa] text-lg max-w-2xl mx-auto">
              Start with a single playbook, no commitment. Scale up when you&apos;re ready. Every
              tier runs the full agent swarm and 16-point quality gate.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-6 rounded-2xl border flex flex-col ${
                  plan.highlight
                    ? 'bg-[#1e3a5f]/20 border-[#339af0]/40 glow-blue'
                    : plan.oneTime
                      ? 'bg-[#141419] border-white/[0.08]'
                      : 'bg-[#141419] border-white/[0.06]'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#339af0] text-white border-0 px-3 text-xs font-semibold whitespace-nowrap">
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="font-heading font-bold text-white text-lg">{plan.name}</div>
                    {plan.oneTime && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#339af0]/10 text-[#339af0] border border-[#339af0]/20">
                        No subscription
                      </span>
                    )}
                  </div>

                  <div className="flex items-end gap-1 mb-2">
                    <span className="font-heading text-4xl font-bold text-white">{plan.price}</span>
                    <span
                      className={`text-sm mb-1 ${
                        plan.oneTime ? 'text-[#339af0]/70 font-medium' : 'text-[#a1a1aa]'
                      }`}
                    >
                      {plan.period}
                    </span>
                  </div>

                  <div
                    className={`text-xs font-medium px-2 py-1 rounded-md inline-block ${
                      plan.highlight
                        ? 'bg-[#339af0]/10 text-[#339af0]'
                        : 'bg-white/5 text-[#a1a1aa]'
                    }`}
                  >
                    {plan.playbooks}
                  </div>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          plan.highlight ? 'text-[#339af0]' : 'text-[#a1a1aa]'
                        }`}
                      />
                      <span className="text-[#a1a1aa]">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.ctaHref}>
                  <Button
                    className={`w-full ${
                      plan.highlight
                        ? 'bg-[#339af0] hover:bg-[#339af0]/90 text-white font-semibold'
                        : plan.oneTime
                          ? 'bg-white/8 hover:bg-white/12 text-white border border-[#339af0]/20 hover:border-[#339af0]/40'
                          : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-[#a1a1aa] mt-8">
            Monthly plans can be cancelled anytime. One Off purchases never expire.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0d0d15]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-[#1e3a5f]/40 to-[#0a0a0f] border border-[#339af0]/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[#339af0]/5 to-transparent pointer-events-none" />
            <div className="relative">
              <Badge className="bg-[#339af0]/10 text-[#339af0] border border-[#339af0]/20 mb-6">
                Ready to launch?
              </Badge>
              <h2 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-4">
                Your next ABM campaign starts here
              </h2>
              <p className="text-[#a1a1aa] text-lg mb-8 max-w-xl mx-auto">
                Join forward-thinking B2B teams using ABMSignal to run more targeted, more
                personalized, and more effective account-based campaigns.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    className="bg-[#339af0] hover:bg-[#339af0]/90 text-white font-semibold px-8 h-12 text-base rounded-xl"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <a href="#pricing">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="text-[#a1a1aa] hover:text-white border border-white/10 hover:border-white/20 h-12 text-base rounded-xl px-8"
                  >
                    View pricing
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#339af0]" />
              </div>
              <span className="font-heading font-bold text-lg text-white">ABMSignal</span>
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-[#1e3a5f] text-[#339af0] border border-[#339af0]/30"
              >
                BETA
              </Badge>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#a1a1aa]">
              <a href="#features" className="hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-white transition-colors">
                How It Works
              </a>
              <a href="#pricing" className="hover:text-white transition-colors">
                Pricing
              </a>
              <Link href="/auth/signin" className="hover:text-white transition-colors">
                Sign in
              </Link>
              <Link href="/auth/signup" className="hover:text-white transition-colors">
                Sign up
              </Link>
            </nav>

            <p className="text-xs text-[#a1a1aa]">
              &copy; {new Date().getFullYear()} ABMSignal. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
