# Engineering Toolbox

A fast, SEO-first **engineering toolbox** web app built with [Astro](https://astro.build/).
It will eventually host 40+ client-side calculators across categories (electrical,
HVAC, mechanical, thermal, computer/software).

**Everything runs in the browser** — there is no backend, no database, and no auth.
The whole site ships as static HTML/JS and deploys to Cloudflare Workers with no adapter.

> **Status:** Phase 0 complete — scaffold, calculation engine + registry, design
> system + UI primitives, and the SEO-complete pages are all in place. The first
> tool (Ohm's Law) is live at `/elektrik/ohm-yasasi-hesaplayici`. Phase 1 adds
> more calculators by copying that pattern.

---

## Architecture rule

This is the rule the entire project is built around:

1. **Calculator logic is pure, framework-agnostic TypeScript.**
   Each tool's math lives in a small module under
   `src/calculators/<category>/` and is **fully unit-tested with Vitest**. It
   imports nothing from Astro or React and has no knowledge of the DOM.
2. **UI is separate from logic.** Astro pages and React islands render inputs
   and results; they call the pure functions but never embed the math.
3. **A typed registry describes the tools.** `src/calculators/registry.ts`
   exports a `Calculator` metadata type and an array used to list and route to
   tools. The registry holds metadata only — never calculation logic.

We build this foundation once, then add each new tool by copying an established
pattern: pure function + tests → registry entry → page/island.

---

## Tech stack

| Concern            | Choice                                                        |
| ------------------ | ------------------------------------------------------------- |
| Framework          | Astro (static output, `output: 'static'`)                     |
| Language           | TypeScript, **strict mode**                                   |
| Interactive UI     | React islands via `@astrojs/react`                            |
| Styling            | Tailwind CSS v4 via the `@tailwindcss/vite` plugin            |
| SEO                | `@astrojs/sitemap` + canonical URLs from the configured `site`|
| Unit tests         | Vitest                                                        |
| Deploy             | Cloudflare Workers (static assets — **no SSR adapter**)       |

### Notes on current integration methods

- **Tailwind v4** is integrated with the official `@tailwindcss/vite` plugin and
  a CSS entrypoint (`src/styles/global.css` → `@import "tailwindcss";`), imported
  from `BaseLayout.astro`. The legacy `@astrojs/tailwind` integration is
  deprecated and intentionally **not** used. Design tokens are declared with the
  v4 `@theme` directive.
- **Static deploy to Cloudflare Workers** needs no adapter. We only set `site` in
  `astro.config.mjs` (currently the `workers.dev` URL) so canonical URLs, the
  sitemap, and JSON-LD all point at the correct origin.
- Built against **Astro 7** (Rust compiler default — markup must be valid,
  fully-closed HTML), **React 19**, **Tailwind 4**, and **TypeScript 6**.

---

## Project structure

```
src/
  calculators/
    types.ts           # shared Calculator metadata + CalcResult contract
    registry.ts        # metadata-only registry + typed lookup helpers
    registry.test.ts   # registry helper coverage
    electrical/
      ohms-law.ts      # pure solve fn + input type + Calculator metadata
      ohms-law.test.ts # Vitest coverage for the pure logic
  components/
    ui/                # shared UI primitives — empty for now
    calculators/       # calculator-specific UI islands — empty for now
    SmokeTestCounter.tsx  # TEMPORARY toolchain smoke test (to be removed)
  data/
    categories.ts      # typed category list (electrical + placeholders)
  layouts/
    BaseLayout.astro   # <html lang="tr">, head/SEO, global.css, canonical URL
    ToolLayout.astro   # minimal stub for tool pages (full version later)
  pages/
    index.astro        # homepage
  styles/
    global.css         # Tailwind import + @theme design tokens
public/
  favicon.svg
test/
  smoke.test.ts        # trivial passing test proving Vitest works
```

---

## Getting started

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:4321)
```

### All commands

| Command              | What it does                                              |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Start the Astro dev server with HMR.                      |
| `npm run build`      | Build the static site into `dist/`.                       |
| `npm run preview`    | Serve the built `dist/` locally to verify the build.      |
| `npm run typecheck`  | Type-check the project with `astro check` (strict).       |
| `npm run test`       | Run the Vitest suite once.                                |
| `npm run test:watch` | Run Vitest in watch mode.                                 |

---

## Deployment (Cloudflare Workers, static)

The site is fully static (`output: 'static'`) — **no adapter**. Cloudflare serves
the pre-rendered `dist/` from the edge as static assets (see `wrangler.jsonc`;
`not_found_handling: "404-page"` serves `dist/404.html` on a miss). There is no
Worker code, so `wrangler.jsonc` has no `main` field.

Two ways to deploy:

1. **Git-connected (recommended).** In the Cloudflare dashboard go to
   **Workers & Pages → Create application → import the repository**. Cloudflare
   auto-detects Astro — build command `npm run build`, output directory `dist`.
   It deploys and then **auto-deploys on every push**.
2. **Local.** Run `wrangler login` once, then `npm run deploy`
   (which runs `npm run build && wrangler deploy`).

Notes:

- **Turn Cloudflare "Auto Minify" OFF.** It can mangle inline/island scripts and
  break client-side hydration (this site has a React island).
- `site` in `astro.config.mjs` is currently the `workers.dev` URL
  (`https://engineering-toolbox.rmznsyn2024.workers.dev`). Switch it to a custom
  domain later — a custom domain is decoupled from the Worker name, so only the
  `site` value (and the DNS/route in Cloudflare) needs to change.

---

## How to add a new calculator

Every calculator is **one self-contained module plus its test file** — this is
the unit you copy. `src/calculators/electrical/ohms-law.ts` is the reference
implementation; mirror its shape.

**1. Write the pure logic module** — `src/calculators/<category>/<slug>.ts`.
It exports exactly three things and imports nothing from React, Astro, the DOM,
or the browser:

- an **input type** (e.g. `OhmsLawInput`);
- a **pure `solve*` function** that returns a `CalcResult<T>` (the shared
  discriminated union from [`types.ts`](src/calculators/types.ts)). It must
  **never throw** — validate inputs and return a failure object via `fail(...)`
  on bad input (`{ ok: false, error: { code, message } }`); on success return
  `{ ok: true, ... }` with your results (and, where useful, a Turkish `steps`
  array for the step-by-step UI);
- a **`Calculator` metadata object** (e.g. `ohmsLawMeta`) typed against
  `Calculator` — id, slug (Turkish), `categoryId` (must match a category in
  [`categories.ts`](src/data/categories.ts)), title, description, formula,
  keywords, relatedTools. Its fields are `readonly` — the registry shares one
  object per tool, so treat metadata as immutable.

**2. Unit-test it** — co-locate `<slug>.test.ts` and cover the math thoroughly
with Vitest, including every error path. Logic is fully testable on its own
because it has no UI dependencies.

**3. Register the metadata** — in
[`registry.ts`](src/calculators/registry.ts), import **only** the `*Meta`
object and add it to the `calculators` array. The registry is metadata-only for
listing/routing/SEO; it must never import a `solve*` function.

**4. Wire up the UI — *separate, later step*.** UI lives outside this engine: a
React island under `src/components/calculators/` imports the `solve*` function
directly and renders inputs/results, and a page under `src/pages/` renders it
inside `ToolLayout`. (Built in Chunks 3–4.) **Calculation logic must never
import UI or framework code** — the dependency only ever flows UI → logic.

**5. Verify** — `npm run typecheck && npm run test && npm run build`.
