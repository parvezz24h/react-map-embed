import type { LatLng, LocationInput } from "../../types/index.js";
import { MapEmbedError } from "../../utils/errors.js";
import { isValidLatLng, normalizeZoom, parseLocation } from "../../utils/validation.js";

export const GOOGLE_EMBED_MIN_ZOOM = 0;
export const GOOGLE_EMBED_MAX_ZOOM = 21;

export interface GoogleEmbedUrlOptions {
  /** A Maps Embed API key, restricted to your site's HTTP referrers. */
  apiKey: string;
  location?: LocationInput;
  center?: LatLng;
  zoom?: number;
  showMarker?: boolean;
  mapType?: "roadmap" | "satellite";
  /** UI language, e.g. `"en"`. */
  language?: string;
  /** Region bias as a ccTLD, e.g. `"bd"`. */
  region?: string;
}

const BASE = "https://www.google.com/maps/embed/v1";

/**
 * Builds a Google Maps Embed API URL. Addresses are passed to Google as `q`,
 * so no separate geocoder is needed with this provider.
 *
 * @throws {MapEmbedError} `MISSING_API_KEY`, `MISSING_LOCATION` or `INVALID_COORDINATES`.
 */
export function buildGoogleEmbedUrl(options: GoogleEmbedUrlOptions): string {
  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    throw new MapEmbedError(
      "MISSING_API_KEY",
      "[react-map-embed] The Google provider requires a Maps Embed API key. " +
        'Use <MapEmbed> from "react-map-embed" for a keyless map.',
    );
  }

  let coords: LatLng | undefined;
  let query: string | undefined;
  if (options.center !== undefined) {
    if (!isValidLatLng(options.center)) {
      throw new MapEmbedError(
        "INVALID_COORDINATES",
        `[react-map-embed] Invalid center ${JSON.stringify(options.center)}.`,
      );
    }
    coords = options.center;
  } else {
    const parsed = parseLocation(options.location);
    if (parsed.kind === "empty") {
      throw new MapEmbedError(
        "MISSING_LOCATION",
        "[react-map-embed] Provide a `center` or a `location` prop.",
      );
    }
    if (parsed.kind === "invalid")
      throw new MapEmbedError("INVALID_COORDINATES", `[react-map-embed] ${parsed.reason}`);
    if (parsed.kind === "coordinates") coords = parsed.value;
    else query = parsed.value;
  }

  const zoom = Math.round(
    normalizeZoom(options.zoom, GOOGLE_EMBED_MIN_ZOOM, GOOGLE_EMBED_MAX_ZOOM),
  );
  const showMarker = options.showMarker ?? true;
  const params = new URLSearchParams({ key: apiKey });
  let mode: "place" | "view";

  if (query !== undefined) {
    // Place mode always shows a marker for the matched place.
    mode = "place";
    params.set("q", query);
  } else {
    const latLng = `${coords!.lat},${coords!.lng}`;
    mode = showMarker ? "place" : "view";
    if (showMarker) params.set("q", latLng);
    params.set("center", latLng);
  }
  params.set("zoom", String(zoom));
  if (options.mapType) params.set("maptype", options.mapType);
  if (options.language) params.set("language", options.language);
  if (options.region) params.set("region", options.region);

  return `${BASE}/${mode}?${params.toString()}`;
}
