// Realistic DFW seed data: an admin, verified sellers with live listings, buyers
// with preferences/saved searches, plus a draft and a ready-for-review example so
// every screen has something to show. Idempotent: clears seeded tables first.
import "dotenv/config";
import { PrismaClient, type PropertyType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { storage } from "../src/providers/storage";
import { assessProperty } from "../src/services/readiness";
import { DISCLOSURE_CHECKLIST } from "../src/domain/constants";

const prisma = new PrismaClient();

const PASSWORD = "Password123!";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/// Generate a simple, deterministic SVG "photo" so listings render images locally.
function placeholderSvg(label: string, hue: number, tag: string): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="683" viewBox="0 0 1024 683">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue},45%,72%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 30) % 360},50%,48%)"/>
    </linearGradient></defs>
    <rect width="1024" height="683" fill="url(#g)"/>
    <rect x="0" y="560" width="1024" height="123" fill="rgba(15,35,46,0.35)"/>
    <text x="40" y="628" font-family="system-ui,sans-serif" font-size="34" fill="#fff" font-weight="700">${label}</text>
    <text x="984" y="60" text-anchor="end" font-family="system-ui,sans-serif" font-size="24" fill="rgba(255,255,255,0.85)">${tag}</text>
  </svg>`;
  return Buffer.from(svg);
}

const disclosures = () => DISCLOSURE_CHECKLIST.map((d) => ({ ...d, acknowledged: true }));
const showing = () => [
  { dayOfWeek: "Saturday", start: "10:00", end: "16:00" },
  { dayOfWeek: "Sunday", start: "13:00", end: "17:00" },
];

interface SeedProperty {
  address: string;
  city: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  lot: number;
  year: number;
  type: PropertyType;
  garage: number;
  stories: number;
  hoa: number;
  features: string[];
  improvements: string;
  hue: number;
}

const LISTINGS: SeedProperty[] = [
  {
    address: "1204 Bluebonnet Trail", city: "Frisco", zip: "75034", price: 615000, beds: 4, baths: 3, sqft: 2850, lot: 8200,
    year: 2016, type: "SINGLE_FAMILY", garage: 2, stories: 2, hoa: 55,
    features: ["Updated Kitchen", "Quartz Countertops", "Covered Patio", "Game Room", "Solar Panels"],
    improvements: "New roof (2023), full interior repaint (2024), tankless water heater", hue: 200,
  },
  {
    address: "908 Prairie Rose Lane", city: "Allen", zip: "75013", price: 485000, beds: 3, baths: 2.5, sqft: 2210, lot: 6900,
    year: 2012, type: "SINGLE_FAMILY", garage: 2, stories: 2, hoa: 40,
    features: ["Open Floor Plan", "Hardwood Floors", "Fenced Backyard", "Smart Thermostat"],
    improvements: "HVAC replaced 2022, new garage door and opener 2023", hue: 150,
  },
  {
    address: "5521 Windmill Court", city: "Plano", zip: "75024", price: 725000, beds: 5, baths: 4, sqft: 3450, lot: 9500,
    year: 2018, type: "SINGLE_FAMILY", garage: 3, stories: 2, hoa: 75,
    features: ["Pool", "Media Room", "Chef's Kitchen", "Three-Car Garage", "Study"],
    improvements: "Pool resurfaced 2024, new pool heater, epoxy garage floor", hue: 20,
  },
  {
    address: "312 Heritage Oaks Drive", city: "McKinney", zip: "75071", price: 399000, beds: 3, baths: 2, sqft: 1850, lot: 6200,
    year: 2009, type: "SINGLE_FAMILY", garage: 2, stories: 1, hoa: 0,
    features: ["Single Story", "Large Backyard", "Updated Bathrooms", "Storage Shed"],
    improvements: "New luxury vinyl plank flooring throughout (2023)", hue: 280,
  },
  {
    address: "77 Stonebridge Way", city: "Prosper", zip: "75078", price: 899000, beds: 5, baths: 4.5, sqft: 4100, lot: 12000,
    year: 2020, type: "SINGLE_FAMILY", garage: 3, stories: 2, hoa: 110,
    features: ["Acre Lot", "Outdoor Kitchen", "Wine Room", "Guest Suite", "Three-Car Garage"],
    improvements: "Built-in outdoor kitchen added 2022, landscape lighting", hue: 340,
  },
  {
    address: "630 Lakeview Terrace", city: "Little Elm", zip: "75068", price: 445000, beds: 4, baths: 3, sqft: 2400, lot: 7000,
    year: 2015, type: "SINGLE_FAMILY", garage: 2, stories: 2, hoa: 50,
    features: ["Near Lake", "Loft", "Granite Countertops", "Covered Patio"],
    improvements: "Fresh exterior paint 2024, new dishwasher and microwave", hue: 190,
  },
];

async function clear() {
  // Order matters due to FKs; deleteMany cascades handle children but be explicit.
  await prisma.$transaction([
    prisma.analyticsEvent.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.report.deleteMany(),
    prisma.buyerInterest.deleteMany(),
    prisma.showingRequest.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.buyerMatch.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.savedSearch.deleteMany(),
    prisma.job.deleteMany(),
    prisma.domainEvent.deleteMany(),
    prisma.workflowRun.deleteMany(),
    prisma.statusTransition.deleteMany(),
    prisma.sellerRecommendation.deleteMany(),
    prisma.enrichmentRecord.deleteMany(),
    prisma.dataProvenance.deleteMany(),
    prisma.identityVerification.deleteMany(),
    prisma.propertyDocument.deleteMany(),
    prisma.propertyPhoto.deleteMany(),
    prisma.property.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.buyerProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  console.log("Clearing existing data…");
  await clear();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();

  console.log("Creating admin…");
  await prisma.user.create({
    data: { email: "admin@keyd.local", fullName: "Avery Admin", role: "ADMIN", passwordHash, phone: "214-555-0100", emailVerifiedAt: now, phoneVerifiedAt: now, identityStatus: "VERIFIED" },
  });

  const sellerNames = ["Sofia Ramirez", "James Carter", "Priya Nair", "Daniel Kim", "Emily Nguyen", "Marcus Bell"];

  console.log("Creating sellers + live listings…");
  for (let i = 0; i < LISTINGS.length; i++) {
    const l = LISTINGS[i];
    const seller = await prisma.user.create({
      data: {
        email: `seller${i + 1}@keyd.local`,
        fullName: sellerNames[i],
        role: "SELLER",
        passwordHash,
        phone: `214-555-01${(i + 10).toString().padStart(2, "0")}`,
        emailVerifiedAt: now,
        phoneVerifiedAt: now,
        identityStatus: "VERIFIED",
      },
    });

    const slug = `${slugify(l.address)}-${l.zip}`;
    const property = await prisma.property.create({
      data: {
        slug,
        sellerId: seller.id,
        status: "ACTIVE",
        addressLine1: l.address,
        city: l.city,
        state: "TX",
        zip: l.zip,
        lat: 33.15 + i * 0.02,
        lng: -96.8 - i * 0.02,
        askingPrice: l.price,
        bedrooms: l.beds,
        bathrooms: l.baths,
        squareFeet: l.sqft,
        lotSizeSqft: l.lot,
        yearBuilt: l.year,
        propertyType: l.type,
        garageSpaces: l.garage,
        stories: l.stories,
        hoaFeeMonthly: l.hoa,
        features: l.features,
        improvements: l.improvements,
        disclosures: disclosures(),
        showingAvailability: showing(),
        aiContentStatus: "APPROVED",
        headline: `${l.beds}BR ${l.baths}BA Home in ${l.city} — ${l.features[0]}`,
        description: `This ${l.sqft.toLocaleString()} sq ft single-family home in ${l.city}, TX offers ${l.beds} bedrooms and ${l.baths} baths. Notable features include ${l.features.slice(0, 3).join(", ")}. Recent improvements: ${l.improvements}. Listed directly by the owner on Keyd — contact the owner to schedule a private showing.`,
        highlights: [`${l.beds} bedrooms`, `${l.baths} baths`, `${l.sqft.toLocaleString()} sq ft`, ...l.features.slice(0, 4)],
        buyerFaq: [
          { question: "How do I schedule a showing?", answer: "Use the “Request a showing” button to propose times." },
          { question: "Is this listed with an agent?", answer: "No. This home is listed directly by the owner on Keyd." },
        ],
        socialCaptions: {
          short: `${l.beds}BR/${l.baths}BA in ${l.city} — $${l.price.toLocaleString()}`,
          long: `Just listed by owner in ${l.city}: ${l.features.slice(0, 3).join(", ")}. Message the owner on Keyd.`,
          twitter: `${l.beds}BR/${l.baths}BA ${l.city} home 🏡 Listed by owner on Keyd #ForSaleByOwner`,
          facebook: `Just listed by owner in ${l.city}, TX. Offered at $${l.price.toLocaleString()}.`,
          instagram: `${l.city} home ✨ ${l.beds}BR • ${l.baths}BA • $${l.price.toLocaleString()} #ForSaleByOwner`,
        },
        openHouseCopy: `Open House — ${l.address}, ${l.city}. Stop by to tour the home and meet the owner.`,
        emailSummary: `${l.beds}BR/${l.baths}BA in ${l.city}, offered at $${l.price.toLocaleString()}.`,
        contentApprovedAt: now,
        contentApprovedById: seller.id,
        publishedAt: now,
      },
    });

    // Approved identity + ownership verification records.
    await prisma.identityVerification.createMany({
      data: [
        { subjectId: seller.id, propertyId: property.id, kind: "IDENTITY", provider: "manual", status: "APPROVED", confidence: 0.95, referenceId: `seed_id_${i}` },
        { subjectId: seller.id, propertyId: property.id, kind: "OWNERSHIP", provider: "manual", status: "APPROVED", confidence: 0.9, referenceId: `seed_own_${i}` },
      ],
    });

    // Placeholder photos in object storage.
    const rooms = ["Front Exterior", "Living Room", "Kitchen", "Primary Bedroom", "Primary Bath", "Backyard"];
    for (let p = 0; p < rooms.length; p++) {
      const key = storage().buildKey("public", "properties", property.id, `photo-${p}`);
      const stored = await storage().put({
        key,
        data: placeholderSvg(`${rooms[p]} · ${l.city}`, l.hue, "Keyd"),
        contentType: "image/svg+xml",
        visibility: "public",
      });
      await prisma.propertyPhoto.create({
        data: { propertyId: property.id, storageKey: stored.key, caption: rooms[p], position: p, width: 1024, height: 683 },
      });
    }

    await assessProperty(property.id);
    await prisma.statusTransition.create({
      data: { propertyId: property.id, fromStatus: "READY_FOR_REVIEW", toStatus: "ACTIVE", actorType: "USER", actorId: seller.id, reason: "Seeded live listing" },
    });
    await prisma.analyticsEvent.createMany({
      data: [
        { type: "SELLER_REGISTERED", userId: seller.id },
        { type: "LISTING_STARTED", userId: seller.id, propertyId: property.id },
        { type: "LISTING_COMPLETED", userId: seller.id, propertyId: property.id },
        { type: "LISTING_VERIFIED", userId: seller.id, propertyId: property.id },
        { type: "LISTING_PUBLISHED", userId: seller.id, propertyId: property.id },
      ],
    });
    console.log(`  • ${l.address}, ${l.city} → /p/${slug}`);
  }

  // A seller with a DRAFT and a READY_FOR_REVIEW property to demo the wizard/review UI.
  console.log("Creating demo seller with draft + ready-for-review…");
  const demoSeller = await prisma.user.create({
    data: { email: "seller.demo@keyd.local", fullName: "Taylor Owner", role: "SELLER", passwordHash, phone: "214-555-0199", emailVerifiedAt: now, phoneVerifiedAt: now, identityStatus: "VERIFIED" },
  });
  await prisma.property.create({
    data: {
      slug: `draft-${demoSeller.id.slice(-6)}`, sellerId: demoSeller.id, status: "DRAFT",
      addressLine1: "45 Meadowbrook Ln", city: "Wylie", state: "TX", zip: "75098",
      askingPrice: 375000, bedrooms: 3, bathrooms: 2, propertyType: "SINGLE_FAMILY", features: ["Corner Lot"],
      disclosures: DISCLOSURE_CHECKLIST.map((d) => ({ ...d, acknowledged: false })),
    },
  });

  console.log("Creating buyers + preferences + saved searches…");
  const buyers = [
    { name: "Rachel Green", email: "buyer1@keyd.local", cities: ["Frisco", "Plano"], min: 400000, max: 700000, beds: 4, baths: 2, features: ["Pool", "Game Room"], ready: "PREAPPROVED" as const },
    { name: "Omar Haddad", email: "buyer2@keyd.local", cities: ["Allen", "McKinney"], min: 300000, max: 500000, beds: 3, baths: 2, features: ["Single Story"], ready: "PREQUALIFIED" as const },
    { name: "Nina Patel", email: "buyer3@keyd.local", cities: ["Prosper", "Frisco"], min: 600000, max: 1000000, beds: 5, baths: 3, features: ["Outdoor Kitchen"], ready: "CASH_VERIFIED" as const },
  ];
  for (const b of buyers) {
    const user = await prisma.user.create({
      data: { email: b.email, fullName: b.name, role: "BUYER", passwordHash, phone: "469-555-02" + Math.floor(Math.random() * 90 + 10), emailVerifiedAt: now, phoneVerifiedAt: now },
    });
    await prisma.buyerProfile.create({
      data: {
        userId: user.id, preferredCities: b.cities, minPrice: b.min, maxPrice: b.max, minBedrooms: b.beds, minBathrooms: b.baths,
        propertyTypes: ["SINGLE_FAMILY"], moveInTimeframe: "WITHIN_3_MONTHS", financingReadiness: b.ready, desiredFeatures: b.features, notifyOnMatch: true,
      },
    });
    await prisma.savedSearch.create({
      data: { userId: user.id, name: `${b.cities[0]} under $${(b.max / 1000).toFixed(0)}k`, filters: { city: b.cities[0], maxPrice: b.max, minBeds: b.beds }, notifyEnabled: true },
    });
    await prisma.analyticsEvent.create({ data: { type: "BUYER_REGISTERED", userId: user.id } });
  }

  console.log("\n✅ Seed complete.");
  console.log("   Admin:  admin@keyd.local");
  console.log("   Seller: seller1@keyd.local (live listings), seller.demo@keyd.local (draft/review)");
  console.log("   Buyer:  buyer1@keyd.local");
  console.log(`   Password for all: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
