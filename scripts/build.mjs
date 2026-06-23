import { mkdir, rm, writeFile, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resources } from "../src/data/resources.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const siteUrl = "https://standardcraftny.com";
const resourceCount = resources.length;

const routes = [
  { path: "/", title: "StandardCraft | NYS-Aligned Classroom Resources for Teachers", description: `Browse ${resourceCount} original New York classroom resources with alignment notes, SDI ideas, and MLL/ELL supports. Claim one free resource with no payment required.`, schema: "home" },
  { path: "/claim-free", title: "Claim One Free NYS-Aligned Resource | StandardCraft", description: `Create a free StandardCraft account to browse ${resourceCount} resources and download one with your signup credit. No card or student data required.` },
  { path: "/free-resource-library", title: "Free NYS Resource Library | StandardCraft", description: `Browse ${resourceCount} NYS-aligned classroom resources for ELA, Math, Science, Social Studies, Writing, Intervention, SEL, and more.` },
  { path: "/resources", title: "Browse NYS-Aligned Resources | StandardCraft", description: `Browse ${resourceCount} public resource previews with standards notes, SDI support ideas, and MLL/ELL scaffolds.` },
  { path: "/dashboard", title: "Dashboard | StandardCraft", description: "View your StandardCraft credits and downloaded classroom resources.", noindex: true },
  { path: "/pricing", title: "Pricing for NYS Classroom Resource Credits | StandardCraft", description: "Compare Sampler, Classroom, Pro, and School pricing with monthly and annual credit plans for NYS-aligned classroom resources." },
  { path: "/school-inquiry", title: "School Inquiry | StandardCraft", description: "Request school or district pricing for pooled StandardCraft credits, PO billing, privacy review, and teacher onboarding." },
  { path: "/schools", title: "School and District Resource Support | StandardCraft", description: "Request a school or district conversation about NYS-aligned resource support, privacy, procurement, and teacher adoption.", noindex: true },
  { path: "/contact", title: "Contact StandardCraft", description: "Contact StandardCraft for billing setup, school conversations, support, or product questions." },
  { path: "/privacy", title: "Privacy | StandardCraft", description: "StandardCraft does not require student data for free browsing, previews, or signup-credit downloads." },
  { path: "/terms", title: "Terms | StandardCraft", description: "StandardCraft resources support teacher planning and do not replace district curriculum or professional judgment." },
  { path: "/data-security", title: "Data Security | StandardCraft", description: "Review StandardCraft's static launch data-security posture and production readiness notes." },
  { path: "/refunds", title: "Refunds | StandardCraft", description: "Paid checkout is staged. Refund terms should be finalized before Stripe production launch." },
  { path: "/account", title: "Account | StandardCraft", description: "Manage your StandardCraft account, sign in, or sign out.", noindex: true },
  { path: "/sign-in", title: "Sign In | StandardCraft", description: "Sign in to StandardCraft to use your free signup credit.", noindex: true }
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function htmlShell(route, body = "") {
  const canonical = `${siteUrl}${route.path === "/" ? "" : route.path}`;
  const robots = route.noindex ? "noindex, nofollow" : "index, follow";
  const schema = route.schema === "home" ? `
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "StandardCraft",
        url: siteUrl,
        description: "NYS-aligned classroom resource planning support for teachers, schools, and districts."
      },
      {
        "@type": "WebSite",
        name: "StandardCraft",
        url: siteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/free-resource-library?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      }
    ]
  })}</script>` : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="${robots}">
  <title>${escapeHtml(route.title)}</title>
  <meta name="description" content="${escapeHtml(route.description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(route.title)}">
  <meta property="og:description" content="${escapeHtml(route.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="StandardCraft">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(route.title)}">
  <meta name="twitter:description" content="${escapeHtml(route.description)}">
  <link rel="stylesheet" href="/assets/styles.css">
  ${schema}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div id="app">${body}</div>
  <script src="/assets/resources.js"></script>
  <script src="/assets/app.js"></script>
</body>
</html>`;
}

function routeToFile(routePath) {
  if (routePath === "/") return join(dist, "index.html");
  return join(dist, routePath.replace(/^\//, ""), "index.html");
}

function resourceFallback(resource) {
  return `<main id="main" class="page-shell static-preview">
    <p class="eyebrow">${escapeHtml(resource.subject)} / ${escapeHtml(resource.gradeBand)}</p>
    <h1>${escapeHtml(resource.title)}</h1>
    <p>${escapeHtml(resource.shortDescription)}</p>
    <dl>
      <dt>NYS framework label</dt><dd>${escapeHtml(resource.nysFrameworkLabel)}</dd>
      <dt>Alignment note</dt><dd>${escapeHtml(resource.alignmentNote)}</dd>
      <dt>Classroom use case</dt><dd>${escapeHtml(resource.classroomUseCase)}</dd>
      <dt>SDI support idea</dt><dd>${escapeHtml(resource.sdiSupport)}</dd>
      <dt>MLL/ELL support idea</dt><dd>${escapeHtml(resource.mllEllSupport)}</dd>
    </dl>
    <h2>Preview</h2>
    <ul>${resource.previewContent.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  </main>`;
}

function downloadMarkdown(resource) {
  return `# ${resource.title}

Subject: ${resource.subject}
Grade band: ${resource.gradeBand}
Resource type: ${resource.resourceType}
NYS framework label: ${resource.nysFrameworkLabel}

## Short Description
${resource.shortDescription}

## Alignment Note
${resource.alignmentNote}

## Classroom Use Case
${resource.classroomUseCase}

## SDI Support Idea
${resource.sdiSupport}

## MLL/ELL Support Idea
${resource.mllEllSupport}

## Preview Content
${resource.previewContent.map((item) => `- ${item}`).join("\n")}

## Teacher Notes
This original StandardCraft resource is intended to support planning and classroom use. It is not issued by NYSED and does not replace district curriculum, local requirements, or teacher professional judgment.
`;
}

async function write(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, "assets"), { recursive: true });
await mkdir(join(dist, "downloads"), { recursive: true });

for (const route of routes) {
  await write(routeToFile(route.path), htmlShell(route));
}

for (const resource of resources) {
  const route = {
    path: `/resources/${resource.slug}`,
    title: `${resource.gradeBand} ${resource.subject} ${resource.title} | NYS-Aligned Classroom Support | StandardCraft`,
    description: `Preview a ${resource.gradeBand} ${resource.subject} resource with NYS alignment notes, SDI supports, and MLL/ELL scaffolds. Built for teacher planning support.`
  };
  const breadcrumbSchema = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Resources", item: `${siteUrl}/free-resource-library` },
      { "@type": "ListItem", position: 2, name: resource.title, item: `${siteUrl}/resources/${resource.slug}` }
    ]
  })}</script>
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: resource.title,
    description: resource.shortDescription,
    educationalLevel: resource.gradeBand,
    learningResourceType: resource.resourceType,
    teaches: resource.nysFrameworkLabel,
    isAccessibleForFree: true,
    provider: { "@type": "Organization", name: "StandardCraft", url: siteUrl }
  })}</script>`;
  await write(routeToFile(route.path), htmlShell(route, `${breadcrumbSchema}${resourceFallback(resource)}`));
  await write(join(dist, "downloads", `${resource.slug}.md`), downloadMarkdown(resource));
}

await copyFile(join(root, "src", "styles.css"), join(dist, "assets", "styles.css"));
await copyFile(join(root, "src", "app.js"), join(dist, "assets", "app.js"));
await write(join(dist, "assets", "resources.js"), `window.STANDARDCRAFT_RESOURCES = ${JSON.stringify(resources, null, 2)};\n`);

const sitemapUrls = [
  ...routes.filter((route) => !route.noindex).map((route) => route.path),
  ...resources.map((resource) => `/resources/${resource.slug}`)
];

await write(join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((path) => `  <url><loc>${siteUrl}${path === "/" ? "" : path}</loc></url>`).join("\n")}
</urlset>
`);

await write(join(dist, "robots.txt"), `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /account
Disallow: /sign-in
Sitemap: ${siteUrl}/sitemap.xml
`);

await write(join(dist, "__forms.html"), `<!doctype html>
<html lang="en">
<body>
  <form name="school-inquiry" data-netlify="true" netlify-honeypot="bot-field" hidden>
    <input type="hidden" name="form-name" value="school-inquiry">
    <input name="name">
    <input name="email">
    <input name="school">
    <input name="role">
    <textarea name="message"></textarea>
    <input name="bot-field">
  </form>
</body>
</html>
`);

console.log(`Built StandardCraft with ${resources.length} resources.`);
