import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Gerar SVG do MacroMetrics Pro
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="112" fill="#131314"/>
  <rect x="8" y="8" width="496" height="496" rx="104" stroke="#4F378B" stroke-width="8" stroke-opacity="0.6"/>
  <rect x="110" y="140" width="56" height="240" rx="16" fill="#80CBC4"/>
  <rect x="346" y="140" width="56" height="240" rx="16" fill="#FFD54F"/>
  <path d="M140 160 L256 300 L372 160" stroke="#D0BCFF" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
  <polygon points="256,150 276,178 256,206 236,178" fill="#70D6E2"/>
</svg>
`;

fs.writeFileSync(path.join(publicDir, 'vite.svg'), svgIcon, 'utf-8');
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgIcon, 'utf-8');

// 2. Utilitários para criação de PNG padrão via Node.js zlib
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function generatePng(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  const raw = Buffer.alloc(size * (1 + size * 4));
  let offset = 0;

  const cornerRadius = size * 0.22;
  const pad = size * 0.04;

  for (let y = 0; y < size; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < size; x++) {
      const qx = Math.max(pad + cornerRadius - x, 0, x - (size - pad - cornerRadius));
      const qy = Math.max(pad + cornerRadius - y, 0, y - (size - pad - cornerRadius));
      const inBox = (x >= pad && x <= size - pad && y >= pad && y <= size - pad);
      const inCorner = (qx * qx + qy * qy) <= cornerRadius * cornerRadius;

      if (!inBox || !inCorner) {
        raw[offset++] = 0;
        raw[offset++] = 0;
        raw[offset++] = 0;
        raw[offset++] = 0;
        continue;
      }

      let r = 19, g = 19, b = 20, a = 255;
      const normX = x / size;
      const normY = y / size;

      // Coluna Esquerda: Proteína (#80CBC4)
      if (normX >= 0.22 && normX <= 0.32 && normY >= 0.27 && normY <= 0.74) {
        r = 128; g = 203; b = 196;
      }
      // Coluna Direita: Carboidratos (#FFD54F)
      else if (normX >= 0.68 && normX <= 0.78 && normY >= 0.27 && normY <= 0.74) {
        r = 255; g = 213; b = 79;
      }
      // Chevrons Centrais: Primária M3 (#D0BCFF)
      else if (distToSegment(normX, normY, 0.27, 0.32, 0.50, 0.58) <= 0.05) {
        r = 208; g = 188; b = 255;
      }
      else if (distToSegment(normX, normY, 0.73, 0.32, 0.50, 0.58) <= 0.05) {
        r = 208; g = 188; b = 255;
      }
      // Losango de Decisão Analítica (#70D6E2)
      else if (Math.abs(normX - 0.50) + Math.abs(normY - 0.35) <= 0.04) {
        r = 112; g = 214; b = 226;
      }

      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const idat = makeChunk('IDAT', zlib.deflateSync(raw));
  const iend = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Gerar PNGs
const png192 = generatePng(192);
const png512 = generatePng(512);
const png180 = generatePng(180);
const png48 = generatePng(48);

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);

// 3. Gerar favicon.ico encapsulando o PNG de 48x48
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
icoHeader.writeUInt16LE(1, 4); // 1 Image

const icoDir = Buffer.alloc(16);
icoDir.writeUInt8(48, 0); // Width
icoDir.writeUInt8(48, 1); // Height
icoDir.writeUInt8(0, 2);  // Colors
icoDir.writeUInt8(0, 3);  // Reserved
icoDir.writeUInt16LE(1, 4); // Color planes
icoDir.writeUInt16LE(32, 6); // Bits per pixel
icoDir.writeUInt32LE(png48.length, 8); // Image size in bytes
icoDir.writeUInt32LE(22, 12); // Offset (6 header + 16 dir = 22)

const icoBuf = Buffer.concat([icoHeader, icoDir, png48]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);

console.log('MacroMetrics Pro PWA assets gerados com sucesso em apps/web/public/');
