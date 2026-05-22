'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Zap, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification link has expired or has already been used.',
  OAuthSignin: 'Could not initiate the OAuth sign-in flow.',
  OAuthCallback: 'There was an error during the OAuth callback.',
  OAuthCreateAccount: 'Could not create an account via OAuth.',
  EmailCreateAccount: 'Could not create an account with this email.',
  Callback: 'There was an error during the authentication callback.',
  OAuthAccountNotLinked:
    'This email is already linked to another sign-in method. Sign in with the original method.',
  EmailSignin: 'Could not send the sign-in email.',
  CredentialsSignin: 'Invalid email or password.',
  SessionRequired: 'Please sign in to access this page.',
  Default: 'An unexpected authentication error occurred.',
}

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') ?? 'Default'
  const message = ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-900/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 group mb-10">
          <div className="w-10 h-10 rounded-xl bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#339af0]" />
          </div>
          <span className="font-heading font-bold text-xl text-white">ABMSignal</span>
        </Link>

        <div className="bg-[#141419] border border-red-500/20 rounded-2xl p-10 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>

          <div>
            <h1 className="font-heading text-2xl font-bold text-white mb-2">Authentication error</h1>
            <p className="text-[#a1a1aa] text-sm leading-relaxed">{message}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/auth/signin">
              <Button className="w-full bg-[#339af0] hover:bg-[#339af0]/90 text-white font-semibold rounded-xl">
                Try again
              </Button>
            </Link>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 mt-6 text-sm text-[#a1a1aa] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to home
        </Link>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  )
}
