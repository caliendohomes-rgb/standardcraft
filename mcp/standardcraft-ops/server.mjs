#!/usr/bin/env node
/**
 * standardcraft-ops — custom MCP server
 *
 * Consolidates the recurring StandardCraft launch/ops tasks into one tool
 * surface so they can be completed with a single call each:
 *
 *   - branch_protection_status   read GitHub branch protection on a branch
 *   - branch_protection_enable   enable force-push protection on main (the
 *                                safeguard against the June-22-style overwrite)
 *   - netlify_deploy_status      latest production deploy state + commit
 *   - netlify_trigger_deploy     trigger a fresh production build
 *   - forms_inbox                read recent contact + school-inquiry rows
 *   - email_test                 send a test email through the SMTP config
 *
 * SECURITY: no secrets are embedded. Every credential is read from the
 * environment at runtime. Missing credentials produce a clear, non-fatal
 * error rather than a crash.
 *
 * Required env (only what each tool needs):
 *   GITHUB_TOKEN                 PAT with `repo` + admin (for branch protection)
 *   GITHUB_OWNER                 default: caliendohomes-rgb
 *   GITHUB_REPO                  default: standardcraft
 *   NETLIFY_AUTH_TOKEN           personal access token
 *   NETLIFY_SITE_ID              default: 3605e401-9cae-421c-aab4-35efaae48626
 *   SUPABASE_URL                 default: https://agdlewezwzdjlzlyzfgz.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    service role key (server-only)
 *   SMTP_USER / SMTP_PASS        Google Workspace mailbox + App Password
 *   SMTP_HOST (smtp.gmail.com) / SMTP_PORT (465) / EMAIL_FROM optional
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const DEFAULTS = {
  GITHUB_OWNER: 'caliendohomes-rgb',
  GITHUB_REPO: 'standardcraft',
  NETLIFY_SITE_ID: '3605e401-9cae-421c-aab4-35efaae48626',
  SUPABASE_URL: 'https://agdlewezwzdjlzlyzfgz.supabase.co',
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '465',
};

const env = (k) => process.env[k] || DEFAULTS[k] || '';

/** Build a text-content tool result. */
function text(body) {
  return { content: [{ type: 'text', text: typeof body === 'string' ? body : JSON.stringify(body, null, 2) }] };
}
function fail(msg) {
  return { content: [{ type: 'text', text: `ERROR: ${msg}` }], isError: true };
}

function requireEnv(...keys) {
  const missing = keys.filter((k) => !env(k));
  return missing.length ? `Missing required env var(s): ${missing.join(', ')}` : null;
}

async function ghFetch(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env('GITHUB_TOKEN')}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'standardcraft-ops-mcp',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });
  return res;
}

const server = new McpServer({ name: 'standardcraft-ops', version: '1.0.0' });

/* ----------------------------------------------------------------------------
 * GitHub branch protection
 * ------------------------------------------------------------------------- */
server.tool(
  'branch_protection_status',
  'Report whether GitHub branch protection is enabled on a branch (default: main), including whether force pushes are allowed.',
  { branch: z.string().default('main') },
  async ({ branch }) => {
    const miss = requireEnv('GITHUB_TOKEN');
    if (miss) return fail(miss);
    const owner = env('GITHUB_OWNER');
    const repo = env('GITHUB_REPO');
    const res = await ghFetch(`/repos/${owner}/${repo}/branches/${branch}/protection`);
    if (res.status === 404) return text(`Branch "${branch}" is NOT protected (no protection rule).`);
    if (!res.ok) return fail(`GitHub ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return text({
      branch,
      protected: true,
      allow_force_pushes: data.allow_force_pushes?.enabled ?? null,
      allow_deletions: data.allow_deletions?.enabled ?? null,
      required_pull_request_reviews: data.required_pull_request_reviews ?? null,
      enforce_admins: data.enforce_admins?.enabled ?? null,
    });
  }
);

server.tool(
  'branch_protection_enable',
  'Enable branch protection on a branch (default: main). Blocks force pushes and deletions — the safeguard against an accidental history overwrite. Set require_pr=true to also require pull requests before merging.',
  {
    branch: z.string().default('main'),
    require_pr: z.boolean().default(false),
    enforce_admins: z.boolean().default(false),
  },
  async ({ branch, require_pr, enforce_admins }) => {
    const miss = requireEnv('GITHUB_TOKEN');
    if (miss) return fail(miss);
    const owner = env('GITHUB_OWNER');
    const repo = env('GITHUB_REPO');
    const body = {
      required_status_checks: null,
      enforce_admins,
      required_pull_request_reviews: require_pr ? { required_approving_review_count: 0 } : null,
      restrictions: null,
      allow_force_pushes: false,
      allow_deletions: false,
    };
    const res = await ghFetch(`/repos/${owner}/${repo}/branches/${branch}/protection`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    if (!res.ok) return fail(`GitHub ${res.status}: ${await res.text()}`);
    return text(`Branch protection enabled on "${branch}". Force pushes blocked, deletions blocked${require_pr ? ', pull request required' : ''}.`);
  }
);

/* ----------------------------------------------------------------------------
 * Netlify deploys
 * ------------------------------------------------------------------------- */
server.tool(
  'netlify_deploy_status',
  'Return the latest production deploy for the StandardCraft Netlify site: state, branch, commit ref, and timestamps.',
  {},
  async () => {
    const miss = requireEnv('NETLIFY_AUTH_TOKEN');
    if (miss) return fail(miss);
    const site = env('NETLIFY_SITE_ID');
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${site}/deploys?per_page=1`, {
      headers: { Authorization: `Bearer ${env('NETLIFY_AUTH_TOKEN')}` },
    });
    if (!res.ok) return fail(`Netlify ${res.status}: ${await res.text()}`);
    const [d] = await res.json();
    if (!d) return text('No deploys found for this site.');
    return text({
      state: d.state,
      branch: d.branch,
      commit_ref: d.commit_ref,
      created_at: d.created_at,
      published_at: d.published_at,
      deploy_url: d.deploy_ssl_url || d.ssl_url,
      error_message: d.error_message ?? null,
    });
  }
);

