import Link from "next/link";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, LinkButton, Badge } from "@/components/ui";
import { deleteSavedSearchAction } from "@/app/buyer/actions";
import { formatDate } from "@/lib/format";

export default async function SavedSearchesPage() {
  const user = await requireRole("BUYER");
  const searches = await prisma.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader title="Saved searches" subtitle="Get notified when new homes match." />
      {searches.length === 0 ? (
        <EmptyState icon="🔔" title="No saved searches" message="Run a search and tap “Save this search” to be notified of new matches." action={<LinkButton href="/search">Search homes</LinkButton>} />
      ) : (
        <ul className="space-y-2">
          {searches.map((s) => {
            const f = (s.filters ?? {}) as Record<string, string>;
            const qs = new URLSearchParams(f).toString();
            return (
              <li key={s.id} className="card flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.entries(f).map(([k, v]) => <Badge key={k} tone="slate">{k}: {v}</Badge>)}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Saved {formatDate(s.createdAt)}{s.notifyEnabled ? " · notifications on" : ""}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/search?${qs}`} className="btn-secondary">Run</Link>
                  <form action={deleteSavedSearchAction.bind(null, s.id)}>
                    <button className="text-sm text-red-500 hover:underline">Delete</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
