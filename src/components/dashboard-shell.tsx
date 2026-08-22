import Link from "next/link";

export interface NavItem {
  href: string;
  label: string;
  icon?: string;
  badge?: number;
}

export function DashboardShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="container-page grid gap-6 py-6 md:grid-cols-[200px_1fr]">
      <aside className="md:sticky md:top-20 md:self-start">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              {n.icon && <span aria-hidden>{n.icon}</span>}
              <span>{n.label}</span>
              {n.badge ? (
                <span className="ml-auto rounded-full bg-brand-100 px-2 text-xs font-semibold text-brand-700">{n.badge}</span>
              ) : null}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
