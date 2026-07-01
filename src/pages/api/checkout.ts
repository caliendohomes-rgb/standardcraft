import type { APIRoute } from 'astro';
import { getStripe, PLANS, type PlanKey } from '../../lib/stripe';
import { createSupabaseApiClient, createSupabaseAdmin } from '../../lib/supabase-server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { client } = createSupabaseApiClient(request);
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
      return json({ error: 'Authentication required.' }, 401);
    }

    const body = await request.json();
    const { plan, billing } = body; // plan: 'classroom' | 'pro', billing: 'monthly' | 'annual'

    if (!plan || !PLANS[plan as PlanKey]) {
      return json({ error: 'Invalid plan.' }, 400);
    }

    const planData = PLANS[plan as PlanKey];
    const priceId = billing === 'annual' ? planData.annual : planData.monthly;

    if (!priceId) {
      return json({ error: 'Pricing not configured. Please contact support.' }, 500);
    }

    const stripe = getStripe();
    const admin = createSupabaseAdmin();

    // Get or create Stripe customer
    const { data: sub } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: profile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    let customerId = sub?.stripe_customer_id;

    if (!customerId) {
      // Search for an existing Stripe customer to avoid duplicate creation on re-attempts
      const customerEmail = (profile?.email ?? user.email ?? '').toLowerCase();
      const existingList = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (existingList.data.length > 0) {
        customerId = existingList.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: profile?.email ?? user.email,
          name: profile?.full_name,
          metadata: { supabase_user_id: user.id },
        });
        customerId = customer.id;
      }
    }

    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'https://standardcraftny.com';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      // Session-level metadata is present in the checkout.session.completed webhook payload;
      // subscription_data.metadata propagates to the subscription for invoice events.
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
      success_url: `${siteUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan,
        },
      },
      allow_promotion_codes: true,
    });

    return json({ url: session.url });

  } catch (err: any) {
    console.error('Checkout error:', err);
    return json({ error: 'Could not create checkout session. Please try again.' }, 500);
  }
};

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
