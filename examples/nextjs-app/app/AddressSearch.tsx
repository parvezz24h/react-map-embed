"use client";

import { useState } from "react";
import { createNominatimGeocoder, MapEmbed } from "react-map-embed";
import type { ResolvedLocation } from "react-map-embed";

// Create geocoders once, at module scope, so the cache and rate limit are shared.
const geocoder = createNominatimGeocoder({ acceptLanguage: "en" });

export function AddressSearch() {
  const [query, setQuery] = useState("Dhaka, Bangladesh");
  const [submitted, setSubmitted] = useState(query);
  const [selected, setSelected] = useState<ResolvedLocation | null>(null);

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(query);
        }}
      >
        <input
          aria-label="Address or place"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit">Show on map</button>
      </form>
      <MapEmbed
        className="map"
        location={submitted}
        geocoder={geocoder}
        zoom={12}
        height={360}
        draggableMarker
        title={`Map of ${submitted}`}
        onLocationChange={setSelected}
      />
      <output aria-live="polite">
        {selected
          ? `${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)} · ${selected.source}${selected.label ? ` · ${selected.label}` : ""}`
          : "Resolving…"}
      </output>
    </div>
  );
}
