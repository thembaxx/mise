# Mise × TanStack Redact — isolated benchmark

**Status:** Experiment only; do not merge until React Three Fiber, Drei and Rapier are verified on a real browser, including mobile. Mise production remains React 19.

## Versions and reproduction

- React control: existing React 19 + React DOM, with the same app source.
- Redact candidate: pinned @tanstack/redact 0.1.4, using the official Vite plugin and default (full) feature preset.
- Native React control build: \`npm run build:react\`
- Redact build: \`npm run build:redact\` or \`npm run build\`
- Isolated browser tests: \`npm run test:redact:e2e\` (requires Playwright Chromium).
- The experiment branch defaults to Redact; \`vite build --mode react\` excludes the alias. Never mix React and Redact in one component tree.
- The branch is not production. This is a source-level comparison and requires the exact same dependency lockfile and test device for valid performance comparisons.

## Control metrics (production main, 2026-10-26, Vercel deployment dpl_4y2QA7CBJZ7MrDSmdUF2ZBMnidTE)

| Bundle | Minified | Gzip |
| --- | ---: | ---: |
| Initial JS (index) | 388.44 kB | 131.52 kB |
| Deferred 3D kitchen | 3212.84 kB | 1099.10 kB |
| Both JS chunks, simple sum | 3601.28 kB | 1230.62 kB |
| Workbox window chunk | 5.75 kB | 2.36 kB |
| PWA precache | 4179.72 KiB | not a transfer measure |

Measured by the Vite CLI output; vendor and chunking differences mean the combined sum is not the same as HTTP transfer time.

## Acceptance matrix

| Gate | Requirement |
| --- | --- |
| Build | TypeScript and Vite build with all existing unit tests |
| Runtime | No uncaught errors in Chromium |
| React basics | Search, favorites, theme selection and Suspense/lazy boundary work |
| 3D | Actual WebGL scene visible, orbit/drag/cook interactions respond (not just fallback HTML) |
| Cooking | Timer, ingredients, knife, pour, stir, plate workflow complete |
| Mobile | Repeat on a touch device / mobile Playwright viewport |
| PWA | Service worker registration, offline shell and update prompts still work |
| Quality | No substantial regressions in startup timing and input responsiveness |

## Critical compatibility caveat

React Three Fiber is a React renderer using \`react-reconciler\`, not just a component library. Its internal reconciler may depend on React internals that Redact does not provide. A passing bundle build and DOM smoke test are **not** evidence of working 3D physics. Do not ship a degraded 3D experience merely to save runtime bytes.

Redact deliberately uses synchronous rendering and does not implement all React concurrent and action hooks. Confirm license terms before any production adoption; package registry metadata does not report a conventional license.

Sources:
- https://tanstack.com/redact/latest
- https://github.com/TanStack/redact
- https://r3f.docs.pmnd.rs/getting-started/installation

## Results

Fill after the Redact preview deployment finishes. Keep **main** unchanged regardless of this experiment's outcome.
