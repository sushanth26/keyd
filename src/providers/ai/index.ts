// AI provider abstraction for listing content generation and analysis.
//
// Guardrails baked into the contract:
//  - The generator receives ONLY facts the seller/enrichment supplied. It must not
//    invent facts. Every output carries a confidence and is attributed to source=AI.
//  - Output is fair-housing screened by the workflow before it reaches a buyer.
//  - The AI never changes lifecycle status, prices, or accepts/negotiates offers.
import { env } from "@/lib/env";
import { MockAI } from "./mock";

export interface ListingFacts {
  city: string;
  state: string;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  lotSizeSqft: number | null;
  yearBuilt: number | null;
  garageSpaces: number | null;
  stories: number | null;
  hoaFeeMonthly: number | null;
  askingPrice: number | null;
  features: string[];
  improvements: string | null;
}

export interface GeneratedListing {
  headline: string;
  description: string;
  highlights: string[];
  buyerFaq: { question: string; answer: string }[];
  socialCaptions: { short: string; long: string; twitter: string; facebook: string; instagram: string };
  openHouseCopy: string;
  emailSummary: string;
  confidence: number; // 0..1 overall
}

export interface MissingInfoFinding {
  field: string;
  message: string;
  severity: "INFO" | "WARNING" | "BLOCKER";
}

export interface PhotoAdvice {
  photoCount: number;
  recommendations: string[];
}

export interface AIProvider {
  generateListing(facts: ListingFacts): Promise<GeneratedListing>;
  findMissingInfo(facts: ListingFacts, photoCount: number): Promise<MissingInfoFinding[]>;
  advisePhotos(facts: ListingFacts, photoCount: number): Promise<PhotoAdvice>;
}

let instance: AIProvider | null = null;
export function ai(): AIProvider {
  if (instance) return instance;
  switch (env.AI_PROVIDER) {
    case "mock":
    default:
      instance = new MockAI();
  }
  return instance;
}
