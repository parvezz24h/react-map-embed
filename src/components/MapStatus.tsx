import type { CSSProperties, ReactNode } from "react";

// Inline essentials so the placeholder keeps its size and position even without the stylesheet.
const overlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  textAlign: "center",
  boxSizing: "border-box",
};

export function MapStatus({ kind, children }: { kind: "loading" | "error"; children: ReactNode }) {
  return (
    <div
      className={`rme-status rme-${kind}`}
      style={overlayStyle}
      {...(kind === "error"
        ? { role: "alert" }
        : { role: "status", "aria-live": "polite" as const })}
    >
      {children}
    </div>
  );
}
