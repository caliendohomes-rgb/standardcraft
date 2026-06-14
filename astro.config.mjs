import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';

export default defineConfig({
  integrations: [tailwind()],
  output: 'hybrid',
  adapter: netlify({
    edgeMiddleware: false,
  }),
  site: 'https://standardcraftny.com',
  compressHTML: true,
});

