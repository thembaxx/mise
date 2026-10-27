# Original 3D vignette — mise

- Model: `public/models/original/mise-plated-dish.glb`
- Source: deterministic, original procedural mesh created in ChatGPT, **not made or rendered with Blender**. No external artists or third-party model licences.
- Rights: original project asset, reusable in this repository; no paid API calls, cloud accounts, or keys.
- Model is an illustrative, unrigged GLB 2.0 with embedded mesh buffers and per-vertex PBR colours. It is **not** a scan, detailed production model, or screenshot of the running app.
- Integration: the existing procedural scene remains visible while the optional GLB loads; network errors fall back to original geometry. Existing 2D image, PWA, reduced-motion and interactive controls are preserved.
- Verification: repository `assets:check` inspects glTF integrity, 8 MiB per-file budget and embedded resources. Manual browser and GPU visual verification still required after merge. GitHub Actions capacity failures are expected and are not evidence of passing checks.

For Blender-native production, edit/reexport from a real Blender installation via the repository's `scripts/export-blender-glb.py`. Do not label this procedural model a Blender render.
