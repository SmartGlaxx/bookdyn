// ============= PLAN DEFINITIONS =============
// Central source of truth for plan metadata used across the app.

import { Zap, Sparkles, Crown, Rocket } from "lucide-react";

export type PlanId = "free" | "starter" | "pro" | "elite";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  price: number; // monthly USD
  credits: number;
  words: string; // human-readable
  features: string[];
  turboAccess: "none" | "enabled" | "boosted";
  maxActiveBooks: number | null; // null = unlimited
  badge?: string;
  icon: typeof Zap;
  popular?: boolean;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    credits: 5,
    words: "5K words/month",
    features: [
      "Basic generation",
      "Guided Mode only",
      "1 active book",
      "Standard queue",
    ],
    turboAccess: "none",
    maxActiveBooks: 1,
    icon: Sparkles,
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: 9,
    credits: 100,
    words: "100K words/month",
    features: [
      "Style & Tone editing",
      "Priority generation",
      "Unlimited books",
      "Guided + Assisted modes",
    ],
    turboAccess: "none",
    maxActiveBooks: null,
    icon: Zap,
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 29,
    credits: 500,
    words: "500K words/month",
    features: [
      "Advanced Plot Check editing",
      "Faster generation speed",
      "Unlimited books",
      "All modes + Turbo eligible",
    ],
    turboAccess: "enabled",
    maxActiveBooks: null,
    icon: Crown,
    popular: true,
    badge: "⚡ Turbo Eligible",
  },
  elite: {
    id: "elite",
    name: "Elite",
    price: 79,
    credits: 2000,
    words: "2M words/month",
    features: [
      "Advanced Plot Check editing",
      "Highest priority queue",
      "Unlimited books",
      "Turbo Boosted + priority Auto Draft",
    ],
    turboAccess: "boosted",
    maxActiveBooks: null,
    icon: Rocket,
    badge: "🚀 Turbo Boosted",
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "elite"];

export function canAccessTurbo(plan: string): boolean {
  return plan === "pro" || plan === "elite";
}

export function canAccessAutomation(plan: string, level: string): boolean {
  switch (level) {
    case "guided":
      return true;
    case "assisted":
      return plan !== "free";
    case "semi-auto":
      return plan !== "free";
    case "auto-draft":
      return canAccessTurbo(plan);
    default:
      return true;
  }
}

export function getPlanDisplayName(plan: string): string {
  const p = PLANS[plan as PlanId];
  return p?.name || plan.charAt(0).toUpperCase() + plan.slice(1);
}
