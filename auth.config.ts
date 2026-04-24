import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js configuration. Keep this free of node-only deps
 * (e.g. nodemailer, prisma adapter, bcrypt) so it can run in middleware.
 *
 * We use JWT sessions so the Credentials provider works alongside the
 * optional email magic link provider.
 */
export const authConfig: NextAuthConfig = {
  providers: [],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id ?? token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    authorized({ auth, request }) {
      const publicPaths = [
        "/",
        "/auth/signin",
        "/auth/signup",
        "/auth/verify",
        "/auth/error",
        "/api/auth",
        "/api/calendar",
      ];
      const url = request.nextUrl;
      const isPublic = publicPaths.some((p) => url.pathname.startsWith(p));
      if (isPublic) return true;
      return !!auth;
    },
  },
};
