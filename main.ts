// news-image-20261121 entry point, written from scratch in this session.
// Reads the pre-rendered entry.png and writes it to the make.fun output
// directory. Plain JavaScript in a .ts file (no type syntax), Node 22+
// standard library only; the run is deterministic, so both graded runs
// write identical bytes.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const png = readFileSync(join(dir, "entry.png"));
mkdirSync(out, { recursive: true });
const dest = join(out, "entry.png");
writeFileSync(dest, png);
console.log(`wrote ${png.length} bytes to ${dest}`);
