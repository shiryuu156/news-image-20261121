// news-image-20261121 entry point, written from scratch.
// Copies the pre-rendered entry.png into the make.fun output directory.
// Plain JavaScript in a .ts file (no type syntax), Node 22+ stdlib only.

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const source = join(HERE, "entry.png");
const target = join(outDir, "entry.png");

mkdirSync(outDir, { recursive: true });
copyFileSync(source, target);
console.log("copied entry.png to " + target);
