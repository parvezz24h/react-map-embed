import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { LatLng, MapEmbedErrorInfo, TileProvider } from "../../types/index.js";
import { warnOnce } from "../../utils/errors.js";

type LeafletModule = typeof Leaflet;

let leafletPromise: Promise<LeafletModule> | undefined;

/**
 * Leaflet touches `window` at import time, so it is only ever loaded from an
 * effect (client-side) and shared between all map instances.
 */
function loadLeaflet(): Promise<LeafletModule> {
  leafletPromise ??= import("leaflet")
    .then((mod) => ((mod as { default?: LeafletModule }).default ?? mod) as LeafletModule)
    .catch((error: unknown) => {
      leafletPromise = undefined;
      throw error;
    });
  return leafletPromise;
}

const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 42" width="30" height="42" aria-hidden="true" focusable="false">' +
  '<path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23.3 0 15 0z" fill="var(--rme-marker-color, #2563eb)"/>' +
  '<circle cx="15" cy="15" r="5.5" fill="#fff"/></svg>';

export interface LeafletMapProps {
  center: LatLng;
  zoom: number;
  tiles: TileProvider;
  showMarker: boolean;
  interactive: boolean;
  draggableMarker: boolean;
  markerLabel: string;
  title: string;
  lazy: boolean;
  onReady: () => void;
  onError: (error: MapEmbedErrorInfo) => void;
  onMarkerDragEnd: (position: LatLng) => void;
}

export function LeafletMap(props: LeafletMapProps) {
  const {
    center,
    zoom,
    tiles,
    showMarker,
    interactive,
    draggableMarker,
    markerLabel,
    title,
    lazy,
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [L, setL] = useState<LeafletModule | null>(null);
  const [map, setMap] = useState<Leaflet.Map | null>(null);

  // Keep the latest values/callbacks without re-creating the map on every render.
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  // 1. Load Leaflet once the container is (nearly) visible.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let active = true;
    let observer: IntersectionObserver | undefined;

    const load = () =>
      loadLeaflet().then(
        (mod) => active && setL(() => mod),
        (error: unknown) =>
          active &&
          latest.current.onError({
            code: "MAP_LOAD_FAILED",
            message: `[react-map-embed] Failed to load Leaflet: ${error instanceof Error ? error.message : String(error)}`,
          }),
      );

    if (lazy && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer?.disconnect();
            void load();
          }
        },
        { rootMargin: "200px" },
      );
      observer.observe(container);
    } else {
      void load();
    }

    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [lazy]);

  // 2. Create the map. Interaction settings and tiles can't be toggled cheaply, so they recreate it.
  const { url, attribution, minZoom, maxZoom, subdomains } = tiles;
  const subdomainKey = Array.isArray(subdomains) ? subdomains.join(",") : subdomains;
  useEffect(() => {
    const container = containerRef.current;
    if (!L || !container) return;

    const { center: initialCenter, zoom: initialZoom } = latest.current;
    const instance = L.map(container, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: initialZoom,
      minZoom,
      maxZoom,
      zoomControl: interactive,
      dragging: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      // Don't hijack page scrolling: wheel zoom is enabled only while the map has focus.
      scrollWheelZoom: false,
    });

    const tileOptions: Leaflet.TileLayerOptions = { attribution };
    if (minZoom !== undefined) tileOptions.minZoom = minZoom;
    if (maxZoom !== undefined) tileOptions.maxZoom = maxZoom;
    if (subdomainKey !== undefined) tileOptions.subdomains = subdomainKey.split(",");
    L.tileLayer(url, tileOptions).addTo(instance);

    if (interactive) {
      instance.on("focus", () => instance.scrollWheelZoom.enable());
      instance.on("blur", () => instance.scrollWheelZoom.disable());
    }

    const pane = instance.getPane("mapPane");
    if (pane && getComputedStyle(pane).position !== "absolute") {
      warnOnce(
        'Leaflet styles were not detected, so tiles will render incorrectly. Add `import "react-map-embed/styles.css";` to your app.',
      );
    }

    // Keep tiles aligned when the container is resized (responsive layouts, tabs, accordions).
    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => instance.invalidateSize());
      resizeObserver.observe(container);
    }

    instance.whenReady(() => {
      setMap(instance);
      latest.current.onReady();
    });

    return () => {
      resizeObserver?.disconnect();
      instance.remove();
      setMap(null);
    };
  }, [L, interactive, url, attribution, minZoom, maxZoom, subdomainKey]);

  // 3. Follow center/zoom prop changes.
  const { lat, lng } = center;
  useEffect(() => {
    map?.setView([lat, lng], zoom);
  }, [map, lat, lng, zoom]);

  // 4. Marker.
  const canDrag = draggableMarker && interactive;
  useEffect(() => {
    if (!L || !map || !showMarker) return;
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: "rme-marker",
        html: PIN_SVG,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
      }),
      title: markerLabel,
      keyboard: interactive,
      draggable: canDrag,
      riseOnHover: true,
    }).addTo(map);
    // `alt` only applies to image icons; give the SVG marker an accessible name directly.
    marker.getElement()?.setAttribute("aria-label", markerLabel);

    if (canDrag) {
      marker.on("dragend", () => {
        const position = marker.getLatLng();
        latest.current.onMarkerDragEnd({ lat: position.lat, lng: position.lng });
      });
    }
    return () => {
      marker.remove();
    };
  }, [L, map, showMarker, lat, lng, markerLabel, interactive, canDrag]);

  return (
    <div
      ref={containerRef}
      className="rme-map"
      style={{ width: "100%", height: "100%" }}
      // Leaflet makes the container focusable and captures arrow/+/- keys when interactive.
      {...(interactive && {
        role: "application",
        "aria-label": `${title}. Use arrow keys to pan and plus or minus keys to zoom.`,
      })}
    />
  );
}
