import type { CssSize, LatLng, LocationInput } from "../types/index.js";
import { warnOnce } from "./errors.js";

export const DEFAULT_ZOOM = 13;
export const DEFAULT_HEIGHT = 400;
export const DEFAULT_WIDTH = "100%";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** True when `value` is a `{ lat, lng }` object inside WGS 84 bounds. */
export function isValidLatLng(value: unknown): value is LatLng {
  if (typeof value !== "object" || value === null) return false;
  const { lat, lng } = value as Partial<LatLng>;
  return (
    isFiniteNumber(lat) &&
    isFiniteNumber(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

const COORDINATE_PATTERN = /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/;

/**
 * Parses `"lat, lng"` (comma, semicolon or whitespace separated).
 * Returns `null` if the string is not a coordinate pair or is out of range.
 */
export function parseCoordinateString(value: string): LatLng | null {
  const match = COORDINATE_PATTERN.exec(value);
  if (!match) return null;
  const candidate = { lat: Number(match[1]), lng: Number(match[2]) };
  return isValidLatLng(candidate) ? candidate : null;
}

export type ParsedLocation =
  | { kind: "coordinates"; value: LatLng }
  | { kind: "query"; value: string }
  | { kind: "invalid"; reason: string }
  | { kind: "empty" };

/** Classifies a `location` prop without performing any network requests. */
export function parseLocation(input: LocationInput | undefined | null): ParsedLocation {
  if (input === undefined || input === null) return { kind: "empty" };

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return { kind: "empty" };
    if (COORDINATE_PATTERN.test(trimmed)) {
      const coords = parseCoordinateString(trimmed);
      return coords
        ? { kind: "coordinates", value: coords }
        : {
            kind: "invalid",
            reason: `"${trimmed}" is outside the valid latitude/longitude range.`,
          };
    }
    return { kind: "query", value: trimmed };
  }

  const candidate = Array.isArray(input)
    ? { lat: input[0], lng: input[1] }
    : { lat: (input as LatLng).lat, lng: (input as LatLng).lng };

  return isValidLatLng(candidate)
    ? { kind: "coordinates", value: candidate }
    : {
        kind: "invalid",
        reason: `Invalid coordinates ${JSON.stringify(candidate)}. Latitude must be -90..90 and longitude -180..180.`,
      };
}

/**
 * Returns a usable integer-or-fractional zoom inside `[min, max]`.
 * Non-numeric values fall back to {@link DEFAULT_ZOOM}; out-of-range values are clamped.
 */
export function normalizeZoom(zoom: unknown, min = 0, max = 19): number {
  if (zoom === undefined) return Math.min(Math.max(DEFAULT_ZOOM, min), max);
  if (!isFiniteNumber(zoom)) {
    warnOnce(`Invalid zoom ${String(zoom)}; using ${DEFAULT_ZOOM}.`);
    return Math.min(Math.max(DEFAULT_ZOOM, min), max);
  }
  if (zoom < min || zoom > max) {
    const clamped = Math.min(Math.max(zoom, min), max);
    warnOnce(`Zoom ${zoom} is outside the supported range ${min}-${max}; using ${clamped}.`);
    return clamped;
  }
  return zoom;
}

/** Converts a size prop to a CSS value. Numbers become pixels. */
export function toCssSize(value: CssSize | undefined, fallback: CssSize): string {
  const resolved = value ?? fallback;
  if (typeof resolved === "number") {
    if (Number.isFinite(resolved) && resolved >= 0) return `${resolved}px`;
    warnOnce(`Invalid size ${resolved}; using ${String(fallback)}.`);
    return typeof fallback === "number" ? `${fallback}px` : fallback;
  }
  const trimmed = resolved.trim();
  if (trimmed) return trimmed;
  warnOnce(`Empty size string; using ${String(fallback)}.`);
  return typeof fallback === "number" ? `${fallback}px` : fallback;
}
