import { mkdir, rm, writeFile, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resources } from "../src/data/resources.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const siteUrl = "https://standardcraft.co";

const routes = [
  { path: "/", title: "StandardCraft | NYS-Aligned Classroom Resources", description: "Browse 50 original New York classroom resources and download one free with your signup credit. No payment required." },
  { path: "/claim-free", title: "Claim Your Free StandardCraft Resource", description: "Create a free StandardCraft account or sign in to browse 50 resources and download one with your signup credit." },
  { path: "/free-resource-library", title: "Free Resource Library | StandardCraft", description: "Browse 50 NYS-aligned classroom resources for ELA, Math, Science, Social Studies, Writing, Intervention, SEL, and more." },
  { path: "/dashboard", title: "Dashboard | StandardCraft", description: "View your StandardCraft credits and downloaded classroom resources.", noindex: true },
  { path: "/pricing", title: "Pricing | StandardCraft", description: "Choose a StandardCraft plan for individual teachers, teams, or schoolwide curriculum planning support." },
  { path: "/school-inquiry", title: "School Inquiry | StandardCraft", description: "Tell StandardCraft about your school or district needs for NYS-aligned classroom resource support." },
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
    title: `${resource.title} | StandardCraft Resource Preview`,
    description: resource.shortDescription
  };
  await write(routeToFile(route.path), htmlShell(route, resourceFallback(resource)));
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
