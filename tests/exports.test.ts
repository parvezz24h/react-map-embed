import * as main from "../src";
import * as core from "../src/core";
import * as google from "../src/google";

describe("package entry points", () => {
  it("main entry exports the component and core utilities", () => {
    expect(Object.keys(main).sort()).toEqual(
      [
        "DEFAULT_HEIGHT",
        "DEFAULT_WIDTH",
        "DEFAULT_ZOOM",
        "MapEmbed",
        "MapEmbedError",
        "createNominatimGeocoder",
        "isValidLatLng",
        "normalizeZoom",
        "openStreetMapTiles",
        "parseCoordinateString",
        "parseLocation",
        "toCssSize",
      ].sort(),
    );
  });

  it("core entry has no React components", () => {
    expect(core).not.toHaveProperty("MapEmbed");
    expect(core).not.toHaveProperty("GoogleMapEmbed");
  });

  it("Google provider lives only in its own entry", () => {
    expect(Object.keys(google).sort()).toEqual(
      [
        "GOOGLE_EMBED_MAX_ZOOM",
        "GOOGLE_EMBED_MIN_ZOOM",
        "GoogleMapEmbed",
        "buildGoogleEmbedUrl",
      ].sort(),
    );
    expect(main).not.toHaveProperty("GoogleMapEmbed");
  });

  it("default tile provider carries attribution and documented zoom range", () => {
    expect(main.openStreetMapTiles).toMatchObject({
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: expect.stringContaining("OpenStreetMap"),
      maxZoom: 19,
    });
  });
});
