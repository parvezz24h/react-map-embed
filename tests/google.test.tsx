import { render, screen } from "@testing-library/react";
import { buildGoogleEmbedUrl, GoogleMapEmbed } from "../src/google";

function parse(url: string) {
  const u = new URL(url);
  return { path: u.pathname, params: Object.fromEntries(u.searchParams) };
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("buildGoogleEmbedUrl", () => {
  it("uses place mode for addresses (Google geocodes them)", () => {
    expect(
      parse(buildGoogleEmbedUrl({ apiKey: "k", location: "Dhaka, Bangladesh", zoom: 12 })),
    ).toEqual({
      path: "/maps/embed/v1/place",
      params: { key: "k", q: "Dhaka, Bangladesh", zoom: "12" },
    });
  });

  it("uses place mode with a coordinate query when a marker is wanted", () => {
    expect(parse(buildGoogleEmbedUrl({ apiKey: "k", center: { lat: 1, lng: 2 } })).params).toEqual({
      key: "k",
      q: "1,2",
      center: "1,2",
      zoom: "13",
    });
  });

  it("uses view mode for coordinates without a marker", () => {
    const { path, params } = parse(
      buildGoogleEmbedUrl({
        apiKey: "k",
        location: [1, 2],
        showMarker: false,
        mapType: "satellite",
        language: "bn",
        region: "bd",
      }),
    );
    expect(path).toBe("/maps/embed/v1/view");
    expect(params).toEqual({
      key: "k",
      center: "1,2",
      zoom: "13",
      maptype: "satellite",
      language: "bn",
      region: "bd",
    });
  });

  it("rounds and clamps zoom to 0-21", () => {
    expect(parse(buildGoogleEmbedUrl({ apiKey: "k", location: "x", zoom: 30 })).params.zoom).toBe(
      "21",
    );
    expect(parse(buildGoogleEmbedUrl({ apiKey: "k", location: "x", zoom: 7.6 })).params.zoom).toBe(
      "8",
    );
  });

  it("throws typed errors for missing key or bad input", () => {
    expect(() => buildGoogleEmbedUrl({ apiKey: "", location: "x" })).toThrow(
      expect.objectContaining({ code: "MISSING_API_KEY" }),
    );
    expect(() => buildGoogleEmbedUrl({ apiKey: "k" })).toThrow(
      expect.objectContaining({ code: "MISSING_LOCATION" }),
    );
    expect(() => buildGoogleEmbedUrl({ apiKey: "k", center: { lat: 100, lng: 0 } })).toThrow(
      expect.objectContaining({ code: "INVALID_COORDINATES" }),
    );
  });

  it("encodes user input safely", () => {
    const url = buildGoogleEmbedUrl({ apiKey: "k", location: 'a&key=evil"<x>' });
    expect(parse(url).params).toEqual({ key: "k", q: 'a&key=evil"<x>', zoom: "13" });
  });
});

describe("GoogleMapEmbed", () => {
  it("renders an accessible, lazy iframe with the recommended referrer policy", () => {
    render(<GoogleMapEmbed apiKey="k" location="Dhaka" title="Our office" height={300} />);
    const frame = screen.getByTitle("Our office");
    expect(frame.tagName).toBe("IFRAME");
    expect(frame).toHaveAttribute("loading", "lazy");
    expect(frame).toHaveAttribute("referrerpolicy", "no-referrer-when-downgrade");
    expect(frame.getAttribute("src")).toMatch(
      /^https:\/\/www\.google\.com\/maps\/embed\/v1\/place\?key=k&q=Dhaka/,
    );
    expect(screen.getByRole("region", { name: "Our office" })).toHaveStyle({
      height: "300px",
      width: "100%",
    });
  });

  it("shows an error instead of an iframe when the key is missing", () => {
    const { container } = render(<GoogleMapEmbed apiKey="" location="Dhaka" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/requires a Maps Embed API key/);
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("supports errorFallback", () => {
    render(
      <GoogleMapEmbed
        apiKey={undefined as unknown as string}
        location="Dhaka"
        errorFallback={(e) => e.code}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("MISSING_API_KEY");
  });

  it("removes the iframe from tab order when not interactive", () => {
    render(<GoogleMapEmbed apiKey="k" location="Dhaka" interactive={false} />);
    const frame = screen.getByTitle("Map");
    expect(frame).toHaveAttribute("tabindex", "-1");
    expect(frame).toHaveStyle({ pointerEvents: "none" });
  });
});
