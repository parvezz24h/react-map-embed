// Smoke-tests the built package the way consumers load it: through package.json
// "exports", as both ESM and CommonJS, in plain Node (no DOM) to prove SSR safety.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

const require = createRequire(import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));

const expected = {
  ".": [
    "MapEmbed",
    "createNominatimGeocoder",
    "isValidLatLng",
    "openStreetMapTiles",
    "MapEmbedError",
  ],
  "./core": [
    "createNominatimGeocoder",
    "isValidLatLng",
    "parseLocation",
    "normalizeZoom",
    "toCssSize",
  ],
  "./google": ["GoogleMapEmbed", "buildGoogleEmbedUrl"],
};

for (const [subpath, names] of Object.entries(expected)) {
  const specifier = subpath === "." ? pkg.name : `${pkg.name}/${subpath.slice(2)}`;
  const esm = await import(specifier);
  const cjs = require(specifier);
  for (const name of names) {
    assert.ok(esm[name], `ESM ${specifier} is missing export ${name}`);
    assert.ok(cjs[name], `CJS ${specifier} is missing export ${name}`);
  }
  assert.equal(
    esm.MapEmbed === undefined,
    subpath !== ".",
    `${specifier}: MapEmbed only belongs in the main entry`,
  );
}

// "use client" must head the component entry and only that entry.
for (const file of ["dist/index.js", "dist/cjs/index.js"]) {
  assert.ok(readFileSync(file, "utf8").startsWith('"use client";'), `${file} lacks "use client"`);
}
for (const file of ["dist/core.js", "dist/google.js", "dist/cjs/core.js", "dist/cjs/google.js"]) {
  assert.ok(
    !readFileSync(file, "utf8").includes('"use client"'),
    `${file} must stay server-compatible`,
  );
}

assert.ok(existsSync(require.resolve(`${pkg.name}/styles.css`)), "styles.css missing");

// Server rendering must not touch window/document.
const { MapEmbed } = await import(pkg.name);
const { GoogleMapEmbed } = await import(`${pkg.name}/google`);
const html = renderToString(
  createElement(MapEmbed, { center: { lat: 23.8103, lng: 90.4125 }, height: 300 }),
);
assert.match(html, /height:300px/);
assert.match(html, /Loading map/);
const google = renderToString(
  createElement(GoogleMapEmbed, { apiKey: "test-key", location: "Dhaka" }),
);
assert.match(google, /maps\/embed\/v1\/place/);

// No credentials should ever ship.
const bundle = ["dist/index.js", "dist/google.js", "dist/cjs/index.js", "dist/cjs/google.js"]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
assert.doesNotMatch(bundle, /AIza[0-9A-Za-z_-]{35}/, "A Google API key appears in the bundle");

console.log("verify-package: all checks passed");
