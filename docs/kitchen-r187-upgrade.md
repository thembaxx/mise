# Mise kitchen fidelity — Three.js r187

## Goal
Treat the interactive kitchen as a premium cooking environment, not a low-poly illustrative prop. Size is not the primary constraint, but browser responsiveness and existing cooking functionality must not regress.

## What changed
- Shared \`KitchenDetails\` scene dressing is rendered in both quick Three.js and optional Rapier physics scenes.
- Locally generated color textures for oak and marble, physically based metals, ceramic tiles, cabinetry, sink/faucet, cooking hood, saucepan detailing, additional stove elements and jars.
- New standalone `KitchenCookware` renderer replaces both low-poly, solid-cylinder pan replicas with a lathe-modeled concave skillet: layered PBR nonstick cooking surface, brushed-metal shell, rivets, ergonomic handle, and a movable glass lid with accurate low dome geometry and heat-dependent condensation.
- Pan lid can be covered/lifted in the 3D environment or via an accessible 44px+ HTML action, with reduced-motion-safe interpolation; the lid sits away from the pan by default so ingredients remain visible.
- Preserves existing pan physics collider, stove heat, steam, simmer cues, and recipe progress; no PWA or gameplay state migrations.
- Reflection lightformers inside a local environment capture make metal, ceramic and lacquer respond to light without CDN HDR assets.
- Replaced the small ingredient primitives with shared, materially textured higher-detail produce meshes for tomato, citrus, carrot, mushroom, onion, chili, garlic, eggplant and herbs, reused in the Quick and Physics renderers.
- Added a clickable faucet with a real visible water stream and ripple effect, coupled to a keyboard/touch-safe HTML button.
- Corrected the cabinet face overlap and modeled the drawer with visible wood lining and cutlery.
- Interactive burner dial updates the actual heat slider; working drawer can be tapped in 3D **or** opened through a labelled HTML button.
- Reduced-motion friendly drawer easing, retained accessible ingredient buttons, mobile touch targets, quality presets and WebGL fallback.
- High preset uses 2x capped DPR, up to 2048 shadow maps, 1024-square material maps and 512-resolution generated reflection environment; Balanced/Eco remain manually available.
- All form text inputs/selects/textarea default to at least 16px to avoid tiny interactive type and mobile Safari input focus zoom.
- The project already targets Three.js 0.187.0 (r187, released 2026-10-30); no dependency update necessary.

- Shared `KitchenCameraRig` adds touch-friendly Full kitchen / Focus pan / Prep station camera views, smooth interruptible movement, and an immediate reduced-motion alternative, without altering gesture dragging or Rapier physics.

## Constraints and checks
- Texture maps are deterministic and local, without external downloads or asset licenses.
- This is a higher-quality **procedural** kitchen, not a Blender-authored high-poly asset or a claim of photorealistic scanned geometry.
- Test paths: \`npm run typecheck\`, \`npm test\`, \`npm run build\`, \`npm run test:e2e -- e2e/kitchen-fidelity.e2e.ts e2e/progressive-3d.e2e.ts e2e/responsive-layout.e2e.ts\`, desktop WebGL and mobile Safari/manual visual inspection.
- The PR source-based tests now also guard against reinstating a second duplicate solid pan, and verify that the shared lid state is wired to both renderers.
- Avoid merging or deploying until real WebGL screenshots confirm material quality, no geometric overlaps, correct tap targeting, frame rate and safe disposal across scene remounts.
- No source pipeline for heavy external GLBs was changed, and the experimental TanStack Redact branch remains isolated.

## Follow-on art production
For genuinely cinematic realism, replace the primary cookware and ingredients with human-reviewed, license-verified, high-resolution Blender meshes, PBR material sets, animation rigs and baked light maps. Keep the current offline geometry as a fallback. This requires viewing and testing actual rendered results, not only source-level tests.
