import type { APIRoute } from 'astro';
import { getStripe, creditsForPlan } from '../../lib/stripe';
import { createSupabaseAdmin } from '../../lib/supabase-server';
import { sendOwnerNotification, esc } from '../../lib/email';
import { logAudit } from '../../lib/audit';

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
    // Keep the detail in logs; return a generic message so an unauthenticated
    // caller probing the endpoint can't fingerprint internals (CWE-209).
    console.error('Webhook signature verification failed:', err.message);
    return new Response('Invalid signature', { status: 400 });
  }

  const admin = createSupabaseAdmin();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        if (session.mode !== 'subscription') break;

        // session.metadata is the reliable source in the webhook payload;
        // subscription_data.metadata is a creation param, not present in the completed session object.
        const userId = session.metadata?.supabase_user_id
          || session.subscription_data?.metadata?.supabase_user_id;
        const plan = session.metadata?.plan
          || session.subscription_data?.metadata?.plan
          || 'classroom';

        if (!userId) {
          console.error('No user ID in checkout session metadata');
          break;
        }
        if (!session.subscription) {
          // Malformed/non-subscription session — not retryable, don't 500
          console.error('checkout.session.completed without subscription id', session.id);
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

        // Grant initial subscription credits — throws on failure so Stripe retries
        await grantSubscriptionCredits(admin, userId, plan, planCredits, session.subscription);

        // Notify the site owner of the new purchase. Non-fatal: wrapped so a
        // mail failure never causes Stripe to retry an already-granted purchase.
        try {
          const { data: buyer } = await admin
            .from('profiles').select('full_name, email').eq('id', userId).maybeSingle();
          const name = buyer?.full_name ?? 'A customer';
          const email = buyer?.email ?? session.customer_details?.email ?? 'unknown';
          await logAudit('purchase.completed', { userId, metadata: { plan } });
          await sendOwnerNotification({
            subject: `New StandardCraft purchase — ${plan} plan`,
            replyTo: email,
            text:
              `New subscription purchase\n\nCustomer: ${name} (${email})\n` +
              `Plan: ${plan}\nMonthly credits: ${planCredits}\nStripe customer: ${session.customer}\n`,
            html:
              `<h2 style="margin:0 0 12px;font-family:Georgia,serif;color:#172438;">New purchase — ${esc(plan)} plan</h2>` +
              `<p style="margin:4px 0;"><strong>Customer:</strong> ${esc(name)} ` +
              `(<a href="mailto:${esc(email)}">${esc(email)}</a>)</p>` +
              `<p style="margin:4px 0;"><strong>Plan:</strong> ${esc(plan)} · ${planCredits} credits/mo</p>`,
          });
        } catch (notifyErr) {
          console.error('Purchase notification failed (non-fatal):', notifyErr);
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

        // Throws on failure so Stripe retries the delivery
        await grantSubscriptionCredits(admin, userId, plan, planCredits, invoice.subscription);
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
    // Return 500 so Stripe retries the delivery. All handlers are idempotent
    // (subscription upserts; period-key dedup on credit grants), so a retry
    // after partial failure is safe and recovers the missed work.
    console.error('WEBHOOK_HANDLER_FAILED', event.type, err);
    return new Response('Webhook handler failed; Stripe should retry.', { status: 500 });
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
  const description = `${plan} plan — ${credits} monthly credits`;

  // Atomic path (migration 005): ledger insert + balance increment in one
  // transaction, deduped on the period key — safe under webhook redelivery.
  const { error: rpcError } = await admin.rpc('grant_subscription_credits', {
    p_user_id: userId,
    p_amount: credits,
    p_description: description,
    p_period_key: periodKey,
  });

  if (!rpcError) return;

  const missingFn = rpcError.code === 'PGRST202' || rpcError.code === '42883'
    || /could not find the function|does not exist/i.test(rpcError.message ?? '');
  if (!missingFn) {
    throw new Error(`CREDIT_GRANT_FAILED ${periodKey}: ${rpcError.message}`);
  }

  // Legacy two-step path until migration 005 is applied
  console.warn('grant_subscription_credits RPC missing — apply migration 005. Using legacy grant.');

  const { data: existing } = await admin
    .from('credit_ledger')
    .select('id')
    .eq('user_id', userId)
    .eq('stripe_session_id', periodKey)
    .maybeSingle();

  if (existing) return; // Already granted this period

  const { error: ledgerError } = await admin.from('credit_ledger').insert({
    user_id: userId,
    amount: credits,
    type: 'subscription',
    description,
    stripe_session_id: periodKey,
  });
  if (ledgerError) {
    throw new Error(`CREDIT_GRANT_FAILED ledger insert ${periodKey}: ${ledgerError.message}`);
  }

  const { error: incError } = await admin.rpc('increment_credits', {
    p_user_id: userId,
    p_amount: credits,
  });

  if (incError) {
    // Fallback: read current balance then increment
    const { data: row } = await admin
      .from('credits')
      .select('balance, lifetime_earned')
      .eq('user_id', userId)
      .single();

    if (row) {
      const { error: updError } = await admin.from('credits').update({
        balance: row.balance + credits,
        lifetime_earned: row.lifetime_earned + credits,
      }).eq('user_id', userId);
      if (updError) throw new Error(`CREDIT_GRANT_FAILED balance update ${periodKey}: ${updError.message}`);
    } else {
      const { error: insError } = await admin.from('credits').insert({
        user_id: userId,
        balance: credits,
        lifetime_earned: credits,
        lifetime_spent: 0,
      });
      if (insError) throw new Error(`CREDIT_GRANT_FAILED balance insert ${periodKey}: ${insError.message}`);
    }
  }
}
