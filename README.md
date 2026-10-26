# Mise — The world, on your table

A cinematic, touch-friendly food discovery app with a hands-on, real-time 3D kitchen.

## What you can do

- Explore eight globally inspired, fully written recipes from Japan, Italy, South Africa, India, Mexico, Morocco, Thailand and Greece.
- Search by dish, country or ingredient theme; filter by region; save favorites in browser storage.
- Open a recipe in the kitchen, change serving quantities, follow six detailed steps and cook at your own pace.
- Drag and drop 3D ingredients into a pan using mouse, touch or trackpad; rotate and zoom the kitchen; use the accessible ingredient checklist as an alternative.
- Change burner heat and see a real-time GLSL glow, steam particles and heat-driven lighting, plus use an accurate countdown timer and local clock.
- Tap the procedural knife, pouring bottle and stirring spoon to animate ingredients, or operate the matching accessible controls in the recipe panel.
- Finish an optional six-part cooking challenge, prepare a plated virtual dish, and opt in to synthesized sound/haptic feedback.
- Respect low-power devices with deferred 3D loading, WebGL fallback and capped rendering resolution.
- Enjoy GSAP-powered entrance, scroll and card animations with reduced-motion support.

## Stack

Vite, React 19, TypeScript, Three.js, React Three Fiber, Drei, Rapier 3D physics, GSAP ScrollTrigger and handcrafted CSS.

## Run locally

    npm install
    npm run dev

For a production build:

    npm run build
    npm run preview

The app is static and requires no database, API keys or authentication. Deploy the root directory to Vercel as a Vite project; build command is npm run build and output directory is dist.

## Structure

- src/data/recipes.ts — typed, editable recipe catalog.
- src/App.tsx — discovery, saved recipes, editorial layout and scroll animation.
- src/components/KitchenStudio.tsx — guided cooking, ingredient state, heat and timers.
- src/components/KitchenScene.tsx — procedural kitchen geometry, shader and Rapier physics.
- src/styles.css — responsive visual system and reduced-motion support.
- DESIGN_PLAN.md — visual direction and interaction decisions.

## Asset notes and scope

All 3D geometry is created procedurally in source; no third-party models are copied into the repository. Recipe photography is loaded from Unsplash image URLs at runtime and requires internet access. The app does not download or redistribute the NVIDIA SimReady dataset or assets from Sketchfab, Quaternius, Poly Haven, Tripo or other marketplaces. Their usage and licensing can be evaluated for a later photorealistic model pass.

This is a playable cooking experience, not a physical cooking simulator: food preparation steps are guidance, the 3D ingredients are illustrative, and the stove's heat is visual rather than a thermodynamic simulation. Cook real food using appropriate food-safety practices, including checking poultry temperature with a thermometer.

Recipes are editorial adaptations inspired by regional cuisines, not claims of definitive authenticity. Cooking times and quantities are approximate. Favorites persist only in the current browser.

## Current cooking simulation limitations

The chopping/slicing and pouring interactions animate illustrative geometry rather than modifying the exact chemistry or volume of every ingredient. Steam and heat are shader/particle effects, not food safety indicators. Spoken voice control, advanced procedural mesh cutting, real ingredient thermodynamics and full browser automation are future milestones.

## Testing

The Vercel build runs Vitest and TypeScript checks before production bundling. The interactive flows are also operable from ordinary HTML buttons when WebGL is unavailable. Run npm test locally to verify the rules for cooking progression and recipes.

## Future enhancements

Licensed optimized GLB kitchen props, mesh-based slicing, ingredient-specific cooking states, multilingual recipe catalog, pantry matching, collaborative sessions, accessibility audit and end-to-end interaction tests.

## Browser interaction tests

The source includes Playwright desktop (1440 × 900) and touch-mobile (390 × 844) journeys covering recipe search, saved recipes, non-WebGL fallback, chopping, pouring, stirring and plating. These browser tests are opt-in and are not part of the Vercel production build, so deployment does not require installing Chromium.

Run locally:

    npm install
    npx playwright install chromium
    npm run test:e2e

Preview deployment protection requires a Vercel account or authorized share link for browser QA. Do not mistake a passing production build for verified on-device gestures.

## Brand identity and discoverability

**Mise — The world, on your table.** The primary logo combines a tomato-orange rounded-square icon, a cream folded-ribbon M, a green leaf, and an editorial Playfair Display wordmark. Brand tokens: charcoal `#111111`, cream `#F7EED7`, pistachio `#A7E063`, tomato `#FF5A3C`, saffron `#FFC629`.

Sources: `public/brand/mise-mark.svg`, `public/brand/mise-maskable.svg`, and `public/brand/mise-social.svg`. All are original editable SVG assets. `npm run brand:assets` rasterizes them with Sharp to create favicon, Apple touch icon, 192/512 PWA icons, maskable icon and 1200×630 Open Graph image. Generated PNGs are intentionally not committed; the production build generates them before Vite copies public assets.

Homepage SEO includes canonical URL, Open Graph and Twitter/X social metadata, large preview PNG, WebSite and WebApplication JSON-LD, robots.txt, sitemap.xml and llms.txt. The sitemap lists the homepage only because the app is currently a client-side single-page experience with no individual crawlable recipe URLs. Recipe-specific indexing requires dedicated canonical recipe routes in a later phase.

Production origin: https://mise-two-teal.vercel.app/ . If a custom domain replaces it, update the canonical, sitemap, social and JSON-LD origin together. Trademark availability for the name is not verified.
