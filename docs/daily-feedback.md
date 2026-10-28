# Daily recipe experience review

Diagnostics are **off by default**. App settings → Local diagnostics enables a
log of at most 300 events from the last 24 hours on this device. Export diagnostics downloads JSONL; turning the
setting off erases collected events. No background upload or aggregation exists.
Recipe names, ingredients, instructions, personal recipe IDs, source URLs, DOM,
error messages and stacks are never recorded. Only fixed operation/reason labels,
outcomes, timestamps, a random local session ID and optional duration are allowed.

The browser console exposes the same API on every page:

```js
window.miseDiagnostics.setEnabled(true); // explicit runtime opt-in
window.miseDiagnostics.exportJSONL();    // review/export locally
window.miseDiagnostics.setEnabled(false); // disable and erase
```

Save an exported JSONL file locally, then review it with the same CLI used by CI:

```sh
node scripts/feedback/review.mjs --input /path/to/mise-diagnostics.jsonl --output .feedback/runtime-review.md
```

The collector records text/URL import success/failure, bounded failure reasons,
step and ingredient progress, cooking actions, plating completion, and partial
cooking abandoned on reset, page exit or component removal. Abandonment is an
observed exit after interaction; a browser crash can prevent that event. Duration
is elapsed time, including pauses; completion means the virtual cooking activity
was plated, not proof of real food preparation. WebGL startup/fallback, scene
errors and context loss are captured. Both quick and physics kitchens capture
touch ingredient drops: success, outside-pan failure or pointer cancellation.
Other cooking controls provide accessible alternatives on touch devices.

## Daily synthetic QA

The `Daily recipe experience review` GitHub workflow runs at **06:15 UTC daily**,
can be dispatched manually, and checks changes to feedback files. It reuses the
existing Playwright configuration and production build, including Vitest and
TypeScript. Desktop and touch-mobile journeys paste/import a fixture recipe,
complete cooking, exercise blocked imports, use the no-WebGL fallback, and leave
partway through another session. HTTP failures and missing WebGL are deliberate
fixtures. They demonstrate detection and fallback; they are not production
incidents or evidence of user demand. Actual 3D touch drag placement and real
context-loss failures need opt-in runtime exports or targeted browser QA.

```sh
npm ci
npx playwright install chromium
npm run test:feedback
npm run feedback:capture
npm run feedback:review
```

Every QA event is explicitly labeled `source: synthetic`. The workflow uploads
`.feedback/events.jsonl`, `.feedback/report.md`, aggregate `.feedback/report.json` and available Playwright evidence
for seven days. These files stay ignored locally. The capture command resets
only its generated `.feedback/events.jsonl` file. Keep real exports outside that
path. A failed browser check still triggers review/upload and keeps the job red.
Synthetic and runtime evidence are reported separately; neither is a substitute
for the other. Nothing sends real usage exports to GitHub automatically.

The report supplies metrics and evidence for a human decision, allows **no
change**, and asks for a reproducible case, bounded proposal and focused proof
before any follow-up patch. It never edits code, opens PRs, merges or deploys.
If the repository secret `FEEDBACK_GEMINI_API_KEY` is configured, scheduled or
manual reviews can request advisory proposals from Gemini using sanitized
aggregate evidence. No key is required for deterministic local reports. PR runs
do not receive that secret. Review the report and reproduce a finding before
authorizing a follow-up change; never treat raw recipe imports as model prompts.
