// A Server Component. <MapEmbed> is a client component, so it can be used here
// directly as long as only serializable props (no callbacks) are passed.
import { MapEmbed } from "react-map-embed";
import { GoogleMapEmbed } from "react-map-embed/google";
import { AddressSearch } from "./AddressSearch";

const dhaka = { lat: 23.8103, lng: 90.4125 };

export default function Page() {
  // Server-only env var. Note: the Embed API key still appears in the iframe URL,
  // so it must be restricted by HTTP referrer — keeping it server-side does not hide it.
  const googleKey = process.env.GOOGLE_MAPS_EMBED_API_KEY;

  return (
    <main>
      <h1>react-map-embed</h1>
      <p className="hint">
        Interactive maps without a Google Maps API key — Leaflet with OpenStreetMap tiles.
      </p>

      <section>
        <h2>Coordinates</h2>
        <p className="hint">
          <code>{"<MapEmbed center={{ lat: 23.8103, lng: 90.4125 }} zoom={13} />"}</code>
        </p>
        <MapEmbed className="map" center={dhaka} zoom={13} height={360} title="Map of Dhaka" />
      </section>

      <section>
        <h2>Responsive sizes and options</h2>
        <div className="grid">
          <div>
            <p className="hint">
              <code>height=&quot;40vh&quot;</code>, coordinate string
            </p>
            <MapEmbed
              className="map"
              location="51.5072, -0.1276"
              zoom={11}
              height="40vh"
              title="Map of London"
            />
          </div>
          <div>
            <p className="hint">
              <code>interactive={"{false}"}</code> <code>showMarker={"{false}"}</code>
            </p>
            <MapEmbed
              className="map"
              location={[35.6762, 139.6503]}
              zoom={10}
              height="40vh"
              interactive={false}
              showMarker={false}
              title="Static map of Tokyo"
            />
          </div>
        </div>
      </section>

      <section>
        <h2>Address search (explicit geocoder)</h2>
        <p className="hint">
          Addresses need a geocoding service. This demo opts in to the public Nominatim instance
          (max 1 request/second, light use only). Drag the marker to pick a point.
        </p>
        <AddressSearch />
      </section>

      <section>
        <h2>Error handling</h2>
        <p className="hint">An address without a geocoder renders a clear, sized error state.</p>
        <MapEmbed className="map" location="Dhaka, Bangladesh" height={160} />
      </section>

      <section>
        <h2>Optional: Google Maps Embed API</h2>
        {googleKey ? (
          <GoogleMapEmbed
            className="map"
            apiKey={googleKey}
            location="Dhaka, Bangladesh"
            zoom={12}
            height={360}
            title="Google map of Dhaka"
          />
        ) : (
          <p className="hint">
            Set <code>GOOGLE_MAPS_EMBED_API_KEY</code> in <code>.env.local</code> to see this
            section. Without it, <code>{"<GoogleMapEmbed>"}</code> shows a missing-key error:
          </p>
        )}
        {!googleKey && <GoogleMapEmbed className="map" apiKey="" location="Dhaka" height={120} />}
      </section>
    </main>
  );
}
