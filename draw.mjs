// news-image-20261121 — fresh pixel renderer, written from scratch.
// Draws a 1024x1024 front-page image for Saturday 21 November 2026.
// Pure Node stdlib: a built-in 5x7 bitmap font plus a hand-rolled PNG
// encoder. No network, no timestamps, no randomness — same bytes every run.

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const INK = {
  paper: [247, 242, 230],
  navy: [15, 27, 63],
  navySoft: [24, 40, 84],
  crimson: [178, 34, 34],
  scarlet: [196, 30, 30],
  gold: [212, 175, 55],
  black: [12, 12, 12],
  grey: [90, 86, 78],
  faint: [205, 198, 184],
  white: [255, 255, 255],
  blue: [30, 64, 175],
  teal: [13, 116, 110],
  tealDark: [10, 68, 68],
  rust: [176, 58, 32],
  slate: [100, 104, 112],
  dark: [18, 18, 18],
  green: [34, 120, 60],
};

// ------------------------------------------------------- 5x7 letterforms
// Each glyph is 7 rows of 5 cells; '#' is a filled cell.
const GLYPHS = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "...#.", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".....", "..#.."],
  ",": [".....", ".....", ".....", ".....", ".....", "..#..", ".#..."],
  "'": ["..#..", "..#..", ".....", ".....", ".....", ".....", "....."],
  '"': [".#.#.", ".#.#.", ".....", ".....", ".....", ".....", "....."],
  ":": [".....", "..#..", ".....", ".....", ".....", "..#..", "....."],
  ";": [".....", "..#..", ".....", ".....", ".....", "..#..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  $: ["..#..", ".####", "#.#.#", ".###.", "..#.#", "####.", "..#.."],
  "%": ["##..#", "##.#.", "....#", "...#.", "..#..", ".#...", "#..##"],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "(": ["...##", "..#..", ".#...", ".#...", ".#...", "..#..", "...##"],
  ")": ["##...", "..#..", "...#.", "...#.", "...#.", "..#..", "##..."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "&": [".##..", "#..#.", "#..#.", ".#...", "#.#.#", "#..#.", ".##.#"],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  "_": [".....", ".....", ".....", ".....", ".....", ".....", "#####"],
  "|": ["..#..", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
};

// ---------------------------------------------------------------- canvas
const px = new Uint8Array(W * H * 3);

function put(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function fill(x, y, w, h, c) {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) put(xx, yy, c);
  }
}

function frame(x, y, w, h, c, t = 3) {
  fill(x, y, w, t, c);
  fill(x, y + h - t, w, t, c);
  fill(x, y, t, h, c);
  fill(x + w - t, y, t, h, c);
}

function disc(cx, cy, r, c) {
  for (let yy = -r; yy <= r; yy++) {
    for (let xx = -r; xx <= r; xx++) {
      if (xx * xx + yy * yy <= r * r) put(cx + xx, cy + yy, c);
    }
  }
}

function ring(cx, cy, r, thick, c) {
  const half = thick / 2;
  for (let yy = -r - 2; yy <= r + 2; yy++) {
    for (let xx = -r - 2; xx <= r + 2; xx++) {
      const d = Math.sqrt(xx * xx + yy * yy);
      if (Math.abs(d - r) <= half) put(cx + xx, cy + yy, c);
    }
  }
}

function line(x0, y0, x1, y1, c) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let s = 0; s <= steps; s++) {
    put(Math.round(x0 + (dx * s) / steps), Math.round(y0 + (dy * s) / steps), c);
  }
}

function tri(x0, y0, x1, y1, x2, y2, c) {
  const minX = Math.min(x0, x1, x2);
  const maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2);
  const maxY = Math.max(y0, y1, y2);
  const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
      const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
      const cc = 1 - a - b;
      if (a >= 0 && b >= 0 && cc >= 0) put(x, y, c);
    }
  }
}

// ------------------------------------------------------------------ text
function glyphFor(ch) {
  return GLYPHS[ch] ?? GLYPHS[" "];
}

function measure(text, s) {
  if (!text) return 0;
  return text.length * 6 * s - s;
}

function drawGlyph(ch, x, y, s, c) {
  const rows = glyphFor(ch);
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (rows[r][col] === "#") fill(x + col * s, y + r * s, s, s, c);
    }
  }
}

function drawText(text, x, y, s, c) {
  const upper = String(text).toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    drawGlyph(upper[i], x + i * 6 * s, y, s, c);
  }
}

function drawCentred(text, cx, y, s, c) {
  drawText(text, cx - Math.floor(measure(text, s) / 2), y, s, c);
}

