import Link from "next/link";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/metrics", label: "Metrics" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/featured", label: "Featured live" },
  { href: "/admin/settings", label: "Site settings" },
  { href: "/admin/homepage", label: "Homepage" },
  { href: "/admin/events", label: "All events" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[70vh] flex-col gap-8 lg:flex-row">
      <aside className="w-full shrink-0 space-y-2 lg:w-52">
        <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-400/90">Admin</p>
        <nav className="flex flex-col gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
