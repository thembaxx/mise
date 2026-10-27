# Mise 2.1 — recipe import and portability security

## Browser-first recipe import
Mise is an offline-capable static Vite/React 19 app. Import runs on the user's device. It sends no private recipe data to third-party AI or account services.

- HTTPS only. Embedded URL credentials, loopback and private IPv4 literals, and IPv6 literals are rejected.
- Fetch uses omitted credentials, disallows redirects and times out after eight seconds.
- HTML/JSON-LD/JSON only, with a 500 KB bound on declared or streaming responses.
- Recipe JSON-LD supports graph nodes, nested HowToSection instructions and reordered HTML script attributes. Untrusted HTML is never mounted in the DOM.
- Every imported recipe is editable and requires a user save action. Manual paste is available when site CORS or scraping restrictions block browser import.
- Users must review ingredient measurements, allergens, time, copyright and cooking safety.

## Why public server-side importing is not enabled
The project has no confirmed active Vercel WAF rate-limiting configuration. An unauthenticated server-side arbitrary-URL fetch endpoint is unjustified without global cross-instance rate limits, verifiable cost caps and complete SSRF protections. Memory-only counters in distributed serverless functions are insufficient.

The production app therefore does not deploy a public extraction proxy. Before enabling a server importer, require ALL of the following: an exact curated HTTPS hostname allowlist; socket-time DNS/IP validation (including IPv6 and DNS rebinding); zero redirects and port 443 only; global WAF limits of at most three requests per client IP per minute and a global cost budget; a fail-closed feature flag; bounded 500 KB stream and eight-second timeout; safe HTML/JSON MIME types; no credentials, cookies or arbitrary external image fetching; no storage of user recipe text in logs; content validation and manual review; integration tests for 429s, DNS rebinding, malformed inputs and blocked destinations.

Vercel rate-limiting documentation: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting

## Portable personal cookbook
Export creates a versioned JSON document (format: mise-personal-cookbook; version: 1). It contains validated personal recipes, collections and valid favourites. It excludes cooking progress, timers, shopping lists, passwords and authentication tokens. Files are not encrypted, so keep private family notes and source URLs in a secure location.

Restore reads the file locally, checks size and schema, and displays a duplicate-aware preview before user confirmation. Merge keeps existing recipes; replace overwrites recipes/collections/favourites only after an explicit acknowledgement. A size limit of 950 KB applies; limits of 80 recipes, 30 collections and 200 favourites are enforced. Stale cooking progress and shopping entries for removed or changed personal recipes are invalidated. The three cookbook storage writes are attempted together, with best-effort rollback and a visible error on failure. A preview is invalidated when storage changes between review and confirmation.

No account or cloud sync is required or promised. Users should export before clearing site data or moving devices.
