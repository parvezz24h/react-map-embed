# Changelog

All notable changes to this project are documented here. This project follows [Semantic Versioning](https://semver.org).

## 0.1.0 — Unreleased

- `MapEmbed`: keyless Leaflet + OpenStreetMap map with marker, sizing, loading/error states, lazy loading, keyboard support and SSR safety.
- Coordinate parsing and validation; zoom clamping to the tile provider's range.
- Opt-in geocoding via `geocoder` prop; `createNominatimGeocoder` with rate limiting and caching.
- Custom tile providers via `tileProvider`.
- `react-map-embed/core`: server-safe utilities.
- `react-map-embed/google`: optional `GoogleMapEmbed` (Maps Embed API, bring your own key).
