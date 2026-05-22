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
      return token
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id as string
      return session
    },
  },
} satisfies NextAuthConfig
