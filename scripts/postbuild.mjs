// Mirror declarations into dist/cjs so CommonJS consumers get CJS-flavoured types,
// and mark that folder as CommonJS for Node's resolver.
import { cpSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;
const cjs = join(dist, "cjs");

function copyDeclarations(from, to) {
  for (const entry of readdirSync(from)) {
    if (from === dist && (entry === "cjs" || entry === "chunks")) continue;
    const source = join(from, entry);
    if (statSync(source).isDirectory()) copyDeclarations(source, join(to, entry));
    else if (entry.endsWith(".d.ts")) cpSync(source, join(to, entry), { recursive: true });
  }
}

copyDeclarations(dist, cjs);
writeFileSync(join(cjs, "package.json"), JSON.stringify({ type: "commonjs" }, null, 2) + "\n");
console.log("postbuild: declarations mirrored to dist/cjs");
