# StandardCraft — Customer User-Testing Audit

_Last updated: 2026-06-18_

This audit evaluates StandardCraft as the **target buyer** (NYS teacher, special-ed teacher,
MLL/ELL teacher, school leader, skeptical buyer), not just as a developer. Fixes flagged
"Applied: yes" were implemented in this pass and are live; "next iteration" items are queued.

> **Method note / honesty:** this machine has **no Node.js**, so the app cannot be run, linted,
> type-checked, or built locally. Verification is via the **Netlify production build** plus live
> route/HTML/CSS inspection. The "user test" is performed by reading the shipped code/copy and
> reasoning as each persona.

---

## Headline finding (root cause)
The site previously rendered as a **generic Tailwind template** for one concrete reason: the
entire brand design system in `global.css` (color tokens, `.card`/`.btn`/`.tag` components, warm
theme, fonts) **was never imported**, so production shipped bare Tailwind + system fonts. This was
fixed this session (Layout now imports it; `applyBaseStyles:false`). Much of the "needs redesign"
perception was actually this switched-off design layer.

---

## Journey A — First-time NYS teacher ("I need a worksheet for tomorrow")
- **Before:** Hero said "Warm, practical resources for standards-aligned teaching days" — pleasant
  but vague; a busy teacher couldn't tell in 5 seconds *what it is*, *that it's NY-specific*, or
  *what's free*. CTA "Start free" was generic.
- **Now:** Hero answers what/who/why/next: "NYS-aligned lessons and worksheets you can use tomorrow
  — and defend to your administrator," names NYS Next Gen/NYSSLS/NYSESLAT/CDOS, and the CTA reads
  "Claim my free resource." An "Inside every resource" card shows what you download.
- **Start Free works** (verified: `/claim-free` 200 → `/api/register` → auto sign-in → library).
  Reassurance copy ("no card, no student data, 1 signup credit") is present.

## Journey B — Special-education teacher (SDI / IEP support)
- **Before:** SDI/IEP value lived only *inside* resource bodies — invisible to someone scanning the
  marketing pages. A special-ed buyer couldn't tell the product served them.
- **Now:** Hero + "Inside every resource" + the 3-layer block surface **SDI across content/
  methodology/delivery** and an explicit **"IEP goal suggestions are teacher-reference material and
  do not constitute legal IEP documents"** line on the homepage — credible and non-overclaiming.
- **Next iteration:** a dedicated Special-Education section (ICT / Resource Room / Self-Contained
  placement language, an SDI example) would convert this audience harder.

## Journey C — MLL/ELL teacher
- **Before:** No MLL/ELL language on marketing pages.
- **Now:** Hero and resource card name **MLL/ELL scaffolds by NYSESLAT proficiency level**; resource
  bodies already differentiate Entering/Emerging vs Transitioning/Expanding (verified in content).
- **Next iteration:** show a concrete tiered-scaffold example on a marketing page (proof, not claim).

## Journey D — School leader / district buyer
- **Now:** Pricing has a **School tier** ($249+, Ed Law §2-d agreement, pooled credits) and the
  homepage final CTA adds **"Request a school quote"** → `/school-inquiry` (form works). NYSED-
  independence disclaimer appears on home, pricing, resources, detail pages, and footer — present
  without undermining confidence. The now-shipping design system makes it read as a serious product.
- **Next iteration:** a short "For schools & districts" trust row (compliance, Ed Law 2-d, invoicing).

## Journey E — Skeptical buyer ("why not just use ChatGPT?")
- **Before:** No answer on the site at all — the single biggest commercial gap.
- **Now:** A dedicated **"Why not just use a generic AI tool?"** block — "A prompt gives you a guess.
  StandardCraft gives you a record." — contrasts invented codes / Common Core / no SDI / nothing to
  show an admin vs. exact sourced codes / alignment record / SDI + NYSESLAT scaffolds / original,
  validated content. Paired with the 3-layer "how it's built" framework, this directly answers the
  objection without hype or overclaiming.

---

## Scorecard (1–5)