function wrapLines(text, maxW, s) {
  const words = String(text).toUpperCase().split(/\s+/).filter(Boolean);
  const out = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (measure(trial, s) <= maxW || !cur) {
      cur = trial;
    } else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function drawPara(text, x, y, maxW, s, leading, c) {
  const lines = wrapLines(text, maxW, s);
  lines.forEach((ln, i) => drawText(ln, x, y + i * leading, s, c));
  return lines.length;
}

// ------------------------------------------------------------- masthead
function drawMasthead() {
  fill(0, 0, W, 112, INK.navy);
  drawCentred("THE WORLD IN ONE DAY", W / 2, 24, 7, INK.white);
  drawCentred("SATURDAY 21 NOVEMBER 2026", W / 2, 82, 3, INK.gold);
  fill(0, 112, W, 6, INK.crimson);
}

// ------------------------------------------------- lead + wanted poster
function starBadge(cx, cy, r, c) {
  // five-point star made of triangles around a centre disc
  for (let k = 0; k < 5; k++) {
    const a1 = (-Math.PI / 2 + (k * 2 * Math.PI) / 5);
    const a2 = (-Math.PI / 2 + ((k + 0.5) * 2 * Math.PI) / 5);
    const a3 = (-Math.PI / 2 + ((k + 1) * 2 * Math.PI) / 5);
    tri(
      Math.round(cx + r * Math.cos(a1)), Math.round(cy + r * Math.sin(a1)),
      Math.round(cx + r * 0.42 * Math.cos(a2)), Math.round(cy + r * 0.42 * Math.sin(a2)),
      Math.round(cx + r * Math.cos(a3)), Math.round(cy + r * Math.sin(a3)),
      c
    );
  }
  disc(cx, cy, Math.round(r * 0.42), c);
}

function drawWantedPoster(x, y, w) {
  const headerH = 34;
  const bodyH = 190;
  const footH = 48;
  fill(x, y, w, headerH, INK.scarlet);
  drawCentred("FBI TOP 10 MOST WANTED", x + Math.floor(w / 2), y + 8, 2, INK.white);
  fill(x, y + headerH, w, bodyH, INK.white);
  frame(x, y, w, headerH + bodyH, INK.scarlet, 3);
  starBadge(x + 52, y + headerH + 46, 26, INK.gold);
  ring(x + 52, y + headerH + 46, 32, 3, INK.gold);
  drawText("FAUSTO ISIDRO", x + 96, y + headerH + 22, 3, INK.black);
  drawText("MEZA FLORES", x + 96, y + headerH + 48, 3, INK.black);
  drawText("CAPTURED IN GUASAVE,", x + 20, y + headerH + 100, 2, INK.black);
  drawText("SINALOA, OVERNIGHT", x + 20, y + headerH + 124, 2, INK.black);
  drawText("WITH US INTEL HELP", x + 20, y + headerH + 148, 2, INK.crimson);
  fill(x, y + headerH + bodyH, w, footH, INK.navy);
  drawCentred("CAPTURED - NOVEMBER 21", x + Math.floor(w / 2), y + headerH + bodyH + 14, 2, INK.gold);
}

function drawLead() {
  const lx = 32;
  const lw = 560;
  drawText("MEXICO - THE DAY'S TOP STORY", lx, 132, 2, INK.crimson);
  drawText("MEXICO CAPTURES", lx, 160, 4, INK.black);
  drawText('"EL CHAPO ISIDRO"', lx, 196, 4, INK.black);
  drawPara(
    "MEXICAN FORCES CAPTURE FAUSTO ISIDRO MEZA FLORES, A BELTRAN LEYVA " +
      "CARTEL BOSS AND ONE OF THE FBI'S 10 MOST WANTED, IN GUASAVE, " +
      "SINALOA, WITH HELP FROM US INTELLIGENCE.",
    lx, 248, lw, 2, 20, INK.black
  );
  drawText('"EL CHAPO ISIDRO" - FBI TOP 10', lx, 352, 2, INK.crimson);
  fill(lx, 382, lw, 2, INK.faint);
  drawText("AP / REUTERS | CAPTURED OVERNIGHT", lx, 392, 2, INK.grey);

  drawWantedPoster(620, 130, 372);
}

// ------------------------------------------------------------ story boxes
function missileIcon(cx, cy) {
  // a missile nose-up with a smoke trail
  tri(cx, cy - 26, cx - 8, cy - 4, cx + 8, cy - 4, INK.blue);
  fill(cx - 6, cy - 4, 12, 22, INK.blue);
  tri(cx - 6, cy + 18, cx - 14, cy + 26, cx - 6, cy + 22, INK.blue);
  tri(cx + 6, cy + 18, cx + 14, cy + 26, cx + 6, cy + 22, INK.blue);
  line(cx - 16, cy + 30, cx + 16, cy + 30, INK.slate);
}

function leafIcon(cx, cy) {
  disc(cx, cy, 18, INK.green);
  disc(cx - 4, cy - 3, 9, INK.white);
  line(cx, cy + 14, cx + 14, cy + 26, INK.green);
}

function chartIcon(cx, cy) {
  fill(cx - 22, cy + 2, 10, 18, INK.rust);
  fill(cx - 8, cy - 8, 10, 28, INK.rust);
  fill(cx + 6, cy - 18, 10, 38, INK.rust);
  line(cx - 26, cy - 24, cx + 22, cy - 24, INK.slate);
}

function crescentIcon(cx, cy) {
  disc(cx, cy, 18, INK.crimson);
  disc(cx + 8, cy - 4, 15, INK.white);
}

function drawStoryBox(x, y, w, h, border, kicker, kickerColor, lines, body, icon) {
  fill(x, y, w, h, INK.white);
  frame(x, y, w, h, border, 3);
  const pad = 16;
  drawText(kicker, x + pad, y + 14, 2, kickerColor);
  lines.forEach((ln, i) => drawText(ln, x + pad, y + 40 + i * 24, 3, INK.black));
  drawPara(body, x + pad, y + 96, w - pad * 2, 2, 20, INK.black);
  if (icon) icon(x + w - 52, y + 36);
}

function drawGrid() {
  const bw = 464;
  const bh = 188;
  drawStoryBox(
    32, 424, bw, bh, INK.blue, "WAR", INK.blue,
    ["RUSSIAN STRIKE HITS", "ZELENSKYY'S HOMETOWN"],
    "BALLISTIC MISSILES HIT KRYVYI RIH ON FRIDAY NIGHT: 2 KILLED, 60 " +
      "WOUNDED IN A DOUBLE-TAP ATTACK, INCLUDING 6 CHILDREN.",
    missileIcon
  );
  drawStoryBox(
    528, 424, bw, bh, INK.teal, "CLIMATE", INK.teal,
    ["COP31 TALKS RUN", "INTO OVERTIME"],
    "THE ANTALYA SUMMIT OVERRUNS ITS FRIDAY DEADLINE WITH NO DEAL YET; " +
      "FOSSIL FUELS ARE MISSING FROM THE DRAFT TEXT.",
    leafIcon
  );
  drawStoryBox(
    32, 628, bw, bh, INK.rust, "MARKETS", INK.rust,
    ["AI SELL-OFF SINKS", "WORLD MARKETS"],
    "S&P 500 FALLS 3.7% AND NASDAQ 5.3% AS AI FEARS SPREAD; JAPAN'S " +
      "NIKKEI DOWN 5.06% IN A BRUISING FRIDAY.",
    chartIcon
  );
  drawStoryBox(
    528, 628, bw, bh, INK.crimson, "IRAN", INK.crimson,
    ["TRUMP WEIGHS NEW", "IRAN STRIKES"],
    "THE US WEIGHS ANOTHER ROUND OF STRIKES AS ISRAEL PRESSES FOR ACTION; " +
      "THE DECISION MAY WAIT UNTIL 2027.",
    crescentIcon
  );
}

// ------------------------------------------------- diplomacy + ticker
function drawDiplomacy() {
  fill(32, 832, 960, 76, INK.tealDark);
  disc(56, 870, 10, INK.gold);
  drawText("DIPLOMACY - TRUMP TELLS EUROPE TO DEFUND UKRAINE", 78, 846, 3, INK.white);
  drawText(
    "AFTER HIS PUTIN SUMMIT, TRUMP TELLS EUROPE TO STOP FUNDING UKRAINE.",
    78, 880, 2, [214, 226, 224]
  );
}

function drawTicker() {
  fill(0, 924, W, 100, INK.dark);
  drawCentred(
    "ANTHROPIC DEBUTS AT $2TN  |  BEPICOLOMBO REACHES MERCURY ORBIT",
    W / 2, 940, 2, INK.white
  );
  drawCentred(
    "PERU QUAKE 6.7  |  BRAZIL DENGUE CUT 69%  |  UK-EU RESET DEAL",
    W / 2, 972, 2, INK.white
  );
}

// ------------------------------------------------------------- PNG writer
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng() {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ main
fill(0, 0, W, H, INK.paper);
drawMasthead();
drawLead();
drawGrid();
drawDiplomacy();
drawTicker();

writeFileSync(join(HERE, "entry.png"), encodePng());
console.log("wrote entry.png", W + "x" + H);
