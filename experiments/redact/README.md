# Mise × TanStack Redact — isolated benchmark

**Status:** Experiment only; do not merge until React Three Fiber, Drei and Rapier are verified on a real browser, including mobile. Mise production remains React 19.

## Versions and reproduction

- React control: existing React 19 + React DOM, with the same app source.
- Redact candidate: pinned @tanstack/redact 0.1.4, using the official Vite plugin and default (full) feature preset.
- Native React control build: `npm run build:react`
- Redact build: `npm run build:redact` or `npm run build`
- Isolated browser tests: `npm run test:redact:e2e` (requires Playwright Chromium).
- The experiment branch defaults to Redact; `vite build --mode react` excludes the alias. Never mix React and Redact in one component tree.
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

React Three Fiber is a React renderer using `react-reconciler`, not just a component library. Its internal reconciler may depend on React internals that Redact does not provide. A passing bundle build and DOM smoke test are **not** evidence of working 3D physics. Do not ship a degraded 3D experience merely to save runtime bytes.

Redact deliberately uses synchronous rendering and does not implement all React concurrent and action hooks. Confirm license terms before any production adoption; package registry metadata does not report a conventional license.

Sources:
- https://tanstack.com/redact/latest
- https://github.com/TanStack/redact
- https://r3f.docs.pmnd.rs/getting-started/installation

## Results

## Results — Vercel production builds, 26 October 2026

| Metric | React 19 control (main) | Redact 0.1.4 (experiment) | Change |
| --- | ---: | ---: | ---: |
| Initial JS minified | 388.44 kB | 225.79 kB | -162.65 kB (-41.9%) |
| Initial JS gzip | 131.52 kB | 83.47 kB | **-48.05 kB (-36.5%)** |
| Lazy 3D kitchen minified | 3212.84 kB | 3207.89 kB | -4.95 kB (-0.15%) |
| Lazy 3D kitchen gzip | 1099.10 kB | 1098.40 kB | -0.70 kB (-0.06%) |
| Both JS chunks minified | 3601.28 kB | 3433.68 kB | -167.60 kB (-4.65%) |
| Both JS chunks gzip | 1230.62 kB | 1181.87 kB | **-48.75 kB (-3.96%)** |
| PWA precache | 4179.72 KiB | 4016.05 KiB | -163.67 KiB (-3.92%) |
| Unit tests | 17 passed | 19 passed (2 experiment checks) | Both passed |
| Production Vite build | Passed | Passed | No bundling blocker |

Production control: Vercel deployment dpl_4y2QA7CBJZ7MrDSmdUF2ZBMnidTE, commit dea7d265.
Redact preview: deployment dpl_2t2XrJ9Gex6tDNbEv7KV6Sz1aFoQ, commit 4e3d06c, available to authorized members at https://mise-3ybnlmuei-thembaxxs-projects.vercel.app.

**Limitations:** These are Vite gzip artifacts from comparable branches, not measured HTTP transfers or runtime performance; build durations cannot be compared reliably across CI machines/cache states. The 3D scene accounts for nearly all of the lazy-load cost and hardly shrinks.

### Live browser verification

An external browser attempted to open the Redact preview and was redirected to Vercel SSO. No login or bypass was attempted. **The DOM app, WebGL canvas, React Three Fiber, physics/gestures, timers, touch interactions, PWA offline use and Safari compatibility remain unverified under Redact.** The Playwright cases in e2e/redact.e2e.ts are prepared but not executed. A successful TypeScript/Vite build is not equivalent to a successful 3D render.

### Decision — keep React 19 in production

Redact offers a measured 48.05 kB gzip reduction in the initial JS but a marginal 3.96% overall JavaScript reduction when the 3D kitchen is included. Its custom renderer compatibility remains unverified and its experimental synchronous scheduling must be considered. This does **not** justify migrating Mise now.

The PR is draft and must not be merged without an authorized browser/real-device interaction gate, PWA regression checks, and license review. A robust next optimization is to reduce and progressively load the 3D geometry/physics dependencies rather than swapping the React runtime prematurely.

