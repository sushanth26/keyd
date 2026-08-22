import Link from "next/link";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, StatTile, EmptyState, LinkButton } from "@/components/ui";
import { formatCurrency, baths } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

export default async function SellerDashboard() {
  const user = await requireRole("SELLER");
  const properties = await prisma.property.findMany({
    where: { sellerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      photos: { orderBy: { position: "asc" }, take: 1 },
      _count: { select: { showings: true, buyerInterests: true, conversations: true, favorites: true } },
    },
  });

  const active = properties.filter((p) => ["ACTIVE", "BUYER_INTEREST_RECEIVED", "UNDER_CONTRACT"].includes(p.status));
  const totalInterest = properties.reduce((s, p) => s + p._count.buyerInterests, 0);
  const totalShowings = properties.reduce((s, p) => s + p._count.showings, 0);

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.fullName.split(" ")[0]}`}
        subtitle="Manage your listings, review AI-prepared content, and respond to buyers."
        action={<LinkButton href="/seller/properties/new">+ New listing</LinkButton>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Listings" value={properties.length} />
        <StatTile label="Active" value={active.length} />
        <StatTile label="Showings" value={totalShowings} />
        <StatTile label="Buyer interest" value={totalInterest} />
      </div>

      {properties.length === 0 ? (
        <EmptyState
          icon="🏡"
          title="You haven't listed a home yet"
          message="Start a listing and Keyd's AI will prepare a professional description, highlights, buyer FAQ, and promo assets for you to review."
          action={<LinkButton href="/seller/properties/new">Start your first listing</LinkButton>}
        />
      ) : (
        <div className="space-y-3">
          {properties.map((p) => (
            <Link
              key={p.id}
              href={`/seller/properties/${p.id}`}
              className="card flex items-center gap-4 p-4 transition-shadow hover:shadow-lg"
            >
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {p.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(p.photos[0].storageKey)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-slate-300">No photo</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-slate-900">{p.addressLine1}</p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-sm text-slate-500">
                  {p.city}, {p.state} · {formatCurrency(p.askingPrice)} · {p.bedrooms ?? "—"} bd / {baths(p.bathrooms)} ba
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {p._count.showings} showings · {p._count.buyerInterests} interest · {p._count.conversations} conversations · {p._count.favorites} saves
                </p>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-2xl font-bold text-slate-900">{p.readinessScore ?? "—"}</p>
                <p className="text-xs text-slate-400">Readiness</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
