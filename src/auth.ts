import NextAuth from "next-auth";
import { AuthError } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@/generated/prisma";

/** Wrong email/password is expected; Auth.js would log it as [auth][error] and flood production logs. */
function authLoggerError(error: unknown) {
  if (error instanceof AuthError && error.type === "CredentialsSignin") return;
  const name =
    error instanceof AuthError ? error.type : error instanceof Error ? error.name : "Error";
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[auth][error] ${name}: ${message}`);
  if (error instanceof Error && error.stack) {
    console.error(error.stack.replace(/.*/, "").substring(1));
  }
}

/**
 * Lazy config so `AUTH_SECRET` / `AUTH_URL` are read when a request runs (not when the
 * module is first evaluated). That matches Docker/Railway where secrets exist at runtime
 * but are absent during `next build`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(async () => ({
  trustHost: true,
  logger: { error: authLoggerError },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) return url;
      } catch {
        /* ignore malformed */
      }
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role as Role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { prisma } = await import("@/lib/prisma");
        const rawEmail = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const email = rawEmail?.trim().toLowerCase();
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
}));
