"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useResolvedLocation } from "../hooks/useResolvedLocation.js";
import { LeafletMap } from "../providers/leaflet/LeafletMap.js";
import { openStreetMapTiles } from "../providers/leaflet/tiles.js";
import type {
  BaseMapProps,
  Geocoder,
  LatLng,
  MapEmbedErrorInfo,
  ResolvedLocation,
  TileProvider,
} from "../types/index.js";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, normalizeZoom, toCssSize } from "../utils/validation.js";
import { MapStatus } from "./MapStatus.js";

export interface MapEmbedProps extends BaseMapProps {
  /**
   * Required to display address/place-name `location`s. Coordinates never need one.
   * Create it once at module scope so its cache and rate limiting are shared.
   */
  geocoder?: Geocoder;
  /** Raster tile source. Defaults to {@link openStreetMapTiles}. */
  tileProvider?: TileProvider;
  /** Defer loading Leaflet until the map scrolls near the viewport. Default `true`. */
  lazy?: boolean;
  /** Let users drag the marker to pick a location (requires `interactive`). Default `false`. */
  draggableMarker?: boolean;
  /** Marker tooltip and accessible name. Defaults to the geocoded label or `title`. */
  markerLabel?: string;
  /**
   * Called when the displayed location changes: after the initial resolution,
   * when `center`/`location` resolve to a new point, and when a draggable marker is dropped.
   */
  onLocationChange?: (location: ResolvedLocation) => void;
}

/**
 * An interactive, keyless map (Leaflet + OpenStreetMap tiles by default).
 *
 * Client component: Leaflet is loaded in an effect, so this renders a sized
 * placeholder during SSR and never touches `window` on the server.
 */
export function MapEmbed({
  location,
  center,
  zoom,
  height,
  width,
  className,
  style,
  showMarker = true,
  interactive = true,
  title = "Map",
  loading,
  errorFallback,
  onError,
  geocoder,
  tileProvider = openStreetMapTiles,
  lazy = true,
  draggableMarker = false,
  markerLabel,
  onLocationChange,
}: MapEmbedProps) {
  const resolved = useResolvedLocation(center, location, geocoder);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<MapEmbedErrorInfo | null>(null);

  const error = resolved.status === "error" ? resolved.error : mapError;
  const point = resolved.status === "ready" ? resolved.location : undefined;
  const isLoading = !error && (!point || !mapReady);
  const effectiveZoom = normalizeZoom(zoom, tileProvider.minZoom ?? 0, tileProvider.maxZoom ?? 19);

  const callbacks = useRef({ onError, onLocationChange });
  useEffect(() => {
    callbacks.current = { onError, onLocationChange };
  });

  const errorKey = error ? `${error.code}:${error.message}` : null;
  useEffect(() => {
    if (error) callbacks.current.onError?.(error);
    // `error` is a fresh object each render; `errorKey` identifies it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorKey]);

  const pointKey = point ? `${point.lat},${point.lng},${point.source}` : null;
  useEffect(() => {
    if (point) callbacks.current.onLocationChange?.(point);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointKey]);

  const handleReady = useCallback(() => setMapReady(true), []);
  const handleMapError = useCallback((info: MapEmbedErrorInfo) => setMapError(info), []);
  const handleDragEnd = useCallback(
    (position: LatLng) =>
      callbacks.current.onLocationChange?.({ ...position, source: "marker-drag" }),
    [],
  );

  const rootStyle: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    ...style,
    width: toCssSize(width, DEFAULT_WIDTH),
    height: toCssSize(height, DEFAULT_HEIGHT),
  };

  return (
    <div
      className={["rme-root", className].filter(Boolean).join(" ")}
      style={rootStyle}
      role="region"
      aria-label={title}
      aria-busy={isLoading}
      data-state={error ? "error" : isLoading ? "loading" : "ready"}
    >
      {error ? (
        <MapStatus kind="error">
          {typeof errorFallback === "function"
            ? errorFallback(error)
            : (errorFallback ?? <DefaultError error={error} />)}
        </MapStatus>
      ) : (
        <>
          {point && (
            <LeafletMap
              center={point}
              zoom={effectiveZoom}
              tiles={tileProvider}
              showMarker={showMarker}
              interactive={interactive}
              draggableMarker={draggableMarker}
              markerLabel={markerLabel ?? point.label ?? title}
              title={title}
              lazy={lazy}
              onReady={handleReady}
              onError={handleMapError}
              onMarkerDragEnd={handleDragEnd}
            />
          )}
          {isLoading && <MapStatus kind="loading">{loading ?? "Loading map…"}</MapStatus>}
        </>
      )}
    </div>
  );
}

function DefaultError({ error }: { error: MapEmbedErrorInfo }) {
  return <span>{error.message.replace(/^\[react-map-embed\]\s*/, "")}</span>;
}
