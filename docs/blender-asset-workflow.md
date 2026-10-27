# Blender-to-web 3D production gate (mise)

Source: [arjun988/blender-skills](https://github.com/arjun988/blender-skills) (MIT; install in a **local agent authoring environment**, not the production web bundle). This pack requires a local Blender application and BlenderMCP connection; it does not create assets by merely installing prompt instructions in this repository.

## Project-specific brief

Produce stylistically consistent, compact kitchen props, ingredients and plated dishes. Keep Rapier colliders, ingredient IDs, recipe state, drag/drop, low-power procedural fallback, PWA and accessible ingredient controls intact. Animated chopping/pouring may only represent illustrative interaction, not food safety or thermodynamics.

Recommended authoring chain: **blender-director → prop-artist → stylized-style → materials → animation → asset-optimization → export-pipeline → qa-review**.

## Author, export, verify

1. Clone the Blender Skills pack locally, install its skills into your chosen coding agent, and follow its [Blender MCP setup](https://github.com/arjun988/blender-skills/blob/main/docs/BLENDER_MCP_SETUP.md). Never commit machine-specific MCP ports, paths or secrets.
2. Author or edit a **separately reviewed** source .blend file. Keep licensing, material ownership and reference images in the asset review. Do not fetch external models or paid API generations automatically.
3. Export with `blender -b source.blend --python scripts/export-blender-glb.py -- public/models/candidate.glb` and run `npm run assets:check` (or `pnpm assets:check` where applicable). The pack and Blender are authoring-time only, **not runtime dependencies**.
4. Gate every candidate on appearance compared to the existing visual design, license/provenance, animations, physically consistent dimensions, real-device input, reduced motion, fallback, offline caching and mobile GPU memory. The validator enforces embedded resources, GLB v2, a max 8 MiB individual file budget and <=160,000 exported vertex positions; it is not a substitute for visual QA or browser tests.
5. Only after previewing actual built scenes on mobile/desktop, integrate an approved GLB behind existing progressive-loading and fallback boundaries. No unreviewed asset is automatically enabled.

**Current limitation:** This change introduces authoring/export and automated file-quality gates. It does not claim to have run Blender or to ship new 3D models; production visual changes must be independently reviewed and verified before integration.
