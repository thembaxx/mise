# Mise 3D visual milestone — plated-dish reveal

Added a low-polygon herb garnish and sesame detail to the existing physics and lite kitchen scenes through the shared `KitchenEffects` component. When the recipe reaches `plated`, the ceramic dish reveals once with a subtle scale-up. `prefers-reduced-motion` renders it at its final size without motion.

**Source:** original geometry in React Three Fiber (sphere/torus primitives), not Blender, Meshy, or Tripo output. No external licences or generation credits are involved. No new runtime dependencies, physics colliders, cookbook state, ingredient identifiers or accessible HTML cooking controls changed.

**QA:** check both lite and physics cooking modes, plate completion, reduced motion, mobile GPU tier and off-line fallback. Existing Playwright and unit suites remain canonical. GitHub Actions account limits may prevent CI from starting; record that as unverified rather than calling the tests passed.

**Later Blender path:** use `scripts/export-blender-glb.py` and `npm run assets:check` for optional human-reviewed meshes; keep procedural fallback and do not silently load unknown GLBs.
