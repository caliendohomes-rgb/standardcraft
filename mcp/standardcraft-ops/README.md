# standardcraft-ops — custom MCP server

A purpose-built [Model Context Protocol](https://modelcontextprotocol.io) server that
consolidates StandardCraft's recurring launch/ops tasks into one tool surface. Point any
MCP client (Claude Code, Claude Desktop, etc.) at it and complete each task with a single
call — including the items the generic connectors couldn't do (notably GitHub branch
protection, which the built-in GitHub connector doesn't expose but the REST API supports).

## Tools

| Tool | What it does | Needs |
|---|---|---|
| `branch_protection_status` | Report protection state on a branch (force-push allowed?) | `GITHUB_TOKEN` |
| `branch_protection_enable` | Block force pushes + deletions on `main` (the safeguard against an accidental overwrite); optional `require_pr` | `GITHUB_TOKEN` (admin) |
| `netlify_deploy_status` | Latest production deploy: state, branch, commit ref, timestamps | `NETLIFY_AUTH_TOKEN` |
| `netlify_trigger_deploy` | Trigger a fresh production build | `NETLIFY_AUTH_TOKEN` |
| `forms_inbox` | Read recent `contact_messages` + `school_inquiries` rows | `SUPABASE_SERVICE_ROLE_KEY` |
| `email_test` | Verify SMTP + send a test email through the Workspace mailbox | `SMTP_USER`, `SMTP_PASS` |

## Security model

No secrets are embedded. Every credential is read from the environment at runtime.
A tool whose credentials are missing returns a clear, non-fatal error — it never crashes
and never logs secret values. Keep your real values in a local `.env` (gitignored) or in
your MCP client's `env` block.

## Setup

```bash
cd mcp/standardcraft-ops
npm install
cp .env.example .env   # then fill in the values you have
```

### Credentials and where to get them
- **GITHUB_TOKEN** — GitHub → Settings → Developer settings → Personal access tokens.
  Needs `repo` scope and admin on `caliendohomes-rgb/standardcraft` for branch protection.
- **NETLIFY_AUTH_TOKEN** — Netlify → User settings → Applications → New access token.
- **SUPABASE_SERVICE_ROLE_KEY** — Supabase → Project Settings → API → `service_role` key.
- **SMTP_USER / SMTP_PASS** — `support@standard-craft.com` + a Google Workspace
  **App Password** (Account → Security → 2-Step Verification → App passwords).

## Register with an MCP client

### Claude Code (CLI)
```bash
claude mcp add standardcraft-ops -- node /absolute/path/to/standardcraft/mcp/standardcraft-ops/server.mjs
```
Or add a `.mcp.json` at the repo root:
```json
{
  "mcpServers": {
    "standardcraft-ops": {
      "command": "node",
      "args": ["mcp/standardcraft-ops/server.mjs"],
      "env": {
        "GITHUB_TOKEN": "...",
        "NETLIFY_AUTH_TOKEN": "...",
        "SUPABASE_SERVICE_ROLE_KEY": "...",
        "SMTP_USER": "support@standard-craft.com",
        "SMTP_PASS": "..."
      }
    }
  }
}
```

### Claude Desktop
Add the same `mcpServers` block to `claude_desktop_config.json`
(macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`).

## Verify it loads (no credentials needed)
```bash
npm run check        # syntax
node server.mjs      # prints: "standardcraft-ops MCP server running on stdio"
```

## Typical run-through once configured
1. `branch_protection_enable` → force-push protection on `main`
2. `netlify_trigger_deploy` then `netlify_deploy_status` → confirm production is current
3. `email_test` → confirm form notifications route to the Workspace mailbox
4. `forms_inbox` → review leads any time without opening the Supabase dashboard
