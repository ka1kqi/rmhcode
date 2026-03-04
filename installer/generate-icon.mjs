#!/usr/bin/env node

// Generates a multi-resolution .ico file for rmhcode
// Uses the rmhcode purple gradient color scheme
// Output: installer/icon.ico
//
// The icon is a simple "R>" chevron symbol using the brand colors.
// This generates a valid ICO file without any external dependencies.

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// rmhcode brand colors
const COLORS = {
  blue:   { r: 71,  g: 150, b: 228 },
  purple: { r: 132, g: 122, b: 206 },
  pink:   { r: 195, g: 103, b: 127 },
  bg:     { r: 30,  g: 30,  b: 40  },
};

// Generate a simple bitmap for a given size
// Draws a ">" chevron (the rmhcode symbol) on a dark background
function generateBitmap(size) {
  const pixels = new Uint8Array(size * size * 4); // BGRA

  // Fill background
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4 + 0] = COLORS.bg.b;
    pixels[i * 4 + 1] = COLORS.bg.g;
    pixels[i * 4 + 2] = COLORS.bg.r;
    pixels[i * 4 + 3] = 255;
  }

  // Draw a ">" chevron with gradient
  const margin = Math.floor(size * 0.15);
  const strokeWidth = Math.max(2, Math.floor(size * 0.12));

  function setPixel(x, y, r, g, b) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    // ICO bitmaps are stored bottom-up
    const row = (size - 1 - y);
    const idx = (row * size + x) * 4;
    pixels[idx + 0] = b;
    pixels[idx + 1] = g;
    pixels[idx + 2] = r;
    pixels[idx + 3] = 255;
  }

  function lerpColor(t) {
    // Gradient: blue -> purple -> pink (top to bottom)
    if (t < 0.5) {
      const s = t * 2;
      return {
        r: Math.round(COLORS.blue.r + (COLORS.purple.r - COLORS.blue.r) * s),
        g: Math.round(COLORS.blue.g + (COLORS.purple.g - COLORS.blue.g) * s),
        b: Math.round(COLORS.blue.b + (COLORS.purple.b - COLORS.blue.b) * s),
      };
    } else {
      const s = (t - 0.5) * 2;
      return {
        r: Math.round(COLORS.purple.r + (COLORS.pink.r - COLORS.purple.r) * s),
        g: Math.round(COLORS.purple.g + (COLORS.pink.g - COLORS.purple.g) * s),
        b: Math.round(COLORS.purple.b + (COLORS.pink.b - COLORS.purple.b) * s),
      };
    }
  }

  // Draw ">" chevron
  const centerY = Math.floor(size / 2);
  const left = margin;
  const right = size - margin;
  const top = margin;
  const bottom = size - margin;
  const halfH = bottom - centerY;

  for (let dy = 0; dy <= halfH; dy++) {
    const t = dy / halfH; // 0 at center, 1 at edges
    const x = left + Math.round(t * 0 + (1 - Math.abs(dy / halfH)) * 0) ;

    // Top half of chevron: from top-left to center-right
    const topY = centerY - dy;
    const progress = 1 - (dy / halfH);
    const px = left + Math.round(progress * (right - left - strokeWidth));

    // Bottom half: mirror
    const botY = centerY + dy;

    const colorTop = lerpColor(topY / size);
    const colorBot = lerpColor(botY / size);

    for (let sw = 0; sw < strokeWidth; sw++) {
      setPixel(px + sw, topY, colorTop.r, colorTop.g, colorTop.b);
      setPixel(px + sw, botY, colorBot.r, colorBot.g, colorBot.b);
    }
  }

  return pixels;
}

// Create ICO file format
function createICO(sizes) {
  const images = sizes.map(size => {
    const pixels = generateBitmap(size);

    // BMP info header (BITMAPINFOHEADER) - 40 bytes
    const headerSize = 40;
    const bpp = 32;
    const imageSize = size * size * 4;
    const maskSize = Math.ceil(size / 32) * 4 * size; // AND mask, 1bpp, padded to 4 bytes
    const dataSize = headerSize + imageSize + maskSize;

    const header = Buffer.alloc(headerSize);
    header.writeUInt32LE(headerSize, 0);     // biSize
    header.writeInt32LE(size, 4);            // biWidth
    header.writeInt32LE(size * 2, 8);        // biHeight (double for XOR+AND)
    header.writeUInt16LE(1, 12);             // biPlanes
    header.writeUInt16LE(bpp, 14);           // biBitCount
    header.writeUInt32LE(0, 16);             // biCompression (BI_RGB)
    header.writeUInt32LE(imageSize + maskSize, 20); // biSizeImage
    // Rest is zeros (resolution, colors)

    // AND mask (all zeros = fully opaque since we use 32-bit BGRA with alpha)
    const mask = Buffer.alloc(maskSize, 0);

    return {
      size,
      data: Buffer.concat([header, Buffer.from(pixels), mask]),
    };
  });

  // ICO header: 6 bytes
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0);              // reserved
  icoHeader.writeUInt16LE(1, 2);              // type: 1 = ICO
  icoHeader.writeUInt16LE(images.length, 4);  // image count

  // Directory entries: 16 bytes each
  let dataOffset = 6 + images.length * 16;
  const entries = images.map(img => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0);  // width (0 = 256)
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1);  // height
    entry.writeUInt8(0, 2);                                 // color palette
    entry.writeUInt8(0, 3);                                 // reserved
    entry.writeUInt16LE(1, 4);                              // color planes
    entry.writeUInt16LE(32, 6);                             // bits per pixel
    entry.writeUInt32LE(img.data.length, 8);               // data size
    entry.writeUInt32LE(dataOffset, 12);                   // data offset
    dataOffset += img.data.length;
    return entry;
  });

  return Buffer.concat([
    icoHeader,
    ...entries,
    ...images.map(img => img.data),
  ]);
}

// Generate multi-resolution ICO
const ico = createICO([16, 32, 48, 64, 128, 256]);
const outPath = join(__dirname, 'icon.ico');
writeFileSync(outPath, ico);
console.log(`Generated ${outPath} (${ico.length} bytes)`);
console.log('Sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256');