import { render, screen, waitFor } from "@testing-library/react";
import { MapEmbed } from "../src";
import type { Geocoder, TileProvider } from "../src";

const dhaka = { lat: 23.8103, lng: 90.4125 };

beforeEach(() => {
  // jsdom has no stylesheet, so the "Leaflet CSS missing" hint fires; keep test output clean.
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

async function waitForMap(container: HTMLElement) {
  await waitFor(() => expect(container.querySelector(".leaflet-container")).not.toBeNull());
  await waitFor(() =>
    expect(container.querySelector(".rme-root")).toHaveAttribute("data-state", "ready"),
  );
}

describe("MapEmbed", () => {
  it("renders with sensible defaults", async () => {
    const { container } = render(<MapEmbed center={dhaka} />);
    const region = screen.getByRole("region", { name: "Map" });
    expect(region).toHaveStyle({ height: "400px", width: "100%" });
    await waitForMap(container);
    expect(container.querySelector(".rme-marker")).not.toBeNull();
    expect(container.querySelector(".leaflet-control-zoom")).not.toBeNull();
    expect(container.querySelector(".leaflet-control-attribution")).toHaveTextContent(
      "OpenStreetMap contributors",
    );
  });

  it("shows a loading placeholder that keeps the final size, then removes it", async () => {
    const { container } = render(
      <MapEmbed center={dhaka} height={250} loading={<span>Please wait</span>} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Please wait");
    expect(screen.getByRole("region")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("region")).toHaveStyle({ height: "250px" });
    await waitForMap(container);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("region")).toHaveAttribute("aria-busy", "false");
  });

  it.each([
    [
      { height: 300, width: 500 },
      { height: "300px", width: "500px" },
    ],
    [
      { height: "50vh", width: "80%" },
      { height: "50vh", width: "80%" },
    ],
  ])("applies size props %j", (props, expected) => {
    render(<MapEmbed center={dhaka} {...props} />);
    expect(screen.getByRole("region")).toHaveStyle(expected);
  });

  it("merges className and style without letting style override the size props", () => {
    render(
      <MapEmbed
        center={dhaka}
        className="my-map"
        style={{ borderRadius: 8, height: 1 }}
        height={320}
      />,
    );
    const region = screen.getByRole("region");
    expect(region).toHaveClass("rme-root", "my-map");
    expect(region).toHaveStyle({ borderRadius: "8px", height: "320px" });
  });

  it("hides the marker when showMarker is false", async () => {
    const { container } = render(<MapEmbed center={dhaka} showMarker={false} />);
    await waitForMap(container);
    expect(container.querySelector(".rme-marker")).toBeNull();
  });

  it("toggles the marker on re-render", async () => {
    const { container, rerender } = render(<MapEmbed center={dhaka} showMarker={false} />);
    await waitForMap(container);
    rerender(<MapEmbed center={dhaka} showMarker />);
    await waitFor(() => expect(container.querySelector(".rme-marker")).not.toBeNull());
  });

  it("labels the marker for assistive technology", async () => {
    const { container } = render(<MapEmbed center={dhaka} markerLabel="Our office" />);
    await waitForMap(container);
    expect(container.querySelector(".rme-marker")).toHaveAttribute("title", "Our office");
    expect(container.querySelector(".rme-marker")).toHaveAttribute("aria-label", "Our office");
  });

  it("is keyboard operable when interactive", async () => {
    const { container } = render(<MapEmbed center={dhaka} title="Office location" />);
    await waitForMap(container);
    const app = screen.getByRole("application");
    expect(app).toHaveAccessibleName(/Office location/);
    expect(app).toHaveAttribute("tabindex", "0");
  });

  it("disables controls and keyboard focus when interactive is false", async () => {
    const { container } = render(<MapEmbed center={dhaka} interactive={false} />);
    await waitForMap(container);
    expect(container.querySelector(".leaflet-control-zoom")).toBeNull();
    expect(screen.queryByRole("application")).toBeNull();
    expect(container.querySelector(".leaflet-container")).not.toHaveAttribute("tabindex");
  });

  it("accepts coordinates through `location` in several forms", async () => {
    const onLocationChange = vi.fn();
    const { container, rerender } = render(
      <MapEmbed location="23.8103, 90.4125" onLocationChange={onLocationChange} />,
    );
    await waitForMap(container);
    expect(onLocationChange).toHaveBeenLastCalledWith({ ...dhaka, source: "coordinates" });

    rerender(<MapEmbed location={[51.5, -0.12]} onLocationChange={onLocationChange} />);
    await waitFor(() =>
      expect(onLocationChange).toHaveBeenLastCalledWith({
        lat: 51.5,
        lng: -0.12,
        source: "coordinates",
      }),
    );
  });

  it("prefers `center` over `location`", async () => {
    const onLocationChange = vi.fn();
    render(<MapEmbed center={dhaka} location="Paris" onLocationChange={onLocationChange} />);
    await waitFor(() =>
      expect(onLocationChange).toHaveBeenCalledWith({ ...dhaka, source: "center" }),
    );
  });

  it("does not re-fire onLocationChange for equal object literals", async () => {
    const onLocationChange = vi.fn();
    const { rerender } = render(
      <MapEmbed center={{ ...dhaka }} onLocationChange={onLocationChange} />,
    );
    rerender(<MapEmbed center={{ ...dhaka }} onLocationChange={onLocationChange} />);
    await waitFor(() => expect(onLocationChange).toHaveBeenCalledTimes(1));
  });

  it("clamps zoom to the tile provider's range", async () => {
    const { container } = render(<MapEmbed center={dhaka} zoom={42} />);
    await waitForMap(container);
    expect(console.warn).toHaveBeenCalledWith(expect.stringMatching(/Zoom 42 is outside/));
  });

  describe("errors", () => {
    it.each([
      [{ center: { lat: 123, lng: 0 } }, "INVALID_COORDINATES", /Invalid center/],
      [{ location: "200, 10" }, "INVALID_COORDINATES", /outside the valid/],
      [{}, "MISSING_LOCATION", /Provide a `center` or a `location`/],
      [{ location: "Dhaka, Bangladesh" }, "GEOCODER_REQUIRED", /must be geocoded/],
    ])("%j -> %s", async (props, code, message) => {
      const onError = vi.fn();
      const { container } = render(<MapEmbed {...props} onError={onError} />);
      expect(screen.getByRole("alert")).toHaveTextContent(message);
      expect(container.querySelector(".leaflet-container")).toBeNull();
      await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code })));
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("renders a custom errorFallback (node or function)", () => {
      const { rerender } = render(<MapEmbed location="Dhaka" errorFallback={<p>No map</p>} />);
      expect(screen.getByRole("alert")).toHaveTextContent("No map");
      rerender(<MapEmbed location="Dhaka" errorFallback={(e) => <p>Code: {e.code}</p>} />);
      expect(screen.getByRole("alert")).toHaveTextContent("Code: GEOCODER_REQUIRED");
    });

    it("keeps the configured size in the error state", () => {
      render(<MapEmbed height={222} />);
      expect(screen.getByRole("region")).toHaveStyle({ height: "222px" });
    });
  });

  describe("geocoding", () => {
    it("geocodes addresses with the provided geocoder", async () => {
      const geocoder: Geocoder = {
        geocode: vi.fn().mockResolvedValue({ ...dhaka, label: "Dhaka" }),
      };
      const onLocationChange = vi.fn();
      const { container } = render(
        <MapEmbed
          location="Dhaka, Bangladesh"
          geocoder={geocoder}
          onLocationChange={onLocationChange}
        />,
      );
      expect(screen.getByRole("status")).toBeInTheDocument();
      await waitForMap(container);
      expect(geocoder.geocode).toHaveBeenCalledWith(
        "Dhaka, Bangladesh",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(onLocationChange).toHaveBeenCalledWith({
        ...dhaka,
        label: "Dhaka",
        source: "geocoder",
      });
      expect(container.querySelector(".rme-marker")).toHaveAttribute("title", "Dhaka");
    });

    it("does not call the geocoder for coordinates", async () => {
      const geocoder: Geocoder = { geocode: vi.fn() };
      const { container } = render(<MapEmbed location="23.81,90.41" geocoder={geocoder} />);
      await waitForMap(container);
      expect(geocoder.geocode).not.toHaveBeenCalled();
    });

    it("reports GEOCODE_NOT_FOUND", async () => {
      const geocoder: Geocoder = { geocode: vi.fn().mockResolvedValue(null) };
      const onError = vi.fn();
      render(<MapEmbed location="Atlantis" geocoder={geocoder} onError={onError} />);
      expect(await screen.findByRole("alert")).toHaveTextContent('No results found for "Atlantis"');
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "GEOCODE_NOT_FOUND" }));
    });

    it("reports GEOCODE_FAILED for thrown errors and invalid results", async () => {
      const failing: Geocoder = { geocode: vi.fn().mockRejectedValue(new Error("boom")) };
      const { unmount } = render(
        <MapEmbed location="Dhaka" geocoder={failing} errorFallback={(e) => e.code} />,
      );
      expect(await screen.findByRole("alert")).toHaveTextContent("GEOCODE_FAILED");
      unmount();

      const bogus: Geocoder = { geocode: vi.fn().mockResolvedValue({ lat: 999, lng: 0 }) };
      render(<MapEmbed location="Dhaka" geocoder={bogus} errorFallback={(e) => e.code} />);
      expect(await screen.findByRole("alert")).toHaveTextContent("GEOCODE_FAILED");
    });

    it("aborts in-flight geocoding when the location changes", async () => {
      const signals: AbortSignal[] = [];
      const geocoder: Geocoder = {
        geocode: vi.fn((query: string, options?: { signal?: AbortSignal }) => {
          signals.push(options!.signal!);
          return query === "slow" ? new Promise<null>(() => {}) : Promise.resolve(dhaka);
        }),
      };
      const { container, rerender } = render(<MapEmbed location="slow" geocoder={geocoder} />);
      rerender(<MapEmbed location="fast" geocoder={geocoder} />);
      await waitForMap(container);
      expect(signals[0]!.aborted).toBe(true);
    });
  });

  it("uses a custom tile provider and its attribution", async () => {
    const tiles: TileProvider = {
      url: "https://tiles.example.com/{z}/{x}/{y}.png",
      attribution: "© Example Tiles",
      maxZoom: 10,
    };
    const { container } = render(<MapEmbed center={dhaka} tileProvider={tiles} zoom={15} />);
    await waitForMap(container);
    expect(container.querySelector(".leaflet-control-attribution")).toHaveTextContent(
      "© Example Tiles",
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(/Zoom 15 is outside the supported range 0-10/),
    );
  });

  it("defers loading Leaflet until visible when lazy", async () => {
    let trigger: ((entries: Partial<IntersectionObserverEntry>[]) => void) | undefined;
    const observe = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: (entries: Partial<IntersectionObserverEntry>[]) => void) {
          trigger = cb;
        }
        observe = observe;
        disconnect = vi.fn();
      },
    );
    try {
      const { container } = render(<MapEmbed center={dhaka} />);
      await new Promise((r) => setTimeout(r, 20));
      expect(observe).toHaveBeenCalled();
      expect(container.querySelector(".leaflet-container")).toBeNull();
      trigger!([{ isIntersecting: true }]);
      await waitForMap(container);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("cleans up the Leaflet instance on unmount", async () => {
    const { container, unmount } = render(<MapEmbed center={dhaka} />);
    await waitForMap(container);
    const leafletContainer = container.querySelector(".leaflet-container")!;
    unmount();
    expect(leafletContainer.querySelector(".leaflet-pane")).toBeNull();
  });
});
