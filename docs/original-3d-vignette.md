# Original 3D vignette — mise

- Model: `public/models/original/mise-plated-dish.glb`
- Source: deterministic, original procedural mesh created in ChatGPT, **not made or rendered with Blender**. No external artists or third-party model licences.
- Rights: original project asset, reusable in this repository; no paid API calls, cloud accounts, or keys.
- Model is an illustrative, unrigged GLB 2.0 with embedded mesh buffers and per-vertex PBR colours. It is **not** a scan, detailed production model, or screenshot of the running app.
- Integration: the existing procedural scene remains visible while the optional GLB loads; network errors fall back to original geometry. Existing 2D image, PWA, reduced-motion and interactive controls are preserved.
- Verification: repository `assets:check` inspects glTF integrity, 8 MiB per-file budget and embedded resources. Manual browser and GPU visual verification still required after merge. GitHub Actions capacity failures are expected and are not evidence of passing checks.

For Blender-native production, edit/reexport from a real Blender installation via the repository's `scripts/export-blender-glb.py`. Do not label this procedural model a Blender render.

## Inspect and export on a phone

Open **`/3d-preview.html`** on the deployed site's origin to view the committed GLB interactively in a mobile browser. Swipe to orbit, use the view controls, or tap **Save PNG** for a transparent browser render. This static WebGL2 page has no CDN or paid-service dependency. On devices without WebGL2, it reports that the main application keeps its original fallback. These previews are **not Blender renders**.

Do not confuse the separately downloadable *procedural candidate review pack* with this repository's committed GLB: the phone preview loads the actual file under `public/models/original/`. Browser touch, PNG saving, iOS downloads and production deployment need device-side verification; GitHub Actions quota failures do not certify them.

## Animated plated-dish v2
The new additive `public/models/original/mise-plated-dish-animated.glb` (111,648 bytes) includes a named **Garnish breathing** keyframe clip for a slow, subtle finishing touch when a virtual dish is plated. It was generated programmatically from original shapes and material colours, **not made or rendered with Blender**.
The original `mise-plated-dish.glb` is retained as the first network-error fallback; the built-in procedural dish remains the final fallback. The GLB does not represent the user's exact selected recipe or real food.
The clip stops for reduced motion; the plate reveal stays a one-time flourish. The animated GLB is included in the PWA precache, so installed apps can load it offline. The `/3d-preview.html` route previews the animated asset.
Run `npm run assets:check`, `npm test`, `npm run typecheck` and browser tests when runners are available. Physical-device QA and deployment confirmation remain pending.
