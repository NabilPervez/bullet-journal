// Generates every icon and Play Store graphic from SVG source, so the brand
// lives in one place and can be regenerated after a design change.
//
//   npm run icons
//
// Writes:
//   public/icon-192.png, icon-512.png, icon-maskable-512.png   (web manifest)
//   public/apple-touch-icon.png, favicon.svg
//   public/shortcut-{today,week,month,future}.png              (Android shortcuts)
//   store-assets/android/play-icon-512.png                     (Play listing icon, 32-bit PNG)
//   store-assets/android/feature-graphic-1024x500.png          (Play feature graphic, 24-bit PNG)
//
// Fonts for the feature graphic are downloaded from Google Fonts on first run
// into scripts/.font-cache (git-ignored). Both are SIL Open Font License.

import { Resvg } from "@resvg/resvg-js";
import { mkdir, writeFile, access } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");
const store = path.join(root, "store-assets", "android");
const fontCache = path.join(root, "scripts", ".font-cache");

// Brand tokens — the same values as src/index.css.
const BG = "#0B0B0F";
const SURFACE = "#15151C";
const LINE = "#2E2E3A";
const TEXT = "#F6F6F8";
const MUTED = "#A7A7B4";
const DIM = "#74748A";
const VOLT = "#C9F94E";
const BLAZE = "#FF6B3D";
const COBALT = "#58A6FF";
const INK = "#0B0B0F";

// ---------------------------------------------------------------------------
// The mark: a volt sticker carrying a bullet and a line — one journal entry.
// `r` is the sticker radius on a 512 canvas. The maskable variant keeps the
// whole sticker inside the 80% safe zone that Android's launcher masks to.
// ---------------------------------------------------------------------------

function mark({ size = 512, r = 176, bleed = true } = {}) {
  const s = r / 176;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  ${bleed ? `<rect width="512" height="512" fill="${BG}"/>` : ""}
  <circle cx="256" cy="256" r="${r}" fill="${VOLT}"/>
  <g transform="translate(256 256) rotate(-8) scale(${s})">
    <circle cx="-62" cy="0" r="34" fill="${INK}"/>
    <rect x="-6" y="-18" width="112" height="36" rx="18" fill="${INK}"/>
  </g>
</svg>`;
}

// Shortcut glyphs, drawn as shapes so no font is involved.
const SHORTCUT_GLYPHS = {
  today: `<circle cx="0" cy="0" r="22" fill="${INK}"/>`,
  week: [-26, 0, 26].map((y) => `<rect x="-40" y="${y - 7}" width="80" height="14" rx="7" fill="${INK}"/>`).join(""),
  month: [-22, 22]
    .flatMap((y) => [-22, 22].map((x) => `<rect x="${x - 16}" y="${y - 16}" width="32" height="32" rx="7" fill="${INK}"/>`))
    .join(""),
  future: `<rect x="-40" y="-8" width="64" height="16" rx="8" fill="${INK}"/><path d="M14 -30 L44 0 L14 30" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`,
};

function shortcut(glyph) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="-128 -128 256 256">
  <circle cx="0" cy="0" r="128" fill="${VOLT}"/>
  <g transform="scale(1.35)">${SHORTCUT_GLYPHS[glyph]}</g>
</svg>`;
}

// ---------------------------------------------------------------------------
// Play feature graphic, 1024x500. Google may crop the edges and overlay a
// play button in some placements, so the wordmark sits well inside the frame.
// ---------------------------------------------------------------------------

