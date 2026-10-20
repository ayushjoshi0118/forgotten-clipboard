// generate-icons.js - Generates crisp PNG icons without external dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table for PNG chunk checksums
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(len, 0);

  const crcData = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(width, height, pixelFn) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bits per channel
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // Deflate
  ihdr.writeUInt8(0, 11); // Filter 0
  ihdr.writeUInt8(0, 12); // No interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with 0-filter byte preceding each scanline
  const scanlineLength = width * 4;
  const rawData = Buffer.alloc(height * (1 + scanlineLength));

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter byte: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Distance helper
function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

// Drawing logic: Modern icon with rounded rectangle clipboard + clock/magnifier search accent
function drawIconPixel(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const relX = x / size;
  const relY = y / size;

  // Background: rounded badge (radius ~22%)
  const cornerRadius = size * 0.22;
  const pad = size * 0.05;
  const left = pad + cornerRadius;
  const right = size - pad - cornerRadius;
  const top = pad + cornerRadius;
  const bottom = size - pad - cornerRadius;

  let inBadge = false;
  if (x >= left && x <= right && y >= pad && y <= size - pad) inBadge = true;
  else if (y >= top && y <= bottom && x >= pad && x <= size - pad) inBadge = true;
  else if (dist(x, y, left, top) <= cornerRadius) inBadge = true;
  else if (dist(x, y, right, top) <= cornerRadius) inBadge = true;
  else if (dist(x, y, left, bottom) <= cornerRadius) inBadge = true;
  else if (dist(x, y, right, bottom) <= cornerRadius) inBadge = true;

  if (!inBadge) {
    return [0, 0, 0, 0]; // Transparent outside badge
  }

  // Base background gradient: Deep Indigo to Violet (#4F46E5 -> #7C3AED)
  const grad = relY * 0.6 + relX * 0.4;
  let bgR = Math.round(79 + (124 - 79) * grad);
  let bgG = Math.round(70 + (58 - 70) * grad);
  let bgB = Math.round(229 + (237 - 229) * grad);

  // Clipboard board outline:
  // x: 0.24 to 0.76, y: 0.22 to 0.82
  const cbLeft = size * 0.25;
  const cbRight = size * 0.75;
  const cbTop = size * 0.25;
  const cbBottom = size * 0.82;
  const cbRadius = size * 0.08;

  let inClipboard = false;
  if (x >= cbLeft + cbRadius && x <= cbRight - cbRadius && y >= cbTop && y <= cbBottom) inClipboard = true;
  else if (y >= cbTop + cbRadius && y <= cbBottom - cbRadius && x >= cbLeft && x <= cbRight) inClipboard = true;
  else if (dist(x, y, cbLeft + cbRadius, cbTop + cbRadius) <= cbRadius) inClipboard = true;
  else if (dist(x, y, cbRight - cbRadius, cbTop + cbRadius) <= cbRadius) inClipboard = true;
  else if (dist(x, y, cbLeft + cbRadius, cbBottom - cbRadius) <= cbRadius) inClipboard = true;
  else if (dist(x, y, cbRight - cbRadius, cbBottom - cbRadius) <= cbRadius) inClipboard = true;

  // Clip on top of clipboard:
  // x: 0.38 to 0.62, y: 0.17 to 0.29
  const clipLeft = size * 0.38;
  const clipRight = size * 0.62;
  const clipTop = size * 0.17;
  const clipBottom = size * 0.29;
  const clipRadius = size * 0.05;

  let inClip = false;
  if (x >= clipLeft && x <= clipRight && y >= clipTop && y <= clipBottom) inClip = true;

  if (inClip) {
    // Silver-white clip
    return [240, 244, 255, 255];
  }

  if (inClipboard) {
    // Clipboard body: Clean white / light slate
    // Interior text lines or magnifier
    // Let's draw 3 neat document lines in indigo tint:
    const lineXStart = size * 0.34;
    const lineXEnd = size * 0.66;
    const line1Y = size * 0.40;
    const line2Y = size * 0.52;
    const line3Y = size * 0.64;
    const lineThickness = Math.max(1, Math.round(size * 0.045));

    // Clock / rewind search indicator in bottom-right corner of clipboard
    const clockCx = size * 0.65;
    const clockCy = size * 0.68;
    const clockR = size * 0.16;
    const dClock = dist(x, y, clockCx, clockCy);

    if (dClock <= clockR) {
      // Accent cyan circle: #06B6D4
      if (dClock <= clockR - Math.max(1, size * 0.035)) {
        // Clock center
        // Clock hands
        const isCenter = dist(x, y, clockCx, clockCy) <= Math.max(1, size * 0.04);
        const isHourHand = (x >= clockCx - 1 && x <= clockCx + 1 && y >= clockCy - clockR * 0.55 && y <= clockCy);
        const isMinHand = (y >= clockCy - 1 && y <= clockCy + 1 && x >= clockCx && x <= clockCx + clockR * 0.6);
        if (isCenter || isHourHand || isMinHand) {
          return [255, 255, 255, 255];
        }
        return [6, 182, 212, 255];
      }
      return [255, 255, 255, 255]; // Ring
    }

    // Check lines
    const onLine1 = (y >= line1Y - lineThickness/2 && y <= line1Y + lineThickness/2 && x >= lineXStart && x <= lineXEnd);
    const onLine2 = (y >= line2Y - lineThickness/2 && y <= line2Y + lineThickness/2 && x >= lineXStart && x <= size * 0.58);
    const onLine3 = (y >= line3Y - lineThickness/2 && y <= line3Y + lineThickness/2 && x >= lineXStart && x <= size * 0.48);

    if (onLine1 || onLine2 || onLine3) {
      return [99, 102, 241, 230]; // Soft indigo text lines
    }

    return [255, 255, 255, 250];
  }

  return [bgR, bgG, bgB, 255];
}

const sizes = [16, 32, 48, 128];
const outDir = path.join(__dirname, 'src', 'assets', 'icons');

for (const s of sizes) {
  const pngBuf = createPng(s, s, (x, y, w, h) => drawIconPixel(x, y, s));
  const outPath = path.join(outDir, `icon-${s}.png`);
  fs.writeFileSync(outPath, pngBuf);
  console.log(`Generated ${outPath} (${s}x${s}, ${pngBuf.length} bytes)`);
}
