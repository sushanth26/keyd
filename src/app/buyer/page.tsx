import Link from "next/link";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, StatTile, EmptyState, LinkButton, Alert } from "@/components/ui";
import { PropertyCard } from "@/components/property-card";

export default async function BuyerDashboard() {
  const user = await requireRole("BUYER");
  const [profile, matches, favCount, searchCount, matchProps] = await Promise.all([
    prisma.buyerProfile.findUnique({ where: { userId: user.id } }),
    prisma.buyerMatch.count({ where: { buyerId: user.id } }),
    prisma.favorite.count({ where: { userId: user.id } }),
    prisma.savedSearch.count({ where: { userId: user.id } }),
    prisma.buyerMatch.findMany({
      where: { buyerId: user.id },
      orderBy: { score: "desc" },
      take: 3,
      include: { property: { include: { photos: { orderBy: { position: "asc" }, take: 1 } } } },
    }),
  ]);

  const noPrefs = !profile || (profile.preferredCities.length === 0 && !profile.maxPrice);

  return (
    <div>
      <PageHeader
        title={`Hi, ${user.fullName.split(" ")[0]}`}
        subtitle="Your matches, saved homes, and searches in one place."
        action={<LinkButton href="/search">Browse homes</LinkButton>}
      />

      {noPrefs && (
        <Alert tone="info" title="Set your preferences">
          Tell us what you're looking for and we'll match you with new listings automatically.{" "}
          <Link href="/buyer/preferences" className="font-semibold underline">Set preferences →</Link>
        </Alert>
      )}

      <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Matches" value={matches} />
        <StatTile label="Favorites" value={favCount} />
        <StatTile label="Saved searches" value={searchCount} />
        <StatTile label="Financing" value={(profile?.financingReadiness ?? "NOT_STARTED").replace(/_/g, " ")} />
      </div>

      <h2 className="mb-3 text-lg font-bold text-slate-900">Top matches for you</h2>
      {matchProps.length === 0 ? (
        <EmptyState icon="✨" title="No matches yet" message="Once you set preferences, matching homes will appear here as they're listed." action={<LinkButton href="/buyer/preferences">Set preferences</LinkButton>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matchProps.map((m) => (
            <PropertyCard key={m.id} p={m.property} />
          ))}
        </div>
      )}
    </div>
  );
}
