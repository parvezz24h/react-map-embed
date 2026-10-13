import type { Metadata } from "next";
import type { ReactNode } from "react";
// Leaflet + react-map-embed styles. Import once, in a layout or the root of your app.
import "react-map-embed/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "react-map-embed · Next.js example",
  description: "Keyless interactive maps in the Next.js App Router",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
