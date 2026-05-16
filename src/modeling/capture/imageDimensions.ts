// src/modeling/capture/imageDimensions.ts
//
// Minimal image-header parser. Reads only the first N bytes of a file to
// extract pixel dimensions. Supports PNG, JPEG, and WEBP.
// Returns { width: 0, height: 0 } when parsing fails — callers treat this
// as "unknown dimensions" and continue; render-time will surface bad files.

import { openSync, readSync, closeSync } from 'node:fs';

export interface ImageDimensions {
  width: number;
  height: number;
}

const FAIL: ImageDimensions = { width: 0, height: 0 };

/**
 * Read pixel dimensions from a PNG / JPEG / WEBP file without loading the
 * full image bytes. Reads at most ~128 bytes for PNG/WEBP; scans up to ~64 KB
 * for JPEG SOF markers.
 */
export function imageDimensions(filePath: string): ImageDimensions {
  let fd = -1;
  try {
    fd = openSync(filePath, 'r');
    // Read the first 12 bytes to detect format.
    const header = Buffer.allocUnsafe(12);
    const nHeader = readSync(fd, header, 0, 12, 0);
    if (nHeader < 12) return FAIL;

    // PNG: magic 8 bytes + IHDR chunk (4-byte length + "IHDR" + 4W + 4H)
    // IHDR width at bytes 16-19, height at 20-23.
    if (
      header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e &&
      header[3] === 0x47 && header[4] === 0x0d && header[5] === 0x0a &&
      header[6] === 0x1a && header[7] === 0x0a
    ) {
      return parsePng(fd);
    }

    // RIFF/WEBP: bytes 0-3 "RIFF", bytes 8-11 "WEBP"
    if (
      header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
      header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50
    ) {
      return parseWebp(fd);
    }

    // JPEG: SOI marker FF D8
    if (header[0] === 0xff && header[1] === 0xd8) {
      return parseJpeg(fd);
    }

    return FAIL;
  } catch {
    return FAIL;
  } finally {
    if (fd >= 0) {
      try { closeSync(fd); } catch { /* ignore */ }
    }
  }
}

function parsePng(fd: number): ImageDimensions {
  // IHDR starts at byte 8: 4-byte chunk length, "IHDR", 4-byte width, 4-byte height
  const buf = Buffer.allocUnsafe(8);
  const n = readSync(fd, buf, 0, 8, 16);
  if (n < 8) return FAIL;
  const width = buf.readUInt32BE(0);
  const height = buf.readUInt32BE(4);
  if (width === 0 || height === 0) return FAIL;
  return { width, height };
}

function parseWebp(fd: number): ImageDimensions {
  // Byte 12: chunk type (VP8 , VP8L, VP8X — 4 bytes)
  const chunkType = Buffer.allocUnsafe(4);
  const nType = readSync(fd, chunkType, 0, 4, 12);
  if (nType < 4) return FAIL;

  const type = chunkType.toString('ascii');

  if (type === 'VP8 ') {
    // Lossy: chunk data starts at byte 20.
    // VP8 bitstream frame tag (3 bytes) + sync code (3 bytes) + width/height (2 bytes each).
    // Width at bytes 26-27 (lower 14 bits), height at bytes 28-29 (lower 14 bits).
    const vp8 = Buffer.allocUnsafe(10);
    const n = readSync(fd, vp8, 0, 10, 20);
    if (n < 10) return FAIL;
    const width = (vp8[6] | (vp8[7] << 8)) & 0x3fff;
    const height = (vp8[8] | (vp8[9] << 8)) & 0x3fff;
    if (width === 0 || height === 0) return FAIL;
    return { width, height };
  }

  if (type === 'VP8L') {
    // Lossless: signature byte 0x2f at byte 20, then 4 bytes encoding width-1 (14 bits) + height-1 (14 bits).
    const vp8l = Buffer.allocUnsafe(5);
    const n = readSync(fd, vp8l, 0, 5, 20);
    if (n < 5) return FAIL;
    if (vp8l[0] !== 0x2f) return FAIL;
    // 28 bits: bits 0-13 = width-1, bits 14-27 = height-1
    const bits = vp8l[1] | (vp8l[2] << 8) | (vp8l[3] << 16) | (vp8l[4] << 24);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    if (width === 0 || height === 0) return FAIL;
    return { width, height };
  }

  if (type === 'VP8X') {
    // Extended: canvas width-1 (3 bytes LE) at offset 24, height-1 (3 bytes LE) at offset 27.
    const ext = Buffer.allocUnsafe(6);
    const n = readSync(fd, ext, 0, 6, 24);
    if (n < 6) return FAIL;
    const width = (ext[0] | (ext[1] << 8) | (ext[2] << 16)) + 1;
    const height = (ext[3] | (ext[4] << 8) | (ext[5] << 16)) + 1;
    if (width === 0 || height === 0) return FAIL;
    return { width, height };
  }

  return FAIL;
}

function parseJpeg(fd: number): ImageDimensions {
  // Scan for SOF0 (FF C0), SOF1 (FF C1), SOF2 (FF C2) markers.
  // Each marker: FF <type> <2-byte-length> <1-byte-precision> <2-byte-height> <2-byte-width>
  // Scan up to 64 KB to avoid reading huge files.
  const MAX_SCAN = 65536;
  const CHUNK = 4096;
  let pos = 2; // skip SOI
  while (pos < MAX_SCAN) {
    const markerBuf = Buffer.allocUnsafe(CHUNK);
    const n = readSync(fd, markerBuf, 0, CHUNK, pos);
    if (n < 2) return FAIL;
    let i = 0;
    while (i < n - 1) {
      if (markerBuf[i] !== 0xff) {
        // Not aligned; skip forward — shouldn't happen in a well-formed JPEG
        i++;
        continue;
      }
      const marker = markerBuf[i + 1];
      if (marker === 0x00 || marker === 0xff) {
        // Stuffed byte or padding; skip
        i++;
        continue;
      }
      // SOF markers: C0, C1, C2 (baseline, extended sequential, progressive)
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        // Length: 2 bytes at i+2 (big-endian, includes itself but not FF+marker)
        if (i + 8 >= n) return FAIL;
        const height = (markerBuf[i + 5] << 8) | markerBuf[i + 6];
        const width = (markerBuf[i + 7] << 8) | markerBuf[i + 8];
        if (width === 0 || height === 0) return FAIL;
        return { width, height };
      }
      // Skip this segment: length field at i+2 (2 bytes BE, includes the 2 length bytes)
      if (i + 3 >= n) return FAIL;
      const segLen = (markerBuf[i + 2] << 8) | markerBuf[i + 3];
      if (segLen < 2) return FAIL;
      // Jump to next marker: current pos + 2 (FF+marker) + segLen
      pos = pos + i + 2 + segLen;
      i = n; // exit inner loop — restart outer loop from new pos
    }
    if (i < n) {
      pos += i + 1;
    } else {
      pos += n;
    }
  }
  return FAIL;
}
