import { useEffect, useMemo, useState } from "react";
import type {
  Geocoder,
  LatLng,
  LocationInput,
  MapEmbedErrorInfo,
  ResolvedLocation,
} from "../types/index.js";
import { MapEmbedError, toErrorInfo } from "../utils/errors.js";
import { isValidLatLng, parseLocation } from "../utils/validation.js";

export type LocationState =
  | { status: "loading" }
  | { status: "ready"; location: ResolvedLocation }
  | { status: "error"; error: MapEmbedErrorInfo };

type Plan = { kind: "done"; state: LocationState } | { kind: "geocode"; query: string };

function err(code: MapEmbedErrorInfo["code"], message: string): Plan {
  return {
    kind: "done",
    state: { status: "error", error: { code, message: `[react-map-embed] ${message}` } },
  };
}

function plan(
  center: LatLng | undefined,
  location: LocationInput | undefined,
  hasGeocoder: boolean,
): Plan {
  if (center !== undefined) {
    return isValidLatLng(center)
      ? {
          kind: "done",
          state: {
            status: "ready",
            location: { lat: center.lat, lng: center.lng, source: "center" },
          },
        }
      : err(
          "INVALID_COORDINATES",
          `Invalid center ${JSON.stringify(center)}. Latitude must be -90..90 and longitude -180..180.`,
        );
  }

  const parsed = parseLocation(location);
  switch (parsed.kind) {
    case "empty":
      return err("MISSING_LOCATION", "Provide a `center` or a `location` prop.");
    case "invalid":
      return err("INVALID_COORDINATES", parsed.reason);
    case "coordinates":
      return {
        kind: "done",
        state: { status: "ready", location: { ...parsed.value, source: "coordinates" } },
      };
    case "query":
      return hasGeocoder
        ? { kind: "geocode", query: parsed.value }
        : err(
            "GEOCODER_REQUIRED",
            `"${parsed.value}" is an address, which must be geocoded before it can be shown on a map. ` +
              "Pass coordinates via `center`, or pass a `geocoder` (e.g. createNominatimGeocoder()).",
          );
  }
}

type GeocodeState = { query: string; state: LocationState };

/**
 * Resolves `center`/`location` into coordinates, geocoding address strings via
 * the supplied geocoder. Pure inputs (coordinates) resolve synchronously, so
 * they render on the first pass without a loading state.
 */
export function useResolvedLocation(
  center: LatLng | undefined,
  location: LocationInput | undefined,
  geocoder: Geocoder | undefined,
): LocationState {
  // Callers often pass fresh object/array literals; key on their contents instead.
  const centerKey = center === undefined ? undefined : JSON.stringify(center);
  const locationKey = location === undefined ? undefined : JSON.stringify(location);

  const resolved = useMemo(
    () =>
      plan(
        centerKey === undefined ? undefined : (JSON.parse(centerKey) as LatLng),
        locationKey === undefined ? undefined : (JSON.parse(locationKey) as LocationInput),
        geocoder !== undefined,
      ),
    [centerKey, locationKey, geocoder],
  );

  const query = resolved.kind === "geocode" ? resolved.query : undefined;
  const [geocoded, setGeocoded] = useState<GeocodeState | undefined>(undefined);

  useEffect(() => {
    if (query === undefined || !geocoder) return;
    const controller = new AbortController();

    geocoder
      .geocode(query, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (!result) {
          throw new MapEmbedError(
            "GEOCODE_NOT_FOUND",
            `[react-map-embed] No results found for "${query}".`,
          );
        }
        if (!isValidLatLng(result)) {
          throw new MapEmbedError(
            "GEOCODE_FAILED",
            `[react-map-embed] Geocoder returned invalid coordinates.`,
          );
        }
        const location: ResolvedLocation = { lat: result.lat, lng: result.lng, source: "geocoder" };
        if (result.label) location.label = result.label;
        setGeocoded({ query, state: { status: "ready", location } });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const info = toErrorInfo(error);
        setGeocoded({
          query,
          state: {
            status: "error",
            error:
              error instanceof MapEmbedError
                ? info
                : { code: "GEOCODE_FAILED", message: info.message },
          },
        });
      });

    return () => controller.abort();
  }, [query, geocoder]);

  if (resolved.kind === "done") return resolved.state;
  return geocoded?.query === resolved.query ? geocoded.state : { status: "loading" };
}
