// news-image-20261121 — pixel renderer, written from scratch in this session.
// Renders a 1024x1024 front-page image for Saturday 21 November 2026.
// Node 22 stdlib only: a 5x7 bitmap font, a tiny raster canvas, and a
// hand-rolled PNG encoder. No network, no clock, no randomness, so every
// run produces the same bytes.

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 1024;
const H = 1024;

// ------------------------------------------------------------ colours
// Palette entries are hex strings; C() turns one into an [r, g, b] triple.
function C(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
const INK = {
  paper: C("#f7f2e6"),
  navy: C("#0f1b3f"),
  crimson: C("#b22222"),
  scarlet: C("#c41e1e"),
  gold: C("#d4af37"),
  black: C("#0c0c0c"),
  grey: C("#5a564e"),
  faint: C("#cdc6b8"),
  white: C("#ffffff"),
  blue: C("#1e40af"),
  teal: C("#0d746e"),
  tealDark: C("#0a4444"),
  rust: C("#b03a20"),
  slate: C("#646870"),
  dark: C("#121212"),
  green: C("#22783c"),
  paleGreen: C("#d6e2e0"),
};

// ------------------------------------------------------- 5x7 letterforms
// Each glyph is 7 rows of 5 cells; '#' is a filled cell.
const GLYPHS = {
  A: [".###.", "#...#", "#...#", "#####",
      "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.",
      "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....",
      "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#",
      "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.",
      "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.",
      "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###",
      "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####",
      "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..",
      "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.",
      "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...",
      "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....",
      "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#",
      "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#",
      "#..##", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#",
      "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.",
      "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#",
      "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.",
      "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.",
      "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..",
      "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#",
      "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#",
      "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#",
      "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..",
      ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..",
      "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..",
      ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#",
        "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..",
        "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.",
        "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.",
        "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.",
        "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#",
        "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.",
        "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "...#.",
        "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.",
        "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####",
        "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....",
       ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....",
       ".....", ".....", "..#.."],
  ",": [".....", ".....", ".....", ".....",
       ".....", "..#..", ".#..."],
  "'": ["..#..", "..#..", ".....", ".....",
       ".....", ".....", "....."],
  '"': [".#.#.", ".#.#.", ".....", ".....",
       ".....", ".....", "....."],
  ":": [".....", "..#..", ".....", ".....",
       ".....", "..#..", "....."],
  ";": [".....", "..#..", ".....", ".....",
       ".....", "..#..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..",
       "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.",
       "..#..", ".....", "..#.."],
  $: ["..#..", ".####", "#.#.#", ".###.",
      "..#.#", "####.", "..#.."],
  "%": ["##..#", "##.#.", "....#", "...#.",
       "..#..", ".#...", "#..##"],
  "-": [".....", ".....", ".....", "#####",
       ".....", ".....", "....."],
  "(": ["...##", "..#..", ".#...", ".#...",
       ".#...", "..#..", "...##"],
  ")": ["##...", "..#..", "...#.", "...#.",
       "...#.", "..#..", "##..."],
  "/": ["....#", "....#", "...#.", "..#..",
       ".#...", "#....", "#...."],
  "&": [".##..", "#..#.", "#..#.", ".#...",
       "#.#.#", "#..#.", ".##.#"],
  "+": [".....", "..#..", "..#..", "#####",
       "..#..", "..#..", "....."],
  "=": [".....", ".....", "#####", ".....",
       "#####", ".....", "....."],
  "_": [".....", ".....", ".....", ".....",
       ".....", ".....", "#####"],
  "|": ["..#..", "..#..", "..#..", "..#..",
       "..#..", "..#..", "..#.."],
};

function glyphRows(ch) {
  const rows = GLYPHS[ch] ?? GLYPHS[" "];
  if (rows.length !== 7) throw new Error("bad glyph " + JSON.stringify(ch));
  return rows;
}

// ---------------------------------------------------------------- canvas
const px = new Uint8Array(W * H * 3);

function set(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function rect(x, y, w, h, c) {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) set(xx, yy, c);
  }
}

function box(x, y, w, h, c, t = 3) {
  rect(x, y, w, t, c);
  rect(x, y + h - t, w, t, c);
  rect(x, y, t, h, c);
  rect(x + w - t, y, t, h, c);
}

function circle(cx, cy, r, c) {
  for (let yy = -r; yy <= r; yy++) {
    for (let xx = -r; xx <= r; xx++) {
      if (xx * xx + yy * yy <= r * r) set(cx + xx, cy + yy, c);
    }
  }
}

function outline(cx, cy, r, thick, c) {
  const half = thick / 2;
  for (let yy = -r - 2; yy <= r + 2; yy++) {
    for (let xx = -r - 2; xx <= r + 2; xx++) {
      const d = Math.sqrt(xx * xx + yy * yy);
      if (Math.abs(d - r) <= half) set(cx + xx, cy + yy, c);
    }
  }
}

function seg(x0, y0, x1, y1, c) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let s = 0; s <= steps; s++) {
    set(Math.round(x0 + (dx * s) / steps), Math.round(y0 + (dy * s) / steps), c);
  }
}

