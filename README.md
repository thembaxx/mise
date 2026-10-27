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


## Native-feeling PWA (offline, install, theming)

- Vite PWA and Workbox precache the application shell, recipe data code, deferred 3D kitchen, branded icons and iOS launch artwork. Offline browsing and simulated cooking work after a **successful initial online visit and service worker installation**. Photo availability is best-effort (viewed Unsplash photos may be cached; otherwise a local branded fallback is shown).
- Installed-app shortcuts jump to Discover or Kitchen, with browser install prompts where supported and manual Add to Home Screen instructions for iOS.
- Service worker update prompts are explicit: update only when ready, rather than silently reloading mid-recipe. In settings, check for updates at any time.
- Settings include System, Light and Dark modes (stored on this device), install tips, native share sheet/fallback and connectivity feedback.
- Theme preference is applied before React first paint. Browser theme color, top safe area, document background, dark-mode colors and loading UI match. Generated light/dark launch artwork covers selected iPhone and iPad portrait sizes; other devices use a browser or manifest fallback.
- Browser-managed background work is not guaranteed: no promises of OS push notifications or permanent background execution. Local storage quotas can clear caches and cached photographs.
- The manifest has a single light default background. Explicit dark-theme users may see system-controlled launch UI before the site can apply their preference.

Run unit tests using npm run test. For real offline and theme Playwright tests against a built local preview rather than Vite dev, install Chromium and run npm run test:e2e. The large Three.js chunk is deliberately cached for offline cooking and may make the first install larger.


## Progressive 3D loading (2026-10-26)

The interactive kitchen now has two modes. **Quick 3D** is the default: it retains the stylized kitchen, touch/drag ingredient gestures, camera orbit, heat effects, cooking steps and accessible HTML controls, but does not import or instantiate the Rapier physics engine. It provides immediate 3D interaction on lower-powered devices and slower connections. **Physics on** is an explicit opt-in button within the kitchen header: the existing Rapier-driven kitchen loads lazily, preserving original falling/rigid-body simulation.

The PWA precaches the quick kitchen for offline use, and deliberately excludes the optional KitchenScene JavaScript physics chunk from initial service-worker installation. The optional physics chunk is cached only once requested and successfully downloaded; full physics cannot be guaranteed offline until it has been enabled while online. All recipes and standard cooking controls still work when WebGL is unavailable.

### Bundle measurement and QA

- React 19 control (before this change): initial JS 388.44 kB min / 131.52 kB gzip; full 3D kitchen 3212.84 kB min / 1099.10 kB gzip; Workbox precache 4179.72 KiB.
- Inspect current Vercel build logs for KitchenStudio, KitchenScene, and precache to compare how much code is deferred to the optional physics path.
- npm run test checks both the cooking flow and the progressive 3D boundary. npm run test:e2e includes desktop and touch-mobile flows validating quick mode and opt-in physics.
- Rendering/physics input latency and GPU responsiveness must be confirmed in an actual desktop and mobile browser; build tests cannot establish smooth animation.

This optimization is separate from the unmerged TanStack Redact experiment. Production and this branch both use React 19.

## Next-phase release verification

