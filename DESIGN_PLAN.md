# Mise — Design & interaction brief

## MotionDesign preflight
Deterministic selection based on the four-letter product name, Mise (seed 4):
- Hero architecture: **editorial split** with broad H1 (max-width: 800px; 2–3 lines at desktop).
- Typography: **Outfit** with italic Playfair Display accents.
- Component architectures: **horizontal cuisine selector**, **kinetic editorial image card**, **dense asymmetric feature bento**.
- Motion paradigms: **GSAP scroll-pinned discovery introduction** and **scroll-scrubbed recipe card entrances**.
- AIDA: floating navigation → cinematic hero → recipe discovery → interactive 3D kitchen → footer CTA.
- Bento density: 12-column grid; a 7-column feature and 5-column feature occupy row one (7 + 5 = 12); three 4-column features occupy row two (4 + 4 + 4 = 12); grid-auto-flow: dense.
- Button contrast: dark ink on cream or cream on dark ink. No decorative stamps, placeholder labels, or unlabelled icon controls.

## Experience
Warm editorial food photography, near-black typography, pistachio accents, sculptural 3D kitchen with tactile interactions, physics-enabled draggable ingredients, a live clock, heat dial, and a persistent recipe step timer.

## Scope & provenance
Starter collection of eight globally inspired, original recipes. 3D ingredients and kitchen are built from procedural primitives and shaders in source; no third-party GLB licensing assumptions, paid generation, or NVIDIA SimReady assets bundled. Photographic images are remotely hosted Unsplash images and require network access. Recipe quantities and times are editorial estimates, not dietary or professional food-safety certification.

## UX quality
Touch and pointer gestures, OrbitControls, reduced-motion support, keyboard-accessible alternatives to ingredient dragging, responsive layout, localStorage favorites, explicit cooking steps, loading fallback for 3D, and no user data collection.

## Tactile kitchen update

Chopping knife, pouring cruet and stirring spoon now respond to direct WebGL taps with short kinetic motion. The same functions are accessible as large HTML controls. An action-specific audiovisual response, steam, plating feedback, a six-stage non-food-safety cooking game loop and completion message help bridge discovery and kitchen. Avoids external paid models or large licensed textures. Performance safeguards include existing intersection-based code splitting, shadow/DPR limits and reduced-motion CSS.

## Motion refinement (October 2026)

Guidance: MotionDesign's GSAP composition and frontend engineering workflows, and
[Emil Kowalski's design engineering skills](https://emilkowal.ski/skill)
(`emilkowalski/skill` at `2d228630ba1446365f614a108cb8252f1feda202`).
This is a motion pass on the existing editorial design, rather than a new layout.

| Before | After | Why |
| --- | --- | --- |
| Hero takes up to 1.6 seconds; deep links animate unseen content | 650–800ms editorial entrance with 55ms stagger; skip for view links | A small welcome, without slowing access to the kitchen |
| Recipe cards scrub from 35% opacity; filters leave stale triggers | 240ms once-per-result-set reveals with explicit cleanup | Dishes remain legible when scrolling stops and after filtering |
| Whole feature cards move and fade during scroll | Desktop image-only scale scrub from 1.08 to 1 | Retain visual depth while keeping copy stationary |
| Discovery panel pins regardless of height | Pin only when the panel fits and results extend beyond it | Keep every filter reachable; refresh after layout changes |
| UI transitions vary up to 450ms; progress animates width | 100ms press, 160–240ms UI transitions; scaleX progress | Prompt feedback without repeated layout work |
| Navigation/settings disappear immediately | Interruptible entry/exit using retained hidden, inert DOM and CSS discrete transitions | Spatial continuity with immediate focus and accessibility cleanup |
| Touch can retain hover transforms | Hover movement limited to fine hover pointers | Avoid sticky image zoom and lifted controls on touch |
| Reduced motion sampled at mount; particles continue moving | Live GSAP, CSS and WebGL preference handling | Stop decorative movement without reloading or losing cooking state |
| Decorative movement loops indefinitely | Finite four-second marquee drift and five-second tomato float | Decorative motion settles without requiring a pause control |
| Keyboard actions inherit movement | Input modality skips result animation, CSS transitions and smooth scrolling | Keyboard navigation and cooking steps respond immediately |

The existing Outfit/Playfair typography, two-line hero and dense grids are
preserved. GSAP owns the editorial photo transform; CSS hover does not compete
for that transform. Scopes, media-query contexts, resize observers, frame requests
and deferred reveal tweens are cleaned up. No new animation dependency is added.

`@starting-style` and discrete display transitions progressively enhance navigation,
settings, Cook Mode and notices. Browsers without support still show and hide
content normally. Only navigation and settings retain DOM for an exit transition;
Cook Mode exits immediately so timers, wake lock and focus cleanup are not delayed.
The physics simulation remains explicitly opt-in and user-controlled.

Validation includes the production build, existing browser journeys, and
`e2e/motion.e2e.ts` for refiltering, live reduced-motion changes, rapid settings
reopening, focus restoration, keyboard steps, progress and touch hover behavior.
Physical iOS/Safari and Android testing remains device QA; Chromium touch emulation
is not a claim of physical-device testing.
