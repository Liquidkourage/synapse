import NextAuth from "next-auth";
import { AuthError } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role, User } from "@/generated/prisma";

function coerceCredential(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

/**
 * Match signup + DB rows. Emails that *look* identical in logs can differ by bytes
 * (NBSP, zero-width chars, fullwidth @, Cyrillic homoglyphs, etc.).
 */
function normalizeEmail(s: string): string {
  return s
    .replace(/\uFF20/g, "@") // fullwidth commercial at → ASCII @
    .replace(/\u00A0/g, " ") // NBSP → space (trim() alone may not remove NBSP in all engines)
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width / BOM
    .trim()
    .toLowerCase()
    .normalize("NFC");
}

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
        const rawEmail = coerceCredential(credentials?.email);
        const password = coerceCredential(credentials?.password);
        const email = rawEmail ? normalizeEmail(rawEmail) : undefined;
        const authDebug =
          process.env.AUTH_DEBUG === "1" || process.env.AUTH_DEBUG === "true";

        if (authDebug) {
          console.log("[auth][debug] DATABASE_URL", process.env.DATABASE_URL);
          console.log(
            "[auth][debug] emailLen",
            email?.length ?? 0,
            "passwordLen",
            password?.length ?? 0,
          );
        }

        if (!email || !password) {
          if (authDebug) console.log("[auth][debug] missing email or password after coerce");
          return null;
        }

        // Prefer SQL (indexed); trim column for rows inserted with stray spaces.
        const rows = await prisma.$queryRaw<User[]>`
          SELECT * FROM "User" WHERE LOWER(TRIM("email")) = ${email}
        `;
        let user: User | null = rows[0] ?? null;

        // Fallback: Prisma client + JS match (handles $queryRaw/adapter quirks + NFC edge cases).
        if (!user) {
          const batch = await prisma.user.findMany({ take: 2000 });
          user = batch.find((u) => normalizeEmail(u.email) === email) ?? null;
        }

        if (!user) {
          if (authDebug) {
            const n = await prisma.user.count();
            console.log("[auth][debug] no User row after SQL+scan; User.count()=", n);
            if (n > 0) {
              const sample = await prisma.user.findMany({ take: 5, select: { email: true } });
              console.log(
                "[auth][debug] login email utf8 hex",
                Buffer.from(email, "utf8").toString("hex"),
              );
              for (const row of sample) {
                const ne = normalizeEmail(row.email);
                console.log(
                  "[auth][debug] db email repr",
                  JSON.stringify(row.email),
                  "normalizedEq?",
                  ne === email,
                  "dbHex",
                  Buffer.from(row.email, "utf8").toString("hex"),
                );
              }
            }
          }
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          if (authDebug) {
            console.log("[auth][debug] bcrypt.compare false (hashLen)", user.passwordHash.length);
          }
          return null;
        }

        if (authDebug) console.log("[auth][debug] login ok userId", user.id);

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
