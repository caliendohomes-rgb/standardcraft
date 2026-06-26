import Stripe from 'stripe';

export function getStripe() {
  return new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
}

export const PLANS = {
  classroom: {
    name: 'Classroom',
    price: 29,
    credits: 8,
    monthly: import.meta.env.STRIPE_PRICE_CLASSROOM_MONTHLY,
    annual: import.meta.env.STRIPE_PRICE_CLASSROOM_ANNUAL,
  },
  pro: {
    name: 'Pro',
    price: 69,
    credits: 20,
    monthly: import.meta.env.STRIPE_PRICE_PRO_MONTHLY,
    annual: import.meta.env.STRIPE_PRICE_PRO_ANNUAL,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function creditsForPlan(plan: string): number {
  if (plan === 'classroom') return 8;
  if (plan === 'pro') return 20;
  return 0;
}