- Recipe card photo sources: [Shakshuka (Pexels #35672958)](https://www.pexels.com/photo/delicious-shakshuka-with-tomato-and-herbs-35672958/), [Bibimbap (Pexels #5773960)](https://www.pexels.com/photo/egg-on-top-of-a-bibimbap-5773960/), [Ghanaian jollof (Pexels #5333327)](https://www.pexels.com/photo/stainless-steel-fork-beside-a-plate-5333327/), [Arepas (Pexels #29496087)](https://www.pexels.com/photo/traditional-arepas-with-avocado-and-salsa-29496087/). These editorial images depict the dish family rather than the exact recipe plating; Pexels license and attribution details are on the linked source pages. Hero photo loading fails gracefully to Mise's local graphic.
- Clicking **Add ingredients** again updates quantities for the new servings without duplicates while respecting checked-off items.
- A saved countdown resumes **paused** after reload, and is reset only when switching steps or resetting the kitchen; it never starts counting down unattended after a reload.
- `npm run verify:prerender` validates every emitted recipe document, canonical, JSON-LD and sitemap after the Vite build, even when external GitHub Actions runners cannot start. This is a build-level content check, not browser/gesture QA.


## Focused Cook Mode and graphics settings

Open any recipe and select **Start Cook Mode**, or use **Enter Cook Mode** in the kitchen. This optional full-screen view shares the existing recipe progress and timer: it does not start a new cooking session. It offers large previous/next buttons, ingredient check-offs for the *virtual* pan, adjustable heat, chop/pour/stir/plate controls and an on-demand voice reading of the current step. Wake Lock is **off by default**, available only when supported, and released when exiting Cook Mode. Browser speech is also opt-in and cancelled when stepping or leaving.

In the 3D scene, graphics can be switched between **Eco**, **Balanced** and **High**. Eco limits device pixel ratio and disables dynamic shadows, making the kitchen more practical on mobile. Procedural oil-pouring, simmer bubbles and tool audio respond to user actions; sounds default off and need a user gesture. Mise never claims its simulation measures safe cooking temperatures.

Recipe pages now suggest three other dishes, favoring related regional recipes. No profile, analytics, account or automated cloud synchronization is required. Shopping lists and progress remain device-local; authenticated cross-device synchronization is a separate, consent-based backend project.

Playwright: \`npx playwright test e2e/cook-mode.e2e.ts\`. The 3D and offline suites remain necessary release checks. Run them against a freshly built production preview, not just dev mode.

## Smart Cooking Companion (offline-first)

**Real-world preparation:** In a recipe detail page or Cook Mode, tick ingredients when you have them ready. Checkmarks are stored per recipe locally and are intentionally separate from the virtual 3D pan. No account, network service or cloud storage is needed.

**Independent timers:** Cook Mode has up to five additional timers per recipe, created paused. Start, pause, reset and remove them separately. Running timers use absolute wall-clock deadlines, rather than relying on background JavaScript intervals: upon returning to a throttled or reloaded tab, remaining time is recalculated from the deadline. They do not automatically play sounds or request notification permissions; the browser may suspend the page entirely. These are visual reminders, not safety systems. The original single-step timer is preserved.

**Ingredient guidance:** Metric/US preference is local. We convert mass (g/kg) and liquid volumes (ml/l) using defined standard constants and label US fluid ounces explicitly. Counts, spoons and ingredients lacking a known density are kept unchanged. A small set of curated swaps provides caveats; there are no claims that swaps are allergy-safe or universally equivalent.

QA: `npm run test` checks conversion precision, bad storage data, real-prep separation, and background-timer math; `npx playwright test e2e/companion.e2e.ts` exercises desktop/mobile controls and persistence.

## Personal Cookbook (local-first)

Open **My cookbook** from the navigation or visit `/cookbook/`. Create and edit personal recipes, favourite published or personal dishes, and organise either in named collections. Manual recipes use a name, servings, cook time, ingredient lines and method lines; inputs are validated and stored locally. The editor keeps numeric amounts and units explicit rather than guessing ingredient density. New recipes are immediately usable with guided Cook Mode, interactive Quick 3D/full physics (optional), shopping lists, preparation checklists and independent kitchen timers.

**Import recipes:** Paste a recipe formatted with `Ingredients` and `Instructions` headings, Recipe JSON-LD, or HTML containing a valid `Recipe` JSON-LD block. HTTPS website URL import works only when the source provides accessible structured recipe data **and permits cross-origin browser requests**; websites with restrictive CORS/redirects require manual paste. There is no server scraping proxy, automatic sign-in, or third-party recipe extraction service. Check each imported ingredient, allergy warning, quantity and time before cooking.

**PWA share target:** Compatible installed browsers can offer **Mise** in the operating system's share menu for text or URLs. This opens the import editor for review — URLs are never fetched until the user explicitly taps Import. Offline recipe editing and viewing use cached application files and local browser storage. Cooking timers can recover visual remaining time after backgrounding but **do not provide guaranteed alarms or food-safety notifications**.

**Privacy/limitations:** Cookbook data and favourite IDs stay on this device only. Clearing site data or uninstalling may delete recipes and collections; export/cloud sync is **not** available. Personal recipe URLs require the same browser's locally saved data, are not publicly shareable and have `noindex` protections. Editing recipe ingredients or steps clears obsolete cooking progress, timers and related shopping entries; deleting a recipe removes its associated state. The built-in public recipe pages remain prerendered and indexable, while the cookbook itself is intentionally noindexed. The Redact runtime migration is an isolated, unmerged experiment; production and this milestone use React 19.

**Test locally:** `npm run build` executes Vitest, TypeScript, production build, PWA and private/public prerender verification. `npx playwright install chromium && npm run test:e2e` runs desktop Chromium and emulated touch-mobile flows including cookbook creation/edit, collection persistence, import, Cook Mode integration and offline reload. Browser-based verification requires actually running these suites; GitHub Actions runner failures before test steps are infrastructure issues, not successful browser tests. Physical Safari/iOS and Android remain device QA follow-ups.


## Mise 2.1 — portable, private cookbook backups

In **My cookbook → Backup & restore**, download a readable, versioned JSON file containing personal recipes, their collections and favourite IDs. No recipe data is uploaded or sent to a third-party backup service.

To restore, select a Mise backup (up to **1 MB**) and choose **Merge** (keep existing recipes and combine collections) or **Replace** (remove recipes, collections and favourites not in the file). The preview shows imports, identical recipes skipped, ID collisions resolved, collections and removals. Confirming is a separate step. Restore validates version, recipe structure, quantities, step lengths, unique identifiers, references and size; malformed files cause no changes. It attempts a rollback if browser storage rejects a write.

The backup intentionally excludes kitchen progress, shopping lists, cooking timers, passwords and unrelated browser storage. Treat downloaded recipe files as private: anyone holding the file can read its contents. Backup restore is per-device and never a cloud sync. A replace operation can discard existing local recipes; preserve a second backup before replacing.

### Recipe URL importing

The browser first tries public Recipe JSON-LD directly; many publishers disallow cross-origin requests. For selected publishers, Mise additionally offers a user-initiated **protected HTTPS import endpoint** at /api/import-recipe. It only accepts reviewed hosts: www.budgetbytes.com, www.recipetineats.com, www.bbcgoodfood.com, www.allrecipes.com and www.seriouseats.com. Other sites use Paste recipe/manual editing. Successful imports remain editable previews until explicitly saved.

Server-side import uses exact HTTPS hostname matching, no embedded credentials or custom ports, pinned validated public IPv4 DNS resolution (SSRF/rebinding protection), no redirects, TLS verification, a **350 KB document limit**, a **seven-second timeout**, no cookies and no storage of recipe content. Per-instance abuse limiting is three imports per client per five minutes and 25 total per instance per five minutes. **In-memory limits are not a distributed global rate limit**: configure a project-scoped Vercel WAF rule or shared limiter before broad public launch. Only public Recipe JSON-LD can be parsed; compatibility depends on publishers' access policies. Respect publishers' policies and rights.

### QA and release

The build executes brand generation, Vitest, TypeScript, Vite, PWA and prerender verification. Playwright runs desktop Chromium and touch-mobile Chromium with cookbook backup, restore, import fallback and established 3D/Cook Mode/Smart Companion flows. The GitHub Actions runner has previously failed before running any steps. **A READY Vercel deployment is not a substitute for passing browser QA.** The isolated TanStack Redact experiment remains unmerged.
