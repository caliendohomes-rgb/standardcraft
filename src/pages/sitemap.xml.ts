import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Prerender to a static /sitemap.xml at build time so it always reflects the
// current resource collection (no manual drift). robots.txt points here.
export const prerender = true;

const SITE = 'https://standardcraftny.com';

// Curated static routes with tuned priorities/changefreq.
const staticPages: { path: string; changefreq: string; priority: string }[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.9' },
  { path: '/resources', changefreq: 'weekly', priority: '0.9' },
  { path: '/claim-free', changefreq: 'monthly', priority: '0.8' },
  { path: '/school-inquiry', changefreq: 'monthly', priority: '0.7' },
  { path: '/nys-lesson-plans', changefreq: 'monthly', priority: '0.8' },
  { path: '/nys-worksheets', changefreq: 'monthly', priority: '0.8' },
  { path: '/nys-next-gen-ela-resources', changefreq: 'monthly', priority: '0.8' },
  { path: '/nys-math-resources', changefreq: 'monthly', priority: '0.8' },
  { path: '/nyssls-science-resources', changefreq: 'monthly', priority: '0.8' },
  { path: '/nys-social-studies-resources', changefreq: 'monthly', priority: '0.8' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.4' },
  { path: '/terms', changefreq: 'yearly', priority: '0.4' },
  { path: '/data-security', changefreq: 'yearly', priority: '0.4' },
  { path: '/refunds-and-assurance', changefreq: 'yearly', priority: '0.4' },
  { path: '/contact', changefreq: 'yearly', priority: '0.3' },
];

export const GET: APIRoute = async () => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const resources = await getCollection('resources');

  const urls: string[] = [];

  for (const page of staticPages) {
    urls.push(
      `  <url><loc>${SITE}${page.path}</loc><lastmod>${lastmod}</lastmod><changefreq>${page.changefreq}</changefreq><priority>${page.priority}</priority></url>`
    );
  }

  // Individual resource detail pages — enumerated from the content collection.
  for (const r of [...resources].sort((a, b) => a.id.localeCompare(b.id))) {
    urls.push(
      `  <url><loc>${SITE}/resources/${r.id}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