server.tool(
  'netlify_trigger_deploy',
  'Trigger a fresh production build/deploy of the StandardCraft Netlify site from its configured branch.',
  { clear_cache: z.boolean().default(false) },
  async ({ clear_cache }) => {
    const miss = requireEnv('NETLIFY_AUTH_TOKEN');
    if (miss) return fail(miss);
    const site = env('NETLIFY_SITE_ID');
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${site}/builds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env('NETLIFY_AUTH_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clear_cache ? { clear_cache: true } : {}),
    });
    if (!res.ok) return fail(`Netlify ${res.status}: ${await res.text()}`);
    const b = await res.json();
    return text(`Build triggered. id=${b.id} state=${b.deploy_state ?? 'enqueued'}. Check netlify_deploy_status in ~1–2 min.`);
  }
);

/* ----------------------------------------------------------------------------
 * Supabase form inbox
 * ------------------------------------------------------------------------- */
async function sbSelect(table, limit) {
  const res = await fetch(
    `${env('SUPABASE_URL')}/rest/v1/${table}?select=*&order=created_at.desc&limit=${limit}`,
    {
      headers: {
        apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
        Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
    }
  );
  if (!res.ok) throw new Error(`Supabase ${table} ${res.status}: ${await res.text()}`);
  return res.json();
}

server.tool(
  'forms_inbox',
  'Read the most recent contact messages and school/district inquiries stored in Supabase, so leads can be reviewed without the dashboard.',
  { limit: z.number().int().min(1).max(50).default(10) },
  async ({ limit }) => {
    const miss = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (miss) return fail(miss);
    try {
      const [contact, school] = await Promise.all([
        sbSelect('contact_messages', limit),
        sbSelect('school_inquiries', limit),
      ]);
      return text({ contact_messages: contact, school_inquiries: school });
    } catch (e) {
      return fail(e.message);
    }
  }
);

/* ----------------------------------------------------------------------------
 * SMTP email test
 * ------------------------------------------------------------------------- */
server.tool(
  'email_test',
  'Send a test email through the configured Google Workspace SMTP to verify form-notification routing works end to end.',
  { to: z.string().email().optional() },
  async ({ to }) => {
    const miss = requireEnv('SMTP_USER', 'SMTP_PASS');
    if (miss) return fail(miss);
    const port = Number(env('SMTP_PORT'));
    const transport = nodemailer.createTransport({
      host: env('SMTP_HOST'),
      port,
      secure: port === 465,
      auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
    });
    const from = env('EMAIL_FROM') || env('SMTP_USER');
    const recipient = to || env('SMTP_USER');
    try {
      await transport.verify();
      const info = await transport.sendMail({
        from,
        to: recipient,
        subject: 'StandardCraft SMTP test ✓',
        text: 'This confirms StandardCraft form-notification email routing is working.',
      });
      return text(`SMTP verified and test email sent to ${recipient}. messageId=${info.messageId}`);
    } catch (e) {
      return fail(`SMTP failure: ${e.message}`);
    }
  }
);

/* ------------------------------------------------------------------------- */
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('standardcraft-ops MCP server running on stdio');
