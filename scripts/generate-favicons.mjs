// Genere tous les favicons/icones (carres + ronds + maskable) depuis logo solo.png
// Source: docs/nouveau logo/logo solo.png
// Sortie : public/site/logo/favicon/ + public/favicon.ico + public/pwa-192.png + public/pwa-512.png

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'docs', 'nouveau logo', 'logo solo.png');
const OUT_FAV = path.join(ROOT, 'public', 'site', 'logo', 'favicon');
const OUT_PUBLIC = path.join(ROOT, 'public');

const BG = { r: 255, g: 255, b: 255, alpha: 1 }; // fond blanc pour icones opaques
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

await fs.mkdir(OUT_FAV, { recursive: true });

const srcBuf = await fs.readFile(SRC);

/** Redimensionne le logo pour tenir dans une zone carree (inner) centree sur size, avec un fond. */
async function squareIcon({ size, innerRatio = 0.84, background = BG }) {
  const inner = Math.round(size * innerRatio);
  const logo = await sharp(srcBuf)
    .resize(inner, inner, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();
}

/** Icone ronde : cercle plein (background) + logo centre. */
async function roundIcon({ size, innerRatio = 0.7, background = BG }) {
  const circleSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"
        fill="rgb(${background.r},${background.g},${background.b})"/>
    </svg>`,
  );
  const inner = Math.round(size * innerRatio);
  const logo = await sharp(srcBuf)
    .resize(inner, inner, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: TRANSPARENT },
  })
    .composite([
      { input: circleSvg, top: 0, left: 0 },
      { input: logo, gravity: 'center' },
    ])
    .png()
    .toBuffer();
}

/** Maskable PWA : safe zone 80% (Android applique un masque, cercle/arrondi). */
async function maskableIcon({ size, background = BG }) {
  return squareIcon({ size, innerRatio: 0.6, background });
}

async function writeSquare(filename, size, opts = {}) {
  const buf = await squareIcon({ size, ...opts });
  const full = path.join(OUT_FAV, filename);
  await fs.writeFile(full, buf);
  console.log('square', filename, `${size}x${size}`);
  return full;
}

async function writeRound(filename, size, opts = {}) {
  const buf = await roundIcon({ size, ...opts });
  const full = path.join(OUT_FAV, filename);
  await fs.writeFile(full, buf);
  console.log('round ', filename, `${size}x${size}`);
  return full;
}

async function writeMaskable(filename, size) {
  const buf = await maskableIcon({ size });
  const full = path.join(OUT_FAV, filename);
  await fs.writeFile(full, buf);
  console.log('mask  ', filename, `${size}x${size}`);
  return full;
}

// --- Icones carrees (fond blanc, padding) ------------------------------------
const SQUARE_SIZES = [16, 32, 48, 64, 96, 128, 180, 192, 256, 384, 512, 1024];
const squarePaths = {};
for (const s of SQUARE_SIZES) {
  const name = s === 180 ? 'apple-touch-icon.png' : `favicon-${s}x${s}.png`;
  squarePaths[s] = await writeSquare(name, s);
}

// Alias historiques attendus par index.html / manifest
await fs.copyFile(squarePaths[192], path.join(OUT_FAV, 'android-chrome-192x192.png'));
await fs.copyFile(squarePaths[512], path.join(OUT_FAV, 'android-chrome-512x512.png'));
console.log('alias android-chrome 192 & 512');

// MS Tiles
await writeSquare('mstile-150x150.png', 150);
await writeSquare('mstile-270x270.png', 270);

// --- Icones rondes -----------------------------------------------------------
const ROUND_SIZES = [64, 128, 192, 256, 512];
for (const s of ROUND_SIZES) {
  await writeRound(`favicon-round-${s}x${s}.png`, s);
}

// --- Maskable PWA ------------------------------------------------------------
await writeMaskable('maskable-192x192.png', 192);
await writeMaskable('maskable-512x512.png', 512);

// --- ICO multi-tailles (16/32/48) --------------------------------------------
const icoBuf = await pngToIco([squarePaths[16], squarePaths[32], squarePaths[48]]);
const icoPathFav = path.join(OUT_FAV, 'favicon.ico');
await fs.writeFile(icoPathFav, icoBuf);
await fs.writeFile(path.join(OUT_PUBLIC, 'favicon.ico'), icoBuf);
console.log('favicon.ico (16/32/48) -> public/ + site/logo/favicon/');

// --- PWA racine (referencees par sw.js / anciens liens) ----------------------
await fs.copyFile(squarePaths[192], path.join(OUT_PUBLIC, 'pwa-192.png'));
await fs.copyFile(squarePaths[512], path.join(OUT_PUBLIC, 'pwa-512.png'));
console.log('pwa-192.png / pwa-512.png copies dans public/');

console.log('\nOK - favicons regeneres depuis', path.relative(ROOT, SRC));
