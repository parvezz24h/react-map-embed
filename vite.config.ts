/// <reference types="vitest/config" />
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const external = [/^react($|\/)/, /^react-dom($|\/)/, /^leaflet($|\/)/];

// Only the component entry is a client module; `core` and `google` stay server-compatible.
const banner = (chunk: { name: string; isEntry: boolean }) =>
  chunk.isEntry && chunk.name === "index" ? '"use client";' : "";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    sourcemap: true,
    minify: false,
    emptyOutDir: false,
    cssCodeSplit: true,
    lib: {
      cssFileName: "styles",
      entry: {
        index: resolve(import.meta.dirname, "src/index.ts"),
        core: resolve(import.meta.dirname, "src/core.ts"),
        google: resolve(import.meta.dirname, "src/google.ts"),
        styles: resolve(import.meta.dirname, "src/styles.css"),
      },
    },
    rollupOptions: {
      external,
      output: [
        {
          format: "es",
          entryFileNames: "[name].js",
          chunkFileNames: "chunks/[name]-[hash].js",
          banner,
        },
        {
          format: "cjs",
          entryFileNames: "cjs/[name].js",
          chunkFileNames: "cjs/chunks/[name]-[hash].js",
          exports: "named",
          banner,
        },
      ],
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/dist/**"],
  },
});