function fillTri(x0, y0, x1, y1, x2, y2, c) {
  const minX = Math.min(x0, x1, x2);
  const maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2);
  const maxY = Math.max(y0, y1, y2);
  const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
      const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
      if (a >= 0 && b >= 0 && 1 - a - b >= 0) set(x, y, c);
    }
  }
}

// ------------------------------------------------------------------ text
function tw(text, s) {
  return text ? text.length * 6 * s - s : 0;
}

function str(text, x, y, s, c) {
  const upper = String(text).toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const rows = glyphRows(upper[i]);
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (rows[r][col] === "#") rect(x + i * 6 * s + col * s, y + r * s, s, s, c);
      }
    }
  }
}

function centre(text, cx, y, s, c) {
  str(text, cx - Math.floor(tw(text, s) / 2), y, s, c);
}

function wrap(text, maxW, s) {
  const words = String(text).toUpperCase().split(/\s+/).filter(Boolean);
  const out = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (tw(trial, s) <= maxW || !cur) cur = trial;
    else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function para(text, x, y, maxW, s, leading, c) {
  const lines = wrap(text, maxW, s);
  lines.forEach((ln, i) => str(ln, x, y + i * leading, s, c));
  return lines.length;
}

// ------------------------------------------------------------- masthead
function masthead() {
  rect(0, 0, W, 112, INK.navy);
  centre("THE WORLD IN ONE DAY", W / 2, 24, 7, INK.white);
  centre("SATURDAY 21 NOVEMBER 2026", W / 2, 82, 3, INK.gold);
  rect(0, 112, W, 6, INK.crimson);
}

// ------------------------------------------------- lead + wanted poster
function star(cx, cy, r, c) {
  // five-point star: triangles around a centre disc
  for (let k = 0; k < 5; k++) {
    const a1 = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    const a2 = -Math.PI / 2 + ((k + 0.5) * 2 * Math.PI) / 5;
    const a3 = -Math.PI / 2 + ((k + 1) * 2 * Math.PI) / 5;
    fillTri(
      Math.round(cx + r * Math.cos(a1)), Math.round(cy + r * Math.sin(a1)),
      Math.round(cx + r * 0.42 * Math.cos(a2)), Math.round(cy + r * 0.42 * Math.sin(a2)),
      Math.round(cx + r * Math.cos(a3)), Math.round(cy + r * Math.sin(a3)),
      c
    );
  }
  circle(cx, cy, Math.round(r * 0.42), c);
}

function poster(x, y, w) {
  const headH = 34;
  const bodyH = 190;
  const footH = 48;
  rect(x, y, w, headH, INK.scarlet);
  centre("FBI TOP 10 MOST WANTED", x + Math.floor(w / 2), y + 8, 2, INK.white);
  rect(x, y + headH, w, bodyH, INK.white);
  box(x, y, w, headH + bodyH, INK.scarlet, 3);
  star(x + 52, y + headH + 46, 26, INK.gold);
  outline(x + 52, y + headH + 46, 32, 3, INK.gold);
  str("FAUSTO ISIDRO", x + 96, y + headH + 22, 3, INK.black);
  str("MEZA FLORES", x + 96, y + headH + 48, 3, INK.black);
  str("CAPTURED IN GUASAVE,", x + 20, y + headH + 100, 2, INK.black);
  str("SINALOA, OVERNIGHT", x + 20, y + headH + 124, 2, INK.black);
  str("WITH US INTEL HELP", x + 20, y + headH + 148, 2, INK.crimson);
  rect(x, y + headH + bodyH, w, footH, INK.navy);
  centre("CAPTURED - NOVEMBER 21", x + Math.floor(w / 2), y + headH + bodyH + 14, 2, INK.gold);
}

function lead() {
  const lx = 32;
  const lw = 560;
  str("MEXICO - THE DAY'S TOP STORY", lx, 132, 2, INK.crimson);
  str("MEXICO CAPTURES", lx, 160, 4, INK.black);
  str('"EL CHAPO ISIDRO"', lx, 196, 4, INK.black);
  para(
    "MEXICAN FORCES CAPTURE FAUSTO ISIDRO MEZA FLORES, A BELTRAN LEYVA " +
      "CARTEL BOSS AND ONE OF THE FBI'S 10 MOST WANTED, IN GUASAVE, " +
      "SINALOA, WITH HELP FROM US INTELLIGENCE.",
    lx, 248, lw, 2, 20, INK.black
  );
  str('"EL CHAPO ISIDRO" - FBI TOP 10', lx, 352, 2, INK.crimson);
  rect(lx, 382, lw, 2, INK.faint);
  str("AP / REUTERS | CAPTURED OVERNIGHT", lx, 392, 2, INK.grey);
  poster(620, 130, 372);
}

// ------------------------------------------------------------ story grid
function missile(cx, cy) {
  fillTri(cx, cy - 26, cx - 8, cy - 4, cx + 8, cy - 4, INK.blue);
  rect(cx - 6, cy - 4, 12, 22, INK.blue);
  fillTri(cx - 6, cy + 18, cx - 14, cy + 26, cx - 6, cy + 22, INK.blue);
  fillTri(cx + 6, cy + 18, cx + 14, cy + 26, cx + 6, cy + 22, INK.blue);
  seg(cx - 16, cy + 30, cx + 16, cy + 30, INK.slate);
}

function leaf(cx, cy) {
  circle(cx, cy, 18, INK.green);
  circle(cx - 4, cy - 3, 9, INK.white);
  seg(cx, cy + 14, cx + 14, cy + 26, INK.green);
}

function bars(cx, cy) {
  rect(cx - 22, cy + 2, 10, 18, INK.rust);
  rect(cx - 8, cy - 8, 10, 28, INK.rust);
  rect(cx + 6, cy - 18, 10, 38, INK.rust);
  seg(cx - 26, cy - 24, cx + 22, cy - 24, INK.slate);
}

function moon(cx, cy) {
  circle(cx, cy, 18, INK.crimson);
  circle(cx + 8, cy - 4, 15, INK.white);
}

const STORIES = [
  {
    x: 32, y: 424, border: INK.blue, kicker: "WAR", kc: INK.blue,
    head: ["RUSSIAN STRIKE HITS", "ZELENSKYY'S HOMETOWN"],
    body: "BALLISTIC MISSILES HIT KRYVYI RIH ON FRIDAY NIGHT: 2 KILLED, 60 " +
      "WOUNDED IN A DOUBLE-TAP ATTACK, INCLUDING 6 CHILDREN.",
    icon: missile,
  },
  {
    x: 528, y: 424, border: INK.teal, kicker: "CLIMATE", kc: INK.teal,
    head: ["COP31 TALKS RUN", "INTO OVERTIME"],
    body: "THE ANTALYA SUMMIT OVERRUNS ITS FRIDAY DEADLINE WITH NO DEAL YET; " +
      "FOSSIL FUELS ARE MISSING FROM THE DRAFT TEXT.",
    icon: leaf,
  },
  {
    x: 32, y: 628, border: INK.rust, kicker: "MARKETS", kc: INK.rust,
    head: ["AI SELL-OFF SINKS", "WORLD MARKETS"],
    body: "S&P 500 FALLS 3.7% AND NASDAQ 5.3% AS AI FEARS SPREAD; JAPAN'S " +
      "NIKKEI DOWN 5.06% IN A BRUISING FRIDAY.",
    icon: bars,
  },
  {
    x: 528, y: 628, border: INK.crimson, kicker: "IRAN", kc: INK.crimson,
    head: ["TRUMP WEIGHS NEW", "IRAN STRIKES"],
    body: "THE US WEIGHS ANOTHER ROUND OF STRIKES AS ISRAEL PRESSES FOR ACTION; " +
      "THE DECISION MAY WAIT UNTIL 2027.",
    icon: moon,
  },
];

function storyBox(s) {
  const w = 464;
  const h = 188;
  const pad = 16;
  rect(s.x, s.y, w, h, INK.white);
  box(s.x, s.y, w, h, s.border, 3);
  str(s.kicker, s.x + pad, s.y + 14, 2, s.kc);
  s.head.forEach((ln, i) => str(ln, s.x + pad, s.y + 40 + i * 24, 3, INK.black));
  para(s.body, s.x + pad, s.y + 96, w - pad * 2, 2, 20, INK.black);
  s.icon(s.x + w - 52, s.y + 36);
}

function grid() {
  for (const s of STORIES) storyBox(s);
}

// ------------------------------------------------- diplomacy + ticker
function band() {
  rect(32, 832, 960, 76, INK.tealDark);
  circle(56, 870, 10, INK.gold);
  str("DIPLOMACY - TRUMP TELLS EUROPE TO DEFUND UKRAINE", 78, 846, 3, INK.white);
  str("AFTER HIS PUTIN SUMMIT, TRUMP TELLS EUROPE TO STOP FUNDING UKRAINE.",
    78, 880, 2, INK.paleGreen);
}

function ticker() {
  rect(0, 924, W, 100, INK.dark);
  centre("ANTHROPIC DEBUTS AT $2TN  |  BEPICOLOMBO REACHES MERCURY ORBIT",
    W / 2, 940, 2, INK.white);
  centre("PERU QUAKE 6.7  |  BRAZIL DENGUE CUT 69%  |  UK-EU RESET DEAL",
    W / 2, 972, 2, INK.white);
}

// ------------------------------------------------------------- PNG writer
function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

const CRC = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crcOf(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type, "ascii"), data]);
  return Buffer.concat([u32be(data.length), payload, u32be(crcOf(payload))]);
}

function toPng() {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // 8-bit colour depth
  ihdr[9] = 2; // truecolour RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ main
rect(0, 0, W, H, INK.paper);
masthead();
lead();
grid();
band();
ticker();

writeFileSync(join(HERE, "entry.png"), toPng());
console.log("wrote entry.png", W + "x" + H);
