# Mise — The world, on your table

A cinematic, touch-friendly food discovery app with a hands-on, real-time 3D kitchen.

## What you can do

- Explore eight globally inspired, fully written recipes from Japan, Italy, South Africa, India, Mexico, Morocco, Thailand and Greece.
- Search by dish, country or ingredient theme; filter by region; save favorites in browser storage.
- Open a recipe in the kitchen, change serving quantities, follow six detailed steps and cook at your own pace.
- Drag and drop 3D ingredients into a pan using mouse, touch or trackpad; rotate and zoom the kitchen; use the accessible ingredient checklist as an alternative.
- Change burner heat and see a real-time GLSL glow, plus use a countdown timer and live local clock.
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

## Future enhancements

Licensed optimized GLB kitchen props, mesh-based slicing, ingredient-specific cooking states, multilingual recipe catalog, pantry matching, collaborative sessions, accessibility audit and end-to-end interaction tests.
