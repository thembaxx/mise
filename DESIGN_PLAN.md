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
