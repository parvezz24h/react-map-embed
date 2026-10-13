import type { GeocodeOptions, GeocodeResult, Geocoder } from "../types/index.js";
import { MapEmbedError } from "./errors.js";
import { isValidLatLng } from "./validation.js";

export interface NominatimGeocoderOptions {
  /**
   * Search endpoint. Defaults to the public OSMF instance, which allows at most
   * 1 request per second and forbids heavy use:
   * https://operations.osmfoundation.org/policies/nominatim/
   * Point this at a self-hosted or commercial Nominatim-compatible service for production traffic.
   */
  endpoint?: string;
  /** Contact address sent as the `email` parameter, as recommended by the usage policy. */
  email?: string;
  /** Preferred result language, e.g. `"en"` or `"bn,en"`. */
  acceptLanguage?: string;
  /** Restrict results to ISO 3166-1 alpha-2 country codes, e.g. `["bd"]`. */
  countryCodes?: string[];
  /** Minimum delay between requests in milliseconds. Default `1000`; never lower it for the public instance. */
  minIntervalMs?: number;
  /** Custom fetch implementation (useful for tests or server runtimes). */
  fetch?: typeof fetch;
}

const PUBLIC_NOMINATIM = "https://nominatim.openstreetmap.org/search";

interface NominatimItem {
  lat: string;
  lon: string;
  display_name?: string;
}

function abortError(): Error {
  return new DOMException("The operation was aborted.", "AbortError");
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Geocoder backed by the Nominatim search API (OpenStreetMap data, ODbL).
 *
 * Results are cached in memory for the lifetime of the geocoder and requests are
 * serialized to respect `minIntervalMs`. Create one instance at module scope and
 * reuse it so the cache and rate limit are shared across components.
 */
export function createNominatimGeocoder(options: NominatimGeocoderOptions = {}): Geocoder {
  const endpoint = options.endpoint ?? PUBLIC_NOMINATIM;
  const minIntervalMs = options.minIntervalMs ?? 1000;
  const cache = new Map<string, GeocodeResult | null>();
  let queue: Promise<unknown> = Promise.resolve();
  let lastRequestAt = -Infinity;

  async function request(query: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
    await wait(lastRequestAt + minIntervalMs - Date.now(), signal);
    if (signal?.aborted) throw abortError();

    const url = new URL(endpoint);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    if (options.email) url.searchParams.set("email", options.email);
    if (options.acceptLanguage) url.searchParams.set("accept-language", options.acceptLanguage);
    if (options.countryCodes?.length)
      url.searchParams.set("countrycodes", options.countryCodes.join(","));

    const fetchImpl = options.fetch ?? globalThis.fetch;
    lastRequestAt = Date.now();
    let response: Response;
    try {
      response = await fetchImpl(url.toString(), {
        signal,
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new MapEmbedError(
        "GEOCODE_FAILED",
        `[react-map-embed] Geocoding request failed for "${query}".`,
        {
          cause: error,
        },
      );
    }
    if (!response.ok) {
      throw new MapEmbedError(
        "GEOCODE_FAILED",
        `[react-map-embed] Geocoding service responded with HTTP ${response.status} for "${query}".`,
      );
    }

    const items = (await response.json()) as NominatimItem[];
    const first = Array.isArray(items) ? items[0] : undefined;
    if (!first) return null;
    const result: GeocodeResult = { lat: Number(first.lat), lng: Number(first.lon) };
    if (!isValidLatLng(result)) {
      throw new MapEmbedError(
        "GEOCODE_FAILED",
        `[react-map-embed] Geocoding service returned invalid coordinates.`,
      );
    }
    if (first.display_name) result.label = first.display_name;
    return result;
  }

  return {
    geocode(query: string, { signal }: GeocodeOptions = {}) {
      const key = query.trim().toLowerCase();
      if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);

      const run = queue.then(() => {
        // Another caller may have filled the cache while we waited in the queue.
        if (cache.has(key)) return cache.get(key) ?? null;
        return request(query, signal).then((result) => {
          cache.set(key, result);
          return result;
        });
      });
      queue = run.catch(() => undefined);
      return run;
    },
  };
}
