# react-map-embed

Interactive maps for React and Next.js **without a Google Maps API key**.

`react-map-embed` renders maps with [Leaflet](https://leafletjs.com) and OpenStreetMap tiles by default. A Google Maps provider is available as a separate, optional entry point for teams that already have a Maps Embed API key.

```tsx
import { MapEmbed } from "react-map-embed";
import "react-map-embed/styles.css";

export default function ContactPage() {
  return <MapEmbed center={{ lat: 23.8103, lng: 90.4125 }} zoom={13} height={400} />;
}
```

## Features

- **Keyless by default.** Leaflet with OpenStreetMap tiles; no account, no key.
- **TypeScript-first.** Strict types for every prop, result and error code.
- **Next.js App Router ready.** SSR-safe (Leaflet loads only in the browser), no hydration mismatches, `"use client"` already applied.
- **Lazy.** Leaflet is loaded when the map scrolls near the viewport.
- **No layout shift.** The loading placeholder and error state occupy the final size.
- **Responsive.** Numeric or any CSS size; the map re-measures itself when its container resizes.
- **Accessible.** Labelled region, keyboard pan/zoom, named marker, `role="status"`/`role="alert"` for loading and error states, and scroll-wheel zoom only while the map has focus so it does not hijack page scrolling.
- **Honest geocoding.** Addresses are only resolved through a geocoder that you explicitly configure. A built-in Nominatim adapter respects the 1 req/s policy and caches results.
- **Small.** One runtime dependency (`leaflet`). ESM and CommonJS builds, tree-shakeable.

## Installation

```bash
npm install react-map-embed
# or: pnpm add react-map-embed / yarn add react-map-embed
```

Peer dependencies: `react` and `react-dom` 18 or newer.

Import the stylesheet **once** (in your root layout, `main.tsx`, or `_app.tsx`). It contains Leaflet's CSS plus the small amount of CSS this library adds:

```ts
import "react-map-embed/styles.css";
```

Without it the tiles render as scattered images; the component logs a console warning if it detects the styles are missing.

## Quick start

### Coordinates (no network calls beyond tiles)

```tsx
<MapEmbed center={{ lat: 23.8103, lng: 90.4125 }} zoom={13} height="400px" showMarker interactive />
```

`location` also accepts coordinates, as an object, a `[lat, lng]` tuple or a `"lat, lng"` string:

```tsx
<MapEmbed location="23.8103, 90.4125" />
<MapEmbed location={[23.8103, 90.4125]} />
```

### Addresses (requires a geocoder)

Map tiles cannot convert an address into coordinates; a **geocoding service** has to. Pass one explicitly:

```tsx
import { MapEmbed, createNominatimGeocoder } from "react-map-embed";

// Create once, at module scope, so the cache and rate limit are shared.
const geocoder = createNominatimGeocoder({ email: "you@example.com" });

<MapEmbed location="Dhaka, Bangladesh" geocoder={geocoder} zoom={12} height={400} />;
```

Without a `geocoder`, an address shows a clear `GEOCODER_REQUIRED` error state instead of an incorrect map. See [Geocoding](#geocoding) for limits and alternatives.

## API reference

### `<MapEmbed />`

| Prop               | Type                                                   | Default                   | Description                                                                                                                   |
| ------------------ | ------------------------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `center`           | `LatLng`                                               | —                         | Map center. Takes precedence over `location`.                                                                                 |
| `location`         | `string \| LatLng \| [lat, lng]`                       | —                         | Coordinates, a `"lat, lng"` string, or an address (requires `geocoder`).                                                      |
| `zoom`             | `number`                                               | `13`                      | Initial zoom. Clamped to the tile provider's range (OSM: 0–19), with a console warning.                                       |
| `height`           | `number \| string`                                     | `400`                     | Pixels when numeric, otherwise any CSS length (`"50vh"`, `"100%"`, …).                                                        |
| `width`            | `number \| string`                                     | `"100%"`                  | As `height`.                                                                                                                  |
| `className`        | `string`                                               | —                         | Added to the root element (which always has `rme-root`).                                                                      |
| `style`            | `CSSProperties`                                        | —                         | Merged into the root element's style. `width`/`height` props win over `style.width`/`style.height`.                           |
| `showMarker`       | `boolean`                                              | `true`                    | Show a marker at the resolved location.                                                                                       |
| `interactive`      | `boolean`                                              | `true`                    | Enable drag, zoom, keyboard and controls. `false` renders a static map.                                                       |
| `title`            | `string`                                               | `"Map"`                   | Accessible name of the map region.                                                                                            |
| `loading`          | `ReactNode`                                            | `"Loading map…"`          | Placeholder shown while geocoding / loading Leaflet.                                                                          |
| `errorFallback`    | `ReactNode \| (error: MapEmbedErrorInfo) => ReactNode` | error message             | Rendered instead of the map when it cannot be displayed.                                                                      |
| `onError`          | `(error: MapEmbedErrorInfo) => void`                   | —                         | Called once per distinct error.                                                                                               |
| `onLocationChange` | `(location: ResolvedLocation) => void`                 | —                         | Called after the initial resolution, when `center`/`location` resolve to a new point, and when a draggable marker is dropped. |
| `geocoder`         | `Geocoder`                                             | —                         | Resolves address strings. Never used for coordinates.                                                                         |
| `tileProvider`     | `TileProvider`                                         | `openStreetMapTiles`      | Raster tile source (`url`, `attribution`, `minZoom`, `maxZoom`, `subdomains`).                                                |
| `lazy`             | `boolean`                                              | `true`                    | Load Leaflet only when the map is within 200px of the viewport.                                                               |
| `draggableMarker`  | `boolean`                                              | `false`                   | Let users drag the marker to choose a point (needs `interactive`).                                                            |
| `markerLabel`      | `string`                                               | geocoder label or `title` | Marker tooltip and accessible name.                                                                                           |

### Types

```ts
interface LatLng {
  lat: number;
  lng: number;
}

interface ResolvedLocation extends LatLng {
  source: "center" | "coordinates" | "geocoder" | "marker-drag";
  label?: string; // e.g. the geocoder's display name
}

interface MapEmbedErrorInfo {
  code:
    | "MISSING_LOCATION" // neither center nor location given
    | "INVALID_COORDINATES" // lat outside -90..90 or lng outside -180..180
    | "GEOCODER_REQUIRED" // an address was passed without a geocoder
    | "GEOCODE_NOT_FOUND" // the geocoder found nothing
    | "GEOCODE_FAILED" // network/HTTP/service error
    | "MAP_LOAD_FAILED" // Leaflet could not be loaded
    | "MISSING_API_KEY"; // Google provider without a key
  message: string;
}

interface Geocoder {
  geocode(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<{ lat: number; lng: number; label?: string } | null>;
}
```

All types are exported from `react-map-embed`, `react-map-embed/core` and `react-map-embed/google`.

### Utilities (`react-map-embed/core`)

Framework-independent, safe to call on the server, in workers, or in route handlers:

```ts
import {
  isValidLatLng, // (value) => value is LatLng
  parseCoordinateString, // ("23.81, 90.41") => { lat, lng } | null
  parseLocation, // classifies a location prop: coordinates | query | invalid | empty
  normalizeZoom, // (zoom, min?, max?) => clamped zoom
  toCssSize, // (400) => "400px"
  createNominatimGeocoder,
  openStreetMapTiles,
  MapEmbedError,
} from "react-map-embed/core";
```

These are also re-exported from the main entry.

### TypeScript example

```tsx
"use client";
import { useState } from "react";
import { MapEmbed } from "react-map-embed";
import type { LatLng, MapEmbedErrorInfo, ResolvedLocation } from "react-map-embed";

export function LocationPicker({ initial }: { initial: LatLng }) {
  const [picked, setPicked] = useState<ResolvedLocation | null>(null);

  return (
    <>
      <MapEmbed
        center={initial}
        draggableMarker
        onLocationChange={setPicked}
        onError={(error: MapEmbedErrorInfo) => reportError(error.code, error.message)}
        errorFallback={(error) => <p>Map unavailable ({error.code})</p>}
      />
      {picked && (
        <p>
          {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
        </p>
      )}
    </>
  );
}
```

## Next.js (App Router)

1. Import the stylesheet in `app/layout.tsx`:

   ```tsx
   import "react-map-embed/styles.css";
   ```

2. Use `<MapEmbed>` anywhere. The main entry is published with `"use client"`, so it can be rendered directly from a Server Component **as long as you only pass serializable props**:

   ```tsx
   // app/contact/page.tsx — a Server Component
   import { MapEmbed } from "react-map-embed";

   export default function Contact() {
     return <MapEmbed center={{ lat: 23.8103, lng: 90.4125 }} height={400} title="Our office" />;
   }
   ```

3. Callbacks (`onLocationChange`, `onError`, function `errorFallback`) and geocoder objects can't cross the server→client boundary. Wrap those usages in your own file marked `"use client"`, as in [`examples/nextjs-app/app/AddressSearch.tsx`](examples/nextjs-app/app/AddressSearch.tsx).

How SSR works: on the server (and on the first client render) the component outputs a sized placeholder. Leaflet, which needs `window`, is dynamically imported in an effect after hydration, so there are no hydration mismatches and no `next/dynamic` or `ssr: false` wrapper is needed.

| Entry                        | Client-only?                  | Notes                                                |
| ---------------------------- | ----------------------------- | ---------------------------------------------------- |
| `react-map-embed`            | Yes (`"use client"` included) | `MapEmbed` + re-exported utilities                   |
| `react-map-embed/core`       | No                            | Pure functions; usable in Server Components          |
| `react-map-embed/google`     | No                            | `GoogleMapEmbed` has no hooks; renders on the server |
| `react-map-embed/styles.css` | —                             | Import once                                          |

A complete example lives in [`examples/nextjs-app`](examples/nextjs-app).

## Providers

### Tiles (default: OpenStreetMap)

The default `openStreetMapTiles` uses `https://tile.openstreetmap.org`, run by the OpenStreetMap Foundation on donated resources. It is **not unlimited**. Under the [OSMF Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/):

- Visible attribution is required (shown automatically; don't hide it).
- Heavy use is prohibited (high-traffic sites, bulk/prefetch downloading, offline use). Access may be blocked without notice.
- Requests must carry a valid HTTP `Referer` / `User-Agent`. Browsers send these by default; don't set `referrerpolicy="no-referrer"` on the page.

For production sites with real traffic, use a commercial tile provider or host your own tiles:

```tsx
import type { TileProvider } from "react-map-embed";

const tiles: TileProvider = {
  url: "https://tiles.example.com/{z}/{x}/{y}.png?api_key=PUBLIC_BROWSER_KEY",
  attribution:
    '&copy; Example Maps &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 20,
};

<MapEmbed center={center} tileProvider={tiles} />;
```

Tile keys used this way are visible to users. Only use keys that the provider intends for browser use, and restrict them by domain in the provider's dashboard.

### Geocoding

`createNominatimGeocoder(options)` is backed by the [Nominatim](https://nominatim.org) search API, which uses OpenStreetMap data (ODbL).

| Option           | Default                                      | Notes                                                              |
| ---------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `endpoint`       | `https://nominatim.openstreetmap.org/search` | Point to a self-hosted or commercial Nominatim-compatible service. |
| `email`          | —                                            | Contact address; recommended by the usage policy.                  |
| `acceptLanguage` | —                                            | e.g. `"en"`, `"bn,en"`.                                            |
| `countryCodes`   | —                                            | e.g. `["bd"]`.                                                     |
| `minIntervalMs`  | `1000`                                       | Requests are serialized at most once per interval.                 |
| `fetch`          | `globalThis.fetch`                           | Custom fetch.                                                      |

The public instance's [usage policy](https://operations.osmfoundation.org/policies/nominatim/) allows **at most 1 request per second** and forbids heavy use, bulk geocoding and **autocomplete / search-as-you-type**. The adapter enforces the interval per geocoder instance and caches results in memory, but it cannot coordinate across browser tabs or visitors. For anything beyond light use, set `endpoint` to your own or a commercial service.

You can implement any `Geocoder` yourself, for example to call your own backend:

```ts
const geocoder: Geocoder = {
  async geocode(query, { signal } = {}) {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json(); // { lat, lng, label? } | null
  },
};
```

A geocoder that returns `null` produces `GEOCODE_NOT_FOUND`; a thrown error produces `GEOCODE_FAILED`. In-flight requests are aborted when `location` changes or the component unmounts.

> Check your geocoder's terms before combining it with a map. Some providers, including Google's Geocoding API, prohibit displaying their results on a non-Google map.

### Google Maps (optional)

```tsx
import { GoogleMapEmbed } from "react-map-embed/google";

<GoogleMapEmbed
  apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY!}
  location="Dhaka, Bangladesh" // Google resolves addresses itself
  zoom={12}
  height={400}
/>;
```

This uses the official [Maps Embed API](https://developers.google.com/maps/documentation/embed/get-started) (an `<iframe>`). It is a separate entry point, so none of it ends up in your bundle unless you import it.

Requirements and caveats:

- **You need your own API key** from a Google Cloud project with the Maps Embed API enabled and a billing account attached. Google currently lists the Embed API at no charge; check [current pricing](https://mapsplatform.google.com/pricing/) before relying on that.
- **The key is public.** It appears in the iframe URL in every visitor's browser. Reading it from a server-side environment variable does _not_ hide it. Protect it with restrictions instead:
  - _Application restriction:_ HTTP referrers (your domains only).
  - _API restriction:_ Maps Embed API only.
- The iframe sets `referrerpolicy="no-referrer-when-downgrade"`, as Google recommends, so referrer restrictions keep working.
- Supported props: `location` (address or coordinates), `center`, `zoom` (0–21, rounded), `showMarker`, `interactive`, sizing, `title`, `errorFallback`, plus `mapType` (`"roadmap" | "satellite"`), `language` and `region`.
- Not supported, because an Embed iframe can't report back: `onLocationChange`, `onError`, `loading`, `draggableMarker`. `interactive={false}` disables pointer events and removes the iframe from the tab order.
- Use is subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms).

`buildGoogleEmbedUrl(options)` is exported if you only need the URL.

More detail, and the reasons a keyless proxy isn't offered, are in [docs/google-maps.md](docs/google-maps.md).

## Attribution requirements

- **OpenStreetMap tiles/data:** "© OpenStreetMap contributors" must be visible. It is shown in the map's bottom-right corner; don't hide `.leaflet-control-attribution`.
- **Custom tiles:** set `tileProvider.attribution` to whatever your provider requires.
- **Leaflet:** the default attribution prefix links to Leaflet. You may remove it, but keeping it is appreciated.
- **Google:** attribution is rendered inside the iframe by Google.

## Security considerations

- The package contains **no API keys or credentials**. CI checks the build output for Google-style keys.
- Everything passed to a map provider is URL-encoded (`URLSearchParams`), and nothing is rendered as HTML except the `attribution` string you configure. Treat `tileProvider.attribution` as trusted HTML and never fill it with user input.
- Any key used directly from the browser (Google Embed, commercial tiles) is visible to users. Use browser-scoped keys with domain restrictions, and keep secret keys only behind your own server endpoints, such as a custom `Geocoder` that calls your API.
- If you proxy a geocoder through your own backend, validate input and rate-limit it. Otherwise it becomes an open relay for your quota.
- With a strict Content-Security-Policy, allow `img-src https://tile.openstreetmap.org data:` (or your tile host), `connect-src https://nominatim.openstreetmap.org` if you use it, and `frame-src https://www.google.com` for the Google provider.

## Styling

The root element has class `rme-root` and `data-state="loading" | "ready" | "error"`. CSS custom properties:

```css
.rme-root {
  --rme-marker-color: #2563eb;
  --rme-status-bg: #eef1f4;
  --rme-status-fg: #4b5563;
  --rme-error-bg: #fdf2f2;
  --rme-error-fg: #9b1c1c;
}
```

`.rme-loading`, `.rme-error` and `.rme-marker` can also be targeted directly.

## Development

```bash
npm install
npm test               # Vitest + React Testing Library (jsdom), plus an SSR test in Node
npm run lint           # ESLint
npm run typecheck      # tsc
npm run build          # Vite library build (ESM + CJS) + declarations
npm run verify:package # import every entry as ESM and CJS in Node, SSR smoke test, publint, attw
```

Run the Next.js example against a locally packed build:

```bash
cd examples/nextjs-app
npm run pack-lib   # builds the library and creates react-map-embed-<version>.tgz here
npm install
npm run dev
```

Project layout:

```text
src/
  components/      MapEmbed (client), MapStatus (loading/error overlay)
  providers/
    leaflet/       Imperative Leaflet integration, tile presets
    google/        Maps Embed API URL builder + iframe component
  hooks/           useResolvedLocation (coordinates/geocoding state machine)
  utils/           validation, geocoders, errors
  types/           public types
  index.ts         "react-map-embed"        (use client)
  core.ts          "react-map-embed/core"   (server-safe)
  google.ts        "react-map-embed/google" (server-safe)
tests/             unit, component, SSR and export tests
examples/nextjs-app
docs/              Google evaluation, publishing checklist
```

## Contributing

Issues and pull requests are welcome. Please:

1. Open an issue first for larger changes.
2. Add or update tests and keep `npm test`, `npm run lint`, `npm run typecheck` and `npm run build && npm run verify:package` green.
3. Don't add dependencies to the runtime bundle without discussion.
4. Never commit API keys. The examples read keys from environment variables only.

## License

[MIT](LICENSE)
