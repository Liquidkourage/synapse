"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth" refetchOnWindowFocus>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </SessionProvider>
  );
}
