import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resources } from "../src/data/resources.mjs";

const dist = join(process.cwd(), "dist");
const requiredRoutes = ["/", "/claim-free", "/free-resource-library", "/dashboard", "/pricing", "/school-inquiry", "/resources", "/account", "/sign-in"];
const requiredFields = ["title", "slug", "subject", "gradeBand", "resourceType", "shortDescription", "nysFrameworkLabel", "alignmentNote", "classroomUseCase", "previewContent", "downloadPath"];
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
for (const copy of ["Browse 50 resources", "download one free", "/claim-free", "/school-inquiry"]) {
  assert(app.includes(copy), `Expected app copy or route missing: ${copy}`);
}
assert(!app.includes("Download all 50 free"), "Misleading all-free copy found.");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("QA checks passed: resources, routes, downloads, SEO files, and CTA copy are present.");
