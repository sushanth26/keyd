import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, LinkButton, Badge } from "@/components/ui";
import { PropertyCard } from "@/components/property-card";
import { isPubliclyVisible } from "@/domain/lifecycle";

export default async function MatchesPage() {
  const user = await requireRole("BUYER");
  const matches = await prisma.buyerMatch.findMany({
    where: { buyerId: user.id },
    orderBy: { score: "desc" },
    include: { property: { include: { photos: { orderBy: { position: "asc" }, take: 1 } } } },
  });
  const visible = matches.filter((m) => isPubliclyVisible(m.property.status));

  return (
    <div>
      <PageHeader title="Your matches" subtitle="Homes matched to your preferences. Matching never uses protected characteristics." />
      {visible.length === 0 ? (
        <EmptyState icon="✨" title="No matches yet" message="Set your preferences and we'll match you to new homes as owners list them." action={<LinkButton href="/buyer/preferences">Set preferences</LinkButton>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((m) => (
            <PropertyCard key={m.id} p={m.property} action={<Badge tone="green">{Math.round(m.score * 100)}% match</Badge>} />
          ))}
        </div>
      )}
    </div>
  );
}