| # | Category | Score | Issue → Customer impact → Fix | Applied |
|---|----------|:----:|------------------------------|:------:|
| 1 | First-impression clarity | 2→4 | Vague hero; buyer couldn't tell what it is → bounce. Rewrote hero to answer what/who/why/next. | yes |
| 2 | NYS-specific credibility | 3→4 | NY-specificity implied, not stated → looked generic. Named NYS Next Gen/NYSSLS/NYSESLAT/CDOS in hero + 3-layer block. | yes |
| 3 | Trust & compliance | 4→4.5 | Strong disclaimers already; added IEP teacher-reference + NYSED-independence to homepage trust block. | yes |
| 4 | CTA clarity | 2→4 | Generic "Start free"/"Preview" → low intent. Now "Claim my free resource" / "View NYS sample resources" / "Request a school quote." | yes |
| 5 | Start-Free flow | 4 | Works; good reassurance. Slightly long form (name/email/phone/pw/subjects/grades). | minor |
| 6 | Sign-In flow | 4 | Works, honors `?redirect=`. No password-reset link. | next |
| 7 | Pricing clarity | 3 | Tiers + credit rule clear; **no monthly/annual toggle** (annual prices now exist); cards plain. | next |
| 8 | Sample / resource proof | 2→4 | No proof above the fold → low trust. Added "Inside every resource" card + differentiation table + samples section. | yes |
| 9 | Special-education value | 2→3.5 | SDI hidden in bodies. Surfaced SDI + IEP-reference on home; dedicated section still recommended. | partial |
| 10 | MLL/ELL value | 2→3.5 | No MLL language on marketing. Added NYSESLAT-leveled scaffold messaging; example still recommended. | partial |
| 11 | School/district path | 3→4 | Path existed but buried. Added homepage "Request a school quote" CTA. | yes |
| 12 | Visual design quality | 1→4 | **Design system wasn't shipping.** Now imported; Fraunces display type + seal. | yes |
| 13 | Brand distinctiveness | 1→4 | Bare Tailwind read as template. Seal mark + editorial serif + warm palette now live. | yes |
| 14 | Mobile experience | 3 | Responsive grids + hamburger present; needs a 375/768/1024 pass. | next |
| 15 | Accessibility | 3→3.5 | Added `prefers-reduced-motion` + global `:focus-visible`. Contrast pass on badge text pending. | partial |
| 16 | Performance | 3→4 | Removed render-blocking `@import`; fonts via `<link>` + `display=swap`; HTML compression on. | yes |
| 17 | Copy quality | 2→4 | "Warm/practical" → specific, commercial, accurate-to-claims copy. | yes |
| 18 | Conversion readiness | 2→4 | Weak hierarchy/proof → strong hero, proof, differentiation, scoped trust framework. | yes |
| 19 | Payment readiness | 2 | Price IDs set; **checkout still blocked** on owner pasting `sk_live_`/`rk_live_` + `whsec_`. | blocked (owner) |
| 20 | Overall launch readiness | 4 | Free product fully live, secure (HTTPS), and now branded. Paid plans pending Stripe secrets. | partial |

---

## Biggest blockers found
- **Conversion:** (1) vague hero, (2) no product proof above the fold, (3) **no answer to "why not ChatGPT."** All three now addressed.
- **Trust:** (1) the design system not shipping made a credible product look like a template; (2) SDI/MLL value invisible on marketing pages. (1) fixed; (2) surfaced, dedicated sections queued.
- **Functional:** checkout not live until the owner sets the Stripe secret key + webhook secret (only the owner can — credentials).

---

## Simulated Customer Feedback and Applied Fixes

**1. NYS teacher.** *Liked:* "I can tell in two seconds it's New York and I get one free." *Confused:* "Is the free thing a credit card trap?" → reinforced "No credit card" in the hero microcopy. *Would block:* a long form — flagged form length for a future trim.

**2. Special-ed teacher.** *Liked:* SDI named on the homepage and the explicit "not a legal IEP document" line — "that's exactly the language I need." *Confused:* "Do you cover Resource Room vs. ICT?" → queued a dedicated Special-Ed section with placement language. *Would block:* wanting to see one real SDI example before signing up.

**3. MLL/ELL teacher.** *Liked:* "NYSESLAT proficiency levels, not just 'give extra time.'" *Confused:* wants to *see* an Entering/Emerging vs Transitioning/Expanding example. → queued a sample scaffold on a marketing page.

**4. School leader.** *Liked:* the seal + serif made it "look like a real vendor"; School tier + Ed Law §2-d visible; "Request a school quote" on the homepage. *Confused:* wanted compliance/invoicing summarized in one place. → queued a "For schools" trust row.

**5. Skeptical buyer (vs ChatGPT).** *Liked:* "A prompt gives you a guess; StandardCraft gives you a record" + the side-by-side table — "that's the argument." *Confused:* wanted proof the codes are real → the alignment record on each detail page (with code + text + NYSED source) is the proof; queued surfacing one alignment record on the homepage.

---

## Recommended next iteration
1. Pricing: add monthly/annual toggle (prices exist) + branded tier cards with credit-math callout.
2. Dedicated **Special-Education** and **MLL/ELL** sections with one concrete example each.
3. Unify the two library filter UIs into one branded chip/sort bar; add zero-result state.
4. Mobile pass (375/768/1024) + badge-contrast AA check.
5. Surface one **alignment record** on the homepage as live proof.
6. Owner: set Stripe `sk_live_`/`rk_live_` + `whsec_` to switch on checkout.
