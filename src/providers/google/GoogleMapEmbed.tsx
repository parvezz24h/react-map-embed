import type { CSSProperties } from "react";
import { MapStatus } from "../../components/MapStatus.js";
import type { BaseMapProps } from "../../types/index.js";
import { toErrorInfo } from "../../utils/errors.js";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, toCssSize } from "../../utils/validation.js";
import { buildGoogleEmbedUrl } from "./embedUrl.js";
import type { GoogleEmbedUrlOptions } from "./embedUrl.js";

export interface GoogleMapEmbedProps
  extends
    Omit<BaseMapProps, "loading" | "onError">,
    Pick<GoogleEmbedUrlOptions, "apiKey" | "mapType" | "language" | "region"> {}

/**
 * Google Maps via the official Maps Embed API (an `<iframe>`).
 *
 * Requires your own API key, which is visible in the page by design —
 * restrict it to your HTTP referrers and to the Maps Embed API in Google Cloud Console.
 * Contains no hooks, so it can render as a React Server Component.
 */
export function GoogleMapEmbed({
  apiKey,
  location,
  center,
  zoom,
  height,
  width,
  className,
  style,
  showMarker = true,
  interactive = true,
  title = "Map",
  errorFallback,
  mapType,
  language,
  region,
}: GoogleMapEmbedProps) {
  const rootStyle: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    ...style,
    width: toCssSize(width, DEFAULT_WIDTH),
    height: toCssSize(height, DEFAULT_HEIGHT),
  };
  const rootClass = ["rme-root", className].filter(Boolean).join(" ");

  let src: string;
  try {
    src = buildGoogleEmbedUrl({
      apiKey,
      location,
      center,
      zoom,
      showMarker,
      mapType,
      language,
      region,
    });
  } catch (error) {
    const info = toErrorInfo(error);
    return (
      <div
        className={rootClass}
        style={rootStyle}
        role="region"
        aria-label={title}
        data-state="error"
      >
        <MapStatus kind="error">
          {typeof errorFallback === "function"
            ? errorFallback(info)
            : (errorFallback ?? info.message.replace(/^\[react-map-embed\]\s*/, ""))}
        </MapStatus>
      </div>
    );
  }

  return (
    <div
      className={rootClass}
      style={rootStyle}
      role="region"
      aria-label={title}
      data-state="ready"
    >
      <iframe
        src={src}
        title={title}
        width="100%"
        height="100%"
        style={{ border: 0, display: "block", pointerEvents: interactive ? undefined : "none" }}
        loading="lazy"
        allowFullScreen
        // Google recommends this policy so HTTP-referrer key restrictions keep working.
        referrerPolicy="no-referrer-when-downgrade"
        {...(!interactive && { tabIndex: -1 })}
      />
    </div>
  );
}
