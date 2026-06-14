import type { APIRoute } from 'astro';
import { getStripe, creditsForPlan } from '../../lib/stripe';
import { createSupabaseAdmin } from '../../lib/supabase-server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const stripe = getStripe();
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 });
  }

  let event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        if (session.mode !== 'subscription') break;

        const userId = session.subscription_data?.metadata?.supabase_user_id
          || session.metadata?.supabase_user_id;
        const plan = session.subscription_data?.metadata?.plan || 'classroom';

        if (!userId) {
          console.error('No user ID in checkout session metadata');
          break;
        }

        const sub = await stripe.subscriptions.retrieve(session.subscription);
        const planCredits = creditsForPlan(plan);

        await admin.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          plan,
          status: sub.status,
          current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
        });

        // Grant initial subscription credits
        try {
          await grantSubscriptionCredits(admin, userId, plan, planCredits, session.subscription);
        } catch (grantErr) {
          console.error('CREDIT_GRANT_FAILED checkout.session.completed', { userId, plan, planCredits }, grantErr);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        if (invoice.billing_reason !== 'subscription_cycle') break;

        // Get subscription metadata
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        const plan = (sub as any).metadata?.plan || (sub as any).metadata?.plan_key || 'classroom';
        const userId = (sub as any).metadata?.supabase_user_id;

        if (!userId) break;

        const planCredits = creditsForPlan(plan);

        await admin.from('subscriptions')
          .update({
            status: sub.status,
            current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', invoice.subscription);

        try {
          await grantSubscriptionCredits(admin, userId, plan, planCredits, invoice.subscription);
        } catch (grantErr) {
          console.error('CREDIT_GRANT_FAILED invoice.payment_succeeded', { userId, plan, planCredits }, grantErr);
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const sub = event.data.object as any;
        await admin.from('subscriptions')
          .update({
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    // Still return 200 so Stripe doesn't retry
  }

  return new Response('OK', { status: 200 });
};

async function grantSubscriptionCredits(
  admin: ReturnType<typeof createSupabaseAdmin>,
  userId: string,
  plan: string,
  credits: number,
  stripeSubscriptionId: string
) {
  // Prevent double-granting for the same billing period
  const periodKey = `subscription_${stripeSubscriptionId}_${new Date().toISOString().slice(0, 7)}`;

  const { data: existing } = await admin
    .from('credit_ledger')
    .select('id')
    .eq('user_id', userId)
    .eq('stripe_session_id', periodKey)
    .maybeSingle();

  if (existing) return; // Already granted this period

  await admin.from('credit_ledger').insert({
    user_id: userId,
    amount: credits,
    type: 'subscription',
    description: `${plan} plan — ${credits} monthly credits`,
    stripe_session_id: periodKey,
  });

  // Increment existing balance atomically via RPC
  const { error } = await admin.rpc('increment_credits', {
    p_user_id: userId,
    p_amount: credits,
  });

  if (error) {
    // Fallback: read current balance then increment
    const { data: existing } = await admin
      .from('credits')
      .select('balance, lifetime_earned')
      .eq('user_id', userId)
      .single();

    if (existing) {
      await admin.from('credits').update({
        balance: existing.balance + credits,
        lifetime_earned: existing.lifetime_earned + credits,
      }).eq('user_id', userId);
    } else {
      await admin.from('credits').insert({
        user_id: userId,
        balance: credits,
        lifetime_earned: credits,
        lifetime_spent: 0,
      });
    }
  }
}
