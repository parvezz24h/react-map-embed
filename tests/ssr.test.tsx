// @vitest-environment node
import { renderToString } from "react-dom/server";
import { MapEmbed } from "../src";
import { GoogleMapEmbed } from "../src/google";

describe("server rendering", () => {
  it("has no DOM globals available", () => {
    expect(typeof window).toBe("undefined");
  });

  it("renders MapEmbed's sized placeholder without touching window", () => {
    const html = renderToString(
      <MapEmbed center={{ lat: 23.8103, lng: 90.4125 }} height={300} title="Office" />,
    );
    expect(html).toContain('aria-label="Office"');
    expect(html).toContain("height:300px");
    expect(html).toContain("Loading map");
    expect(html).not.toContain("leaflet-container");
  });

  it("renders error states on the server", () => {
    expect(renderToString(<MapEmbed location="Dhaka" />)).toContain('role="alert"');
  });

  it("renders GoogleMapEmbed fully on the server", () => {
    expect(renderToString(<GoogleMapEmbed apiKey="k" location="Dhaka" />)).toContain("<iframe");
  });
});
