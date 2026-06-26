import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const requiredRoutes = [
  'src/pages/index.astro',
  'src/pages/claim-free.astro',
  'src/pages/free-resource-library.astro',
  'src/pages/dashboard.astro',
  'src/pages/pricing.astro',
  'src/pages/school-inquiry.astro',
  'src/pages/account.astro',
  'src/pages/sign-in.astro',
  'src/pages/resources/[slug].astro',
];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

for (const route of requiredRoutes) {
  assert(existsSync(join(root, route)), `Missing required route file: ${route}`);
}

const resourceFiles = readdirSync(join(root, 'src/content/resources')).filter(file => file.endsWith('.md'));
assert(resourceFiles.length > 0, `Expected at least one resource content file, found ${resourceFiles.length}.`);

const downloadFiles = readdirSync(join(root, 'public/downloads')).filter(file => file.endsWith('.md'));
// Every content resource must have a matching fallback download file (count must agree).
assert(
  downloadFiles.length === resourceFiles.length,
  `Fallback download count (${downloadFiles.length}) does not match resource count (${resourceFiles.length}).`
);

for (const file of resourceFiles) {
  assert(downloadFiles.includes(file), `Missing fallback download for ${file}.`);
  const content = readFileSync(join(root, 'src/content/resources', file), 'utf8');
  for (const field of ['title:', 'grade_band:', 'subject:', 'resource_type:', 'standards_framework:', 'standards:']) {
    assert(content.includes(field), `${file} missing ${field}`);
  }
}

const combined = [
  'src/pages/index.astro',
  'src/pages/claim-free.astro',
  'src/pages/free-resource-library.astro',
  'src/pages/pricing.astro',
  'src/pages/resources/index.astro',
  'src/pages/resources/[slug].astro',
  'src/pages/api/download.ts',
  'netlify.toml',
].map(file => readFileSync(join(root, file), 'utf8')).join('\n');

for (const copy of [
  'download one free',
  '/claim-free',
  '/school-inquiry',
  '/sign-in',
  'Upgrade for more downloads',
]) {
  assert(combined.includes(copy), `Missing required copy or route: ${copy}`);
}

for (const bad of ['Download all', '50 free downloads', '1-3 credits', '/#start', '/#pricing', '/signin?']) {
  assert(!combined.includes(bad), `Found outdated or misleading text: ${bad}`);
}

// Resource counts on user-facing pages are derived dynamically from the content
// collection (no hardcoded totals), so guard against accidental hardcoded counts.
for (const hardcoded of ['Browse 50 resources', 'Browse 80 resources', '80 NYS-aligned', '50 NYS-aligned']) {
  assert(!combined.includes(hardcoded), `Found hardcoded resource count (should be dynamic): ${hardcoded}`);
}

// Sitemap is now generated at build time from the content collection
// (src/pages/sitemap.xml.ts) rather than a static public/sitemap.xml.
assert(existsSync(join(root, 'src/pages/sitemap.xml.ts')), 'Missing generated sitemap endpoint src/pages/sitemap.xml.ts.');
assert(existsSync(join(root, 'public/robots.txt')), 'Missing public/robots.txt.');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Launch QA passed: routes, ${resourceFiles.length} resources, matching downloads, CTA copy, SEO files, and free-credit language are present.`);
