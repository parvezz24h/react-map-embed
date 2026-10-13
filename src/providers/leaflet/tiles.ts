import type { TileProvider } from "../../types/index.js";

/**
 * The OpenStreetMap Foundation's standard tile layer.
 *
 * Free to use for light traffic, subject to the OSMF Tile Usage Policy:
 * https://operations.osmfoundation.org/policies/tiles/
 * Heavy use (high-traffic sites, bulk downloading, offline use) is prohibited —
 * switch to a commercial tile provider or self-hosted tiles in that case.
 */
export const openStreetMapTiles: TileProvider = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
  minZoom: 0,
  maxZoom: 19,
};
