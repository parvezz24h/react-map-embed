import { createNominatimGeocoder, MapEmbedError } from "../src/core";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const dhaka = [{ lat: "23.8103", lon: "90.4125", display_name: "Dhaka, Bangladesh" }];

describe("createNominatimGeocoder", () => {
  it("queries Nominatim with the documented parameters", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(dhaka));
    const geocoder = createNominatimGeocoder({
      fetch,
      email: "dev@example.com",
      acceptLanguage: "en",
      countryCodes: ["bd"],
      minIntervalMs: 0,
    });

    await expect(geocoder.geocode("Dhaka")).resolves.toEqual({
      lat: 23.8103,
      lng: 90.4125,
      label: "Dhaka, Bangladesh",
    });
    const url = new URL(fetch.mock.calls[0]![0] as string);
    expect(url.origin + url.pathname).toBe("https://nominatim.openstreetmap.org/search");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "Dhaka",
      format: "jsonv2",
      limit: "1",
      email: "dev@example.com",
      "accept-language": "en",
      countrycodes: "bd",
    });
  });

  it("supports a custom endpoint", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(dhaka));
    const geocoder = createNominatimGeocoder({
      fetch,
      endpoint: "https://geo.example.com/search",
      minIntervalMs: 0,
    });
    await geocoder.geocode("Dhaka");
    expect(fetch.mock.calls[0]![0]).toMatch(/^https:\/\/geo\.example\.com\/search\?/);
  });

  it("caches results, case-insensitively", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(dhaka));
    const geocoder = createNominatimGeocoder({ fetch, minIntervalMs: 0 });
    await geocoder.geocode("Dhaka");
    await geocoder.geocode("  dhaka ");
    await Promise.all([geocoder.geocode("DHAKA"), geocoder.geocode("Dhaka")]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns null when nothing matches", async () => {
    const geocoder = createNominatimGeocoder({
      fetch: vi.fn().mockResolvedValue(jsonResponse([])),
      minIntervalMs: 0,
    });
    await expect(geocoder.geocode("nowhere")).resolves.toBeNull();
  });

  it("throws GEOCODE_FAILED on HTTP and network errors", async () => {
    const httpError = createNominatimGeocoder({
      fetch: vi.fn().mockResolvedValue(jsonResponse({}, 429)),
      minIntervalMs: 0,
    });
    await expect(httpError.geocode("x")).rejects.toMatchObject({ code: "GEOCODE_FAILED" });

    const network = createNominatimGeocoder({
      fetch: vi.fn().mockRejectedValue(new TypeError("offline")),
      minIntervalMs: 0,
    });
    const error = await network.geocode("x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MapEmbedError);
    expect(error).toMatchObject({ code: "GEOCODE_FAILED" });
  });

  it("does not cache failures", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse(dhaka));
    const geocoder = createNominatimGeocoder({ fetch, minIntervalMs: 0 });
    await expect(geocoder.geocode("Dhaka")).rejects.toBeTruthy();
    await expect(geocoder.geocode("Dhaka")).resolves.toMatchObject({ lat: 23.8103 });
  });

  it("spaces requests by minIntervalMs (1 req/s by default)", async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(dhaka)));
      const geocoder = createNominatimGeocoder({ fetch });
      const first = geocoder.geocode("a");
      const second = geocoder.geocode("b");
      await vi.advanceTimersByTimeAsync(0);
      expect(fetch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(999);
      expect(fetch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetch).toHaveBeenCalledTimes(2);
      await Promise.all([first, second]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("honours abort signals while waiting for the rate limit", async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(dhaka)));
      const geocoder = createNominatimGeocoder({ fetch });
      await geocoder.geocode("a").then(
        () => undefined,
        () => undefined,
      );
      const controller = new AbortController();
      const pending = geocoder.geocode("b", { signal: controller.signal });
      controller.abort();
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
