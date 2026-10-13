// Framework-independent utilities. Safe to import from servers, workers and React Server Components.
export {
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  DEFAULT_ZOOM,
  isValidLatLng,
  normalizeZoom,
  parseCoordinateString,
  parseLocation,
  toCssSize,
} from "./utils/validation.js";
export type { ParsedLocation } from "./utils/validation.js";
export { MapEmbedError } from "./utils/errors.js";
export { createNominatimGeocoder } from "./utils/geocoders.js";
export type { NominatimGeocoderOptions } from "./utils/geocoders.js";
export { openStreetMapTiles } from "./providers/leaflet/tiles.js";
export type * from "./types/index.js";
