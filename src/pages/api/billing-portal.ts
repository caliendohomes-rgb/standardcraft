import type { APIRoute } from 'astro';
import { getStripe } from '../../lib/stripe';
import { createSupabaseApiClient, createSupabaseAdmin } from '../../lib/supabase-server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { client } = createSupabaseApiClient(request);
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
      return json({ error: 'Authentication required.' }, 401);
    }

    const admin = createSupabaseAdmin();
    const { data: sub } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return json({ error: 'No active subscription found.' }, 400);
    }

    const stripe = getStripe();
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'https://standardcraftny.com';

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${siteUrl}/account`,
    });

    return json({ url: session.url });

  } catch (err: any) {
    console.error('Billing portal error:', err);
    return json({ error: 'Could not open billing portal. Please try again.' }, 500);
  }
};

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
