// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Single source of truth for canonical URLs (BaseLayout) + sitemap + JSON-LD.
  site: 'https://engineering-toolbox.rmznsyn2024.workers.dev',

  // Fully static output. Static Astro deploys to Vercel with ZERO adapter
  // config, so we intentionally do NOT add an SSR adapter here.
  output: 'static',

  // Directory-format build emits canonical URLs with a trailing slash
  // (/elektrik/). Enforce that one form everywhere so canonicals, the sitemap,
  // JSON-LD item URLs, and internal links all agree (no redirect hops).
  trailingSlash: 'always',

  // React powers interactive islands; sitemap is generated at build time.
  integrations: [react(), sitemap()],

  // Self-hosted web fonts via Astro 7's built-in (stable) Fonts API — preferred
  // over a CDN for performance. The fontsource provider downloads + optimizes
  // the files at build time; the <Font/> component in BaseLayout emits the CSS.
  // The cssVariables below are wired into --font-sans / --font-mono in global.css.
  //
  // Subsets: latin-ext covers Turkish glyphs (ı ş ğ ç ö ü); greek is required so
  // the ohm sign Ω (U+03A9) renders in the font instead of a system fallback —
  // it appears in every result's unit + steps. (√ U+221A is in NO fontsource
  // subset, so it falls back to the system monospace stack, which has it.)
  fonts: [
    {
      name: 'Inter',
      cssVariable: '--font-inter',
      provider: fontProviders.fontsource(),
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext', 'greek'],
    },
    {
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      provider: fontProviders.fontsource(),
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext', 'greek'],
    },
  ],

  // Tailwind CSS v4 via its official Vite plugin (the deprecated
  // @astrojs/tailwind integration is intentionally NOT used).
  vite: {
    plugins: [tailwindcss()],
  },
});
