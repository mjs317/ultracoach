import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js configuration. Keep this free of node-only deps
 * (e.g. nodemailer, prisma adapter) so it can run in middleware.
 */
export const authConfig: NextAuthConfig = {
  providers: [],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
    authorized({ auth, request }) {
      const publicPaths = [
        "/",
        "/auth/signin",
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
