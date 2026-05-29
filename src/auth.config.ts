import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  session: { strategy: 'jwt' as const },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id
      // `role` rides along on the JWT as a UX/middleware hint. It can go stale if
      // a user is promoted after their token was issued — authorization is always
      // re-verified against the DB in requireAdmin().
      if (user) token.role = (user as { role?: string }).role ?? 'user'
      return token
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id as string
      if (token?.role) session.user.role = token.role as string
      return session
    },
  },
} satisfies NextAuthConfig
