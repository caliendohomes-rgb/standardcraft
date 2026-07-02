import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// Tailwind runs through PostCSS (postcss.config.mjs) — the @astrojs/tailwind
// integration was retired upstream for Astro 6+.
// Astro 6 static output = old "hybrid": pages prerender by default and opt
// into SSR with `export const prerender = false`.
export default defineConfig({
  adapter: netlify({
    edgeMiddleware: false,
  }),
  site: 'https://standardcraftny.com',
  compressHTML: true,
});
