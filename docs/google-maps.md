# Google Maps provider: evaluation

This note records how Google Maps support was scoped (Phase 7), and why.

## What Google offers

| API                                        | Key required                | Billing account    | Interactive JS control | Fit for this library                    |
| ------------------------------------------ | --------------------------- | ------------------ | ---------------------- | --------------------------------------- |
| Maps Embed API (iframe)                    | Yes                         | Yes                | No (iframe)            | ✅ Implemented as `GoogleMapEmbed`      |
| Maps JavaScript API                        | Yes                         | Yes (usage-billed) | Yes                    | Possible future adapter; heavier, paid  |
| Static Maps API                            | Yes (+ signing recommended) | Yes                | No (image)             | Not needed for an interactive embed     |
| "Share → Embed a map" iframe on google.com | No                          | —                  | No                     | ❌ Manual feature, not a documented API |

There is **no supported way to embed Google Maps programmatically without an API key**. The keyless `https://maps.google.com/maps?q=...&output=embed` URLs found online are undocumented, so they can change or break at any time, and using them programmatically is outside the Maps Platform terms. This library does not use them.

## Why a hosted proxy is not provided

A "keyless" Google option would mean running a server that holds a key and serves Google maps to anyone. That would:

1. **Not hide the key.** The Embed API and the Maps JavaScript API both run in the browser, and the key is part of the request the browser makes. Moving the iframe behind your domain doesn't change that.
2. **Bypass Google's per-customer key model.** Every visitor of every site using the library would consume one maintainer's quota and billing. That is the "proxy to avoid API keys" pattern the spec rules out, and it conflicts with the Maps Platform terms.
3. **Create an abuse target** that needs authentication, origin checks, rate limiting and monitoring. That operational burden is out of proportion for a free library.

The keyless Leaflet provider already covers the "no key" use case, so the optional hosted viewer described in the project brief was **not built**. If a hosted viewer becomes necessary later, it should serve the Leaflet/OSM map, validate `lat`/`lng`/`zoom`, set `Content-Security-Policy: frame-ancestors` for allowed origins, rate-limit per IP, and follow the OSMF tile policy (which effectively requires your own tile source at any meaningful volume).

## What `GoogleMapEmbed` does

- Builds an Embed API URL with `URLSearchParams` (no string concatenation of user input):
  - address `location` → `place` mode, `q=<address>` (Google geocodes it and shows a marker)
  - coordinates + `showMarker` → `place` mode, `q=<lat,lng>&center=<lat,lng>`
  - coordinates without a marker → `view` mode, `center=<lat,lng>`
  - `zoom` clamped to 0–21 and rounded
- Refuses to render without a key (`MISSING_API_KEY`) and validates coordinates.
- Renders a lazy iframe with a `title`, `allowfullscreen` and `referrerpolicy="no-referrer-when-downgrade"`, so HTTP-referrer key restrictions work.
- Uses no hooks, so it can render as a Server Component.

## Maintainer checklist for users enabling Google

1. Create a Google Cloud project and attach a billing account.
2. Enable **Maps Embed API**.
3. Create an API key. Restrict it to **HTTP referrers** (`https://yourdomain.com/*`) and to the **Maps Embed API**.
4. Expose the key to the page, e.g. `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`. Remember it is public.
5. Review the [Maps Platform Terms](https://cloud.google.com/maps-platform/terms) and [Embed API usage and billing](https://developers.google.com/maps/documentation/embed/usage-and-billing).
