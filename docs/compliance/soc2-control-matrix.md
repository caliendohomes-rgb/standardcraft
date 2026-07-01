# SOC 2 Type II Control Matrix — StandardCraft

_Last updated: 2026-07-01_
_Maturity level: 2–3 (Developing → Defined)_

---

## Trust Services Criteria Coverage

### CC1 — Control Environment

| Criterion | Control | Evidence | Status |
|-----------|---------|----------|--------|
| CC1.1 | Commitment to integrity and ethical values | Privacy Policy, Terms of Service | ✅ |
| CC1.2 | Board / management oversight | Single-owner SaaS — owner reviews all deployments | ✅ |
| CC1.3 | Organizational structure & reporting | N/A (single-person team) | ⚠️ |
| CC1.4 | Competence requirements | Owner maintains TypeScript, Supabase, Stripe expertise | ✅ |
| CC1.5 | Accountability for controls | Owner responsible for all engineering and compliance | ✅ |

---

### CC2 — Communication and Information

| Criterion | Control | Evidence | Status |
|-----------|---------|----------|--------|
| CC2.1 | Use of relevant information | Supabase structured data, typed env.d.ts | ✅ |
| CC2.2 | Internal communication | GitHub commit history, this docs/ directory | ✅ |
| CC2.3 | External communication | Privacy Policy, Terms, Data Security page | ✅ |

---

### CC3 — Risk Assessment

| Criterion | Control | Evidence | Status |
|-----------|---------|----------|--------|
| CC3.1 | Risk identification | SOC 2 compliance audit completed 2026-07-01 | ✅ |
| CC3.2 | Risk analysis | Security findings in `docs/compliance/risk-assessment.md` | 🔄 |
| CC3.3 | Risk mitigation | Phase 1–3 roadmap in this matrix | 🔄 |

---

### CC4 — Monitoring Controls

| Criterion | Control | Evidence | Status |
|-----------|---------|----------|--------|
| CC4.1 | Ongoing evaluations | Netlify deploy logs, Supabase dashboard | ⚠️ |
| CC4.2 | Communication of deficiencies | Console.error logs to Netlify Functions log stream | ⚠️ |

**Gap:** No centralized log aggregation. Target: add Datadog or Netlify log drains.

---

### CC5 — Control Activities

| Criterion | Control | Evidence | Status |
|-----------|---------|----------|--------|
| CC5.1 | Selection and development of controls | netlify.toml security headers, RLS policies | ✅ |
| CC5.2 | Technology controls | Supabase RLS in `002_rls.sql`, SECURITY DEFINER RPCs | ✅ |
| CC5.3 | Policies and procedures | `docs/compliance/` documents | 🔄 |

---

### CC6 — Logical and Physical Access Controls

| Criterion | Control | Evidence | Status |
|-----------|---------|----------|--------|
| CC6.1 | Access restrictions | Supabase RLS; admin client uses service-role key server-side only | ✅ |
| CC6.2 | Prior to issuing credentials | Registration requires email + password ≥ 8 chars | ✅ |
| CC6.3 | Role-based access | RLS policies in `002_rls.sql` restrict users to own rows | ✅ |
| CC6.4 | Access removal | `customer.subscription.deleted` webhook disables access | ✅ |
| CC6.5 | Physical access controls | Netlify/Supabase cloud infrastructure (SOC 2 certified vendors) | ✅ |
| CC6.6 | Logical access over networking | HTTPS enforced; HSTS header set | ✅ |
| CC6.7 | Transmission of sensitive data | All data over TLS; session cookies HttpOnly, SameSite=Lax | ✅ |
| CC6.8 | Unauthorized software | Netlify immutable builds; no SSH access to servers | ✅ |

**Gap:** No MFA for admin access. Target: enable Supabase MFA for owner account.

---

### CC7 — System Operations

| Criterion | Control | Evidence | Status |
|-----------|---------|----------|--------|
| CC7.1 | Vulnerability detection | Manual code review; no automated scanning yet | ⚠️ |
| CC7.2 | Monitoring system components | `audit_log` table (migration `004_audit_log.sql`) | ✅ |
| CC7.3 | Evaluating security events | Console logs reviewed per incident | ⚠️ |
| CC7.4 | Incident response | See `incident-response-plan.md` | 🔄 |
| CC7.5 | Disclosure of breaches | Privacy Policy mandates notification | ✅ |

**Gap:** No automated security scanning (Dependabot, Snyk). Target: enable GitHub Dependabot.

---

### CC8 — Change Management

| Criterion | Control | Evidence | Status |
|-----------|---------|----------|--------|
| CC8.1 | Infrastructure changes | All changes via Git commits to GitHub; Netlify auto-deploy | ✅ |

**Gap:** No branch protection rules on `main`. Target: require PR reviews before merge.

---

### CC9 — Risk Mitigation

| Criterion | Control | Evidence | Status |
|-----------|---------|----------|--------|
| CC9.1 | Vendor risk | Supabase, Netlify, Stripe all hold SOC 2 Type II certifications | ✅ |
| CC9.2 | Business disruption | See `availability-and-backup-policy.md` | 🔄 |

---

## Key Legend
- ✅ Control implemented
- ⚠️ Partial / manual only — needs automation
- 🔄 Documented but not yet fully implemented

---

## Phase 1 Remediation (30-day target)

| Priority | Item | Owner | Status |
|----------|------|-------|--------|
| P0 | Add audit_log table (migration 004) | Engineering | ✅ Done |
| P0 | Content-Security-Policy header | Engineering | ✅ Done |
| P0 | HSTS header | Engineering | ✅ Done |
| P0 | Input validation + max-length enforcement | Engineering | ✅ Done |
| P1 | Enable GitHub Dependabot | Owner | ⬜ Todo |
| P1 | Enable branch protection on `main` | Owner | ⬜ Todo |
| P1 | Enable Supabase MFA for owner account | Owner | ⬜ Todo |
| P1 | Add rate limiting (Netlify Pro or Upstash) | Engineering | ⬜ Todo |

## Phase 2 Remediation (60-day target)

| Priority | Item | Owner |
|----------|------|-------|
| P2 | Centralized log aggregation (Datadog / Axiom) | Engineering |
| P2 | Annual billing UI toggle | Engineering |
| P2 | Stripe `invoice.payment_failed` dunning handler | Engineering |
| P2 | GitHub Actions CI (TypeScript check + secret scan) | Engineering |

## Phase 3 Remediation (90-day target)

| Priority | Item | Owner |
|----------|------|-------|
| P3 | pg_cron data retention automation | Engineering |
| P3 | Automated dependency scanning (Snyk) | Engineering |
| P3 | SOC 2 auditor package compilation | Owner |
