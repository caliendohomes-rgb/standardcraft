import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resources } from "../src/data/resources.mjs";

const dist = join(process.cwd(), "dist");
const requiredRoutes = ["/", "/claim-free", "/free-resource-library", "/dashboard", "/pricing", "/school-inquiry", "/schools", "/contact", "/privacy", "/terms", "/data-security", "/refunds", "/resources", "/account", "/sign-in"];
const requiredFields = ["title", "slug", "subject", "gradeBand", "resourceType", "shortDescription", "nysFrameworkLabel", "alignmentNote", "classroomUseCase", "previewContent", "sdiSupport", "mllEllSupport", "downloadPath"];
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function fileForRoute(path) {
  if (path === "/") return join(dist, "index.html");
  return join(dist, path.replace(/^\//, ""), "index.html");
}

assert(resources.length === 50, `Expected 50 resources, found ${resources.length}.`);

for (const resource of resources) {
  for (const field of requiredFields) {
    assert(resource[field] && (!Array.isArray(resource[field]) || resource[field].length > 0), `${resource.slug} missing ${field}.`);
  }
  assert(existsSync(join(dist, resource.downloadPath.replace(/^\//, ""))), `${resource.slug} download missing.`);
  assert(existsSync(fileForRoute(`/resources/${resource.slug}`)), `${resource.slug} detail page missing.`);
}

for (const route of requiredRoutes.filter((route) => route !== "/resources")) {
  assert(existsSync(fileForRoute(route)), `${route} route missing.`);
}

const home = readFileSync(join(dist, "index.html"), "utf8");
assert(home.includes("StandardCraft"), "Home metadata missing brand.");
assert(existsSync(join(dist, "sitemap.xml")), "sitemap.xml missing.");
assert(existsSync(join(dist, "robots.txt")), "robots.txt missing.");

const app = readFileSync(join(dist, "assets", "app.js"), "utf8");
for (const copy of ["totalResources", "download one free", "/claim-free", "/school-inquiry", "SDI support", "MLL/ELL support", "$29/mo", "$210/yr", "$69/mo", "$690/yr", "$249+/mo"]) {
  assert(app.includes(copy), `Expected app copy or route missing: ${copy}`);
}
assert(!app.includes("Download all 50 free"), "Misleading all-free copy found.");

const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
assert(sitemap.includes("https://standardcraftny.com"), "Sitemap must use live canonical domain.");
assert(!sitemap.includes("standardcraft.co"), "Old canonical domain found in sitemap.");
assert(sitemap.includes("https://standardcraftny.com/school-inquiry"), "School inquiry route should be indexed.");
assert(!sitemap.includes("https://standardcraftny.com/schools"), "Legacy schools alias should not be indexed.");
assert(home.includes("Browse 50 original New York classroom resources"), "Home metadata must use the actual 50-resource count.");

const robots = readFileSync(join(dist, "robots.txt"), "utf8");
for (const disallow of ["/dashboard", "/account", "/sign-in"]) {
  assert(robots.includes(`Disallow: ${disallow}`), `robots.txt missing ${disallow} disallow.`);
}

const resourcePreview = readFileSync(fileForRoute(`/resources/${resources[0].slug}`), "utf8");
assert(resourcePreview.includes("LearningResource"), "Resource structured data missing.");
assert(resourcePreview.includes("BreadcrumbList"), "Resource breadcrumb structured data missing.");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("QA checks passed: resources, routes, downloads, SEO files, and CTA copy are present.");
