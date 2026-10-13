import {
  isValidLatLng,
  normalizeZoom,
  parseCoordinateString,
  parseLocation,
  toCssSize,
} from "../src/core";

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("isValidLatLng", () => {
  it.each([
    [{ lat: 23.8103, lng: 90.4125 }],
    [{ lat: -90, lng: -180 }],
    [{ lat: 90, lng: 180 }],
    [{ lat: 0, lng: 0 }],
  ])("accepts %j", (value) => expect(isValidLatLng(value)).toBe(true));

  it.each([
    [{ lat: 91, lng: 0 }],
    [{ lat: 0, lng: 180.0001 }],
    [{ lat: NaN, lng: 0 }],
    [{ lat: Infinity, lng: 0 }],
    [{ lat: "23", lng: "90" }],
    [{ lat: 1 }],
    [null],
    [undefined],
    [[23, 90]],
  ])("rejects %j", (value) => expect(isValidLatLng(value)).toBe(false));
});

describe("parseCoordinateString", () => {
  it("parses comma, semicolon and whitespace separated pairs", () => {
    expect(parseCoordinateString("23.8103, 90.4125")).toEqual({ lat: 23.8103, lng: 90.4125 });
    expect(parseCoordinateString(" -33.86;151.21 ")).toEqual({ lat: -33.86, lng: 151.21 });
    expect(parseCoordinateString("51.5 -0.12")).toEqual({ lat: 51.5, lng: -0.12 });
  });

  it("returns null for addresses and out-of-range pairs", () => {
    expect(parseCoordinateString("Dhaka, Bangladesh")).toBeNull();
    expect(parseCoordinateString("100, 20")).toBeNull();
    expect(parseCoordinateString("")).toBeNull();
  });
});

describe("parseLocation", () => {
  it("classifies coordinates, tuples, queries and empty input", () => {
    expect(parseLocation({ lat: 1, lng: 2 })).toEqual({
      kind: "coordinates",
      value: { lat: 1, lng: 2 },
    });
    expect(parseLocation([1, 2])).toEqual({ kind: "coordinates", value: { lat: 1, lng: 2 } });
    expect(parseLocation("1,2")).toEqual({ kind: "coordinates", value: { lat: 1, lng: 2 } });
    expect(parseLocation("  Dhaka, Bangladesh ")).toEqual({
      kind: "query",
      value: "Dhaka, Bangladesh",
    });
    expect(parseLocation(undefined)).toEqual({ kind: "empty" });
    expect(parseLocation("   ")).toEqual({ kind: "empty" });
  });

  it("flags out-of-range coordinates instead of geocoding them", () => {
    expect(parseLocation("95, 10").kind).toBe("invalid");
    expect(parseLocation({ lat: 0, lng: 200 }).kind).toBe("invalid");
    expect(parseLocation([NaN, 1]).kind).toBe("invalid");
  });
});

describe("normalizeZoom", () => {
  it("defaults to 13", () => expect(normalizeZoom(undefined)).toBe(13));
  it("keeps valid values, including fractional zoom", () => {
    expect(normalizeZoom(0)).toBe(0);
    expect(normalizeZoom(12.5)).toBe(12.5);
  });
  it("clamps out-of-range values and warns", () => {
    expect(normalizeZoom(25, 0, 19)).toBe(19);
    expect(normalizeZoom(-2, 0, 19)).toBe(0);
    expect(console.warn).toHaveBeenCalled();
  });
  it("falls back to the default for non-numeric values", () => {
    expect(normalizeZoom(NaN)).toBe(13);
    expect(normalizeZoom("5" as unknown)).toBe(13);
  });
  it("keeps the default inside a narrow provider range", () =>
    expect(normalizeZoom(undefined, 0, 10)).toBe(10));
});

describe("toCssSize", () => {
  it("converts numbers to pixels and passes strings through", () => {
    expect(toCssSize(400, 0)).toBe("400px");
    expect(toCssSize("50vh", 0)).toBe("50vh");
    expect(toCssSize(undefined, "100%")).toBe("100%");
    expect(toCssSize(undefined, 300)).toBe("300px");
  });
  it("falls back for invalid values", () => {
    expect(toCssSize(-10, 400)).toBe("400px");
    expect(toCssSize(NaN, "100%")).toBe("100%");
    expect(toCssSize("  ", 400)).toBe("400px");
  });
});
