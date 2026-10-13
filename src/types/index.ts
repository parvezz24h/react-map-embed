import type { CSSProperties, ReactNode } from "react";

/** A geographic coordinate in decimal degrees (WGS 84). */
export interface LatLng {
  /** Latitude, -90 to 90. */
  lat: number;
  /** Longitude, -180 to 180. */
  lng: number;
}

/** A `[lat, lng]` tuple, accepted anywhere a {@link LatLng} is. */
export type LatLngTuple = readonly [lat: number, lng: number];

/**
 * Anything `location` accepts:
 * - a coordinate object or tuple,
 * - a coordinate string such as `"23.8103, 90.4125"` (parsed locally, no network),
 * - any other string, treated as an address/place name that requires a `geocoder`.
 */
export type LocationInput = string | LatLng | LatLngTuple;

/** A CSS length. Numbers are treated as pixels. */
export type CssSize = number | string;

export type MapEmbedErrorCode =
  | "MISSING_LOCATION"
  | "INVALID_COORDINATES"
  | "GEOCODER_REQUIRED"
  | "GEOCODE_NOT_FOUND"
  | "GEOCODE_FAILED"
  | "MAP_LOAD_FAILED"
  | "MISSING_API_KEY";

/** Where a resolved location came from. */
export type LocationSource = "center" | "coordinates" | "geocoder" | "marker-drag";

export interface ResolvedLocation extends LatLng {
  source: LocationSource;
  /** Human-readable label, e.g. the geocoder's display name. */
  label?: string;
}

export interface GeocodeResult extends LatLng {
  /** Display name returned by the geocoding service, if any. */
  label?: string;
}

export interface GeocodeOptions {
  signal?: AbortSignal;
}

/**
 * A geocoding adapter turns an address/place name into coordinates.
 * Return `null` when nothing matches; throw for transport/service errors.
 */
export interface Geocoder {
  geocode(query: string, options?: GeocodeOptions): Promise<GeocodeResult | null>;
}

/** Raster tile source configuration for the Leaflet provider. */
export interface TileProvider {
  /** Tile URL template, e.g. `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. */
  url: string;
  /** HTML attribution string. Required by virtually every tile provider's terms. */
  attribution: string;
  /** Highest zoom level the provider serves. */
  maxZoom?: number;
  /** Lowest zoom level the provider serves. Defaults to 0. */
  minZoom?: number;
  /** Subdomains for `{s}` in the URL template. */
  subdomains?: string | string[];
}

/** Props shared by every map component in this package. */
export interface BaseMapProps {
  /** Address, place name, or coordinates. Ignored when `center` is provided. */
  location?: LocationInput;
  /** Explicit map center. Takes precedence over `location`. */
  center?: LatLng;
  /** Initial zoom level. Clamped to the provider's supported range. Default `13`. */
  zoom?: number;
  /** Height as pixels (number) or any CSS length. Default `400`. */
  height?: CssSize;
  /** Width as pixels (number) or any CSS length. Default `"100%"`. */
  width?: CssSize;
  className?: string;
  style?: CSSProperties;
  /** Show a marker at the resolved location. Default `true`. */
  showMarker?: boolean;
  /** Enable pan/zoom/keyboard interaction. Default `true`. */
  interactive?: boolean;
  /** Accessible name for the map region. Default `"Map"`. */
  title?: string;
  /** Custom UI rendered while the map is loading. */
  loading?: ReactNode;
  /** Custom UI rendered when the map cannot be displayed. */
  errorFallback?: ReactNode | ((error: MapEmbedErrorInfo) => ReactNode);
  /** Called when the map cannot be displayed. */
  onError?: (error: MapEmbedErrorInfo) => void;
}

/** Plain-object view of a {@link MapEmbedError}, safe to render or log. */
export interface MapEmbedErrorInfo {
  code: MapEmbedErrorCode;
  message: string;
}