function entryCard({ y, color, text, checked = false, sub }) {
  return `<g transform="translate(0 ${y})">
    <rect x="0" y="0" width="360" height="${sub ? 96 : 80}" rx="18" fill="${SURFACE}" stroke="${LINE}" stroke-width="2"/>
    <rect x="0" y="0" width="8" height="${sub ? 96 : 80}" rx="4" fill="${color}"/>
    <rect x="30" y="${sub ? 20 : 25}" width="30" height="30" rx="9" fill="${checked ? VOLT : "none"}" stroke="${checked ? VOLT : "#3E3E4C"}" stroke-width="3"/>
    ${checked ? `<path d="M37 ${sub ? 35 : 40} l7 7 l13 -14" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
    <text x="80" y="${sub ? 46 : 51}" font-family="Figtree" font-weight="600" font-size="26" fill="${checked ? DIM : TEXT}">${text}</text>
    ${checked ? `<rect x="80" y="${sub ? 36 : 41}" width="${text.length * 11.3}" height="3" rx="1.5" fill="${DIM}"/>` : ""}
    ${sub ? `<text x="80" y="78" font-family="Figtree" font-weight="600" font-size="19" fill="${VOLT}">${sub}</text>` : ""}
  </g>`;
}

function featureGraphic() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <rect width="1024" height="500" fill="${BG}"/>
  <circle cx="930" cy="70" r="190" fill="${VOLT}" opacity="0.06"/>

  <g transform="translate(72 0)">
    <text x="0" y="150" font-family="Figtree" font-weight="700" font-size="20" letter-spacing="3" fill="${VOLT}">FOR ANDROID</text>
    <text x="0" y="236" font-family="Bricolage Grotesque" font-weight="800" font-size="78" letter-spacing="-2" fill="${TEXT}">Digital Bullet</text>
    <text x="0" y="318" font-family="Bricolage Grotesque" font-weight="800" font-size="78" letter-spacing="-2" fill="${TEXT}">Journal</text>
    <text x="0" y="378" font-family="Figtree" font-weight="600" font-size="26" fill="${MUTED}">Log it. Tick it off. Plan the day.</text>
  </g>

  <g transform="translate(600 92) rotate(-4 180 160)">
    ${entryCard({ y: 0, color: BLAZE, text: "Plan the week" })}
    ${entryCard({ y: 100, color: VOLT, text: "Oil change", sub: "Every 6 months" })}
    ${entryCard({ y: 216, color: COBALT, text: "Call the dentist", checked: true })}
  </g>

  <g transform="translate(944 102) rotate(10)">
    <circle cx="0" cy="0" r="42" fill="${VOLT}"/>
    <circle cx="-14" cy="0" r="8" fill="${INK}"/>
    <rect x="-1" y="-5" width="26" height="10" rx="5" fill="${INK}"/>
  </g>
</svg>`;
}

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

const FONTS = [
  { file: "BricolageGrotesque-800.ttf", query: "Bricolage+Grotesque:wght@800" },
  { file: "Figtree-600.ttf", query: "Figtree:wght@600" },
  { file: "Figtree-700.ttf", query: "Figtree:wght@700" },
];

// An old Android user agent makes the Google Fonts CSS API answer with
// TrueType, which the renderer can read (it can't read woff/woff2).
const TTF_UA =
  "Mozilla/5.0 (Linux; U; Android 2.2; en-us; Nexus One Build/FRF91) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1";

async function ensureFonts() {
  await mkdir(fontCache, { recursive: true });
  const paths = [];
  for (const font of FONTS) {
    const target = path.join(fontCache, font.file);
    try {
      await access(target);
    } catch {
      const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${font.query}`, { headers: { "User-Agent": TTF_UA } })).text();
      const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
      if (!url) throw new Error(`No TrueType URL for ${font.query}`);
      await writeFile(target, Buffer.from(await (await fetch(url)).arrayBuffer()));
      console.log(`  fetched ${font.file}`);
    }
    paths.push(target);
  }
  return paths;
}

// ---------------------------------------------------------------------------
// PNG output. Play wants the listing icon as 32-bit (with alpha) and the
// feature graphic as 24-bit (no alpha), so the encoder can drop the alpha
// channel itself rather than needing another image library.
// ---------------------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba, width, height, { alpha }) {
  const channels = alpha ? 4 : 3;
  const raw = Buffer.alloc((width * channels + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * channels + 1);
    raw[row] = 0; // no filter
    for (let x = 0; x < width; x += 1) {
      const src = (y * width + x) * 4;
      const dst = row + 1 + x * channels;
      raw[dst] = rgba[src];
      raw[dst + 1] = rgba[src + 1];
      raw[dst + 2] = rgba[src + 2];
      if (alpha) raw[dst + 3] = rgba[src + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = alpha ? 6 : 2; // RGBA : RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function render(svg, file, { width, alpha = true, fontFiles = [] }) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "Figtree" },
  });
  const image = resvg.render();
  await writeFile(file, encodePng(image.pixels, image.width, image.height, { alpha }));
  console.log(`  ${path.relative(root, file)}  ${image.width}x${image.height}  ${alpha ? "RGBA" : "RGB"}`);
}

// ---------------------------------------------------------------------------

await mkdir(store, { recursive: true });

console.log("Web app icons");
await render(mark(), path.join(pub, "icon-512.png"), { width: 512 });
await render(mark(), path.join(pub, "icon-192.png"), { width: 192 });
await render(mark({ r: 150 }), path.join(pub, "icon-maskable-512.png"), { width: 512 });
await render(mark(), path.join(pub, "apple-touch-icon.png"), { width: 180 });
await writeFile(path.join(pub, "favicon.svg"), mark({ size: 64 }));
console.log("  public/favicon.svg");

console.log("Shortcut icons");
for (const glyph of Object.keys(SHORTCUT_GLYPHS)) {
  await render(shortcut(glyph), path.join(pub, `shortcut-${glyph}.png`), { width: 96 });
}

console.log("Play Store listing");
await render(mark(), path.join(store, "play-icon-512.png"), { width: 512, alpha: true });
const fontFiles = await ensureFonts();
await render(featureGraphic(), path.join(store, "feature-graphic-1024x500.png"), { width: 1024, alpha: false, fontFiles });
