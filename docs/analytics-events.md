# StandardCraft — Analytics & Conversion Event Plan

_Last updated: 2026-06-18_

**Status:** No analytics provider is currently wired. The codebase already exposes optional hooks
in `.env.example` (`PUBLIC_ANALYTICS_PROVIDER`, `PUBLIC_ANALYTICS_DOMAIN`) but nothing consumes
them. This document defines the event taxonomy and the lightest-weight way to instrument it **without
adding a third-party dependency** until the owner chooses a provider (Plausible recommended — no
cookies, privacy-friendly, appropriate for an education audience that collects no student data).

## Key conversion events

| Event name | Trigger (element / route) | Why it matters |
|------------|---------------------------|----------------|
| `home_cta_click` | Hero "Claim my free resource" / final CTA (`/` → `/claim-free`) | Top-of-funnel intent |
| `sample_view` | "View NYS sample resources" / "See the alignment record" (`/resources`) | Proof engagement |
| `resource_card_click` | Resource card → `/resources/[slug]` | Library scanning depth |
| `start_free_started` | `/claim-free` form first interaction | Funnel entry |
| `start_free_completed` | Successful `/api/register` + sign-in | **Primary conversion** |
| `sign_in_clicked` | Nav/sign-in CTA → `/sign-in` | Returning users |
| `pricing_plan_clicked` | `/pricing` Classroom/Pro checkout button (`data-plan`) | Paid intent |
| `checkout_started` | `/api/checkout` returns a session URL | Pre-payment |
| `school_quote_submitted` | `/school-inquiry` form submit (`/api/school-inquiry`) | B2B pipeline |
| `download_started` | `/free-resource-library` download button | Activation |
| `dashboard_upgrade_clicked` | `/dashboard` "Upgrade plan" → `/pricing` | Expansion |

## Recommended implementation (no dependency, provider-agnostic)

1. Add `data-track="<event_name>"` attributes to the CTAs/buttons/forms listed above.
2. Add one tiny delegated listener in `Layout.astro` that calls a global `track()`:

```html
<script>
  function track(name, props = {}) {
    // Provider-agnostic: replace the body when a provider is chosen.
    // Plausible:  (window).plausible?.(name, { props });
    // GA4:        (window).gtag?.('event', name, props);
    if (import.meta.env.DEV) console.debug('[track]', name, props);
  }
  (window as any).track = track;
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest('[data-track]');
    if (el) track(el.getAttribute('data-track'), { path: location.pathname });
  });
</script>
```

3. For server-side conversions (`start_free_completed`, `checkout_started`), emit the event
   client-side after the success branch in the existing `<script>` blocks
   (`claim-free.astro`, `pricing.astro`) — `track('start_free_completed')`.

## When a provider is chosen
- Add the provider snippet to `<head>` in `Layout.astro` gated on `PUBLIC_ANALYTICS_PROVIDER`.
- Fill in the `track()` body for that provider. No other code changes needed.
- Keep it cookieless / no PII — consistent with the "no student data" positioning.

> Not yet implemented in code (no provider selected). This is the plan + the drop-in hook so the
> data attributes and a single dispatcher can be added in a few minutes once a provider is picked.
