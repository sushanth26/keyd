import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, LinkButton } from "@/components/ui";
import { PropertyCard } from "@/components/property-card";
import { SubmitButton } from "@/components/form";
import { toggleFavoriteAction } from "@/app/buyer/actions";
import { isPubliclyVisible } from "@/domain/lifecycle";

export default async function FavoritesPage() {
  const user = await requireRole("BUYER");
  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { property: { include: { photos: { orderBy: { position: "asc" }, take: 1 } } } },
  });
  const visible = favorites.filter((f) => isPubliclyVisible(f.property.status));

  return (
    <div>
      <PageHeader title="Favorites" subtitle="Homes you've saved." />
      {visible.length === 0 ? (
        <EmptyState icon="♥" title="No saved homes yet" message="Tap Save on any listing to keep it here." action={<LinkButton href="/search">Browse homes</LinkButton>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((f) => (
            <PropertyCard
              key={f.id}
              p={f.property}
              action={
                <form action={toggleFavoriteAction.bind(null, f.property.id)}>
                  <button className="text-sm text-red-500 hover:underline" aria-label="Remove favorite">Remove</button>
                </form>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
