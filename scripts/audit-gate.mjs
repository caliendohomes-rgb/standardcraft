#!/usr/bin/env node
/**
 * Blocking dependency-audit gate for CI.
 *
 * Runs `npm audit --json` and fails (exit 1) on any HIGH or CRITICAL advisory
 * except those explicitly allowlisted below. Moderate/low never block.
 *
 * Allowlist policy: an entry is only acceptable when ALL of these hold —
 *   1. No patched version of the package exists yet (npm audit range is "*").
 *   2. The vulnerable code is unreachable in production (dev-tooling only).
 *   3. The entry documents both facts and links the advisory.
 * Re-check entries when bumping dependencies; remove them as fixes ship.
 */
import { execSync } from 'node:child_process';

const ALLOWLIST = {
  // extract-zip: symlink path traversal. No patched release exists (all
  // versions flagged). Reached only via @netlify/functions-dev, part of the
  // Netlify local dev server bundled in @astrojs/netlify — never executed in
  // production builds or deployed functions.
  'GHSA-jmr9-qjv8-65gv': 'extract-zip (dev-server only, no fix released)',
  // image-size: ICNS / JXL+HEIF parser infinite-loop DoS. No patched release
  // exists. Reached only via @netlify/dev-utils in the same local dev server.
  'GHSA-w3rx-r6r6-pgpr': 'image-size ICNS (dev-server only, no fix released)',
  'GHSA-5p2g-fcmc-qvqq': 'image-size JXL/HEIF (dev-server only, no fix released)',
};

let raw;
try {
  raw = execSync('npm audit --json', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (err) {
  // npm audit exits non-zero when vulnerabilities exist; the JSON is still on stdout.
  raw = err.stdout;
  if (!raw) {
    console.error('npm audit produced no output:', err.message);
    process.exit(1);
  }
}

const report = JSON.parse(raw);
const vulns = report.vulnerabilities ?? {};
const blocking = [];
const waived = [];

for (const [name, info] of Object.entries(vulns)) {
  if (info.severity !== 'high' && info.severity !== 'critical') continue;
  // Direct advisories on this package (objects in `via`); string entries are
  // transitive blame pointers handled at their source package.
  const advisories = info.via.filter((v) => typeof v === 'object');
  if (advisories.length === 0) continue; // purely transitive — roots reported elsewhere
  const unwaived = advisories.filter((a) => {
    const id = (a.url ?? '').split('/').pop();
    return !(id in ALLOWLIST);
  });
  if (unwaived.length === 0) {
    waived.push(`${name}: ${advisories.map((a) => (a.url ?? '').split('/').pop()).join(', ')}`);
  } else {
    blocking.push(
      `${name} (${info.severity}): ` + unwaived.map((a) => `${a.title} <${a.url}>`).join('; ')
    );
  }
}

if (waived.length) {
  console.log('Waived advisories (allowlisted, see scripts/audit-gate.mjs):');
  for (const w of waived) console.log(`  - ${w}`);
}

if (blocking.length) {
  console.error('\nBlocking high/critical advisories:');
  for (const b of blocking) console.error(`  - ${b}`);
  process.exit(1);
}

console.log('\nAudit gate passed: no unwaived high/critical advisories.');
