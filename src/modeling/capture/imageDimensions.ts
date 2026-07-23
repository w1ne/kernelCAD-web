// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/imageDimensions.ts
//
// Minimal image-header parser. Reads only the small fixed headers for PNG and
// WEBP, and walks JPEG segment headers without loading their payloads, to
// extract pixel dimensions. Supports PNG, JPEG, and WEBP.
// Returns { width: 0, height: 0 } when parsing fails — callers treat this
// as "unknown dimensions" and continue; render-time will surface bad files.

import { openSync, readSync, closeSync } from 'node:fs';

export interface ImageDimensions {
  width: number;
  height: number;
}

const FAIL: ImageDimensions = { width: 0, height: 0 };
// JPEG APP/COM metadata can legitimately be large, but this synchronous parser
// is called on user-controlled files. Bound both bytes skipped and individual
// marker headers so a crafted stream cannot monopolize the event loop.
const MAX_JPEG_HEADER_SCAN_BYTES = 1024 * 1024;
const MAX_JPEG_MARKERS = 4096;

/**
 * Read pixel dimensions from a PNG / JPEG / WEBP file without loading the
 * full image bytes. Reads at most ~128 bytes for PNG/WEBP; for JPEG it walks
 * segment headers until it reaches a Start Of Frame marker, without loading
 * image payloads, subject to a generous finite header budget.
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
  // JPEG dimensions live in a Start Of Frame segment before the SOS marker.
  // Walk segment headers directly so a valid file with large EXIF/ICC metadata
  // does not require loading that metadata. Keep both byte and marker limits:
  // this code is synchronous and a hostile stream can otherwise create an
  // unbounded sequence of tiny marker segments or marker fill bytes.
  let position = 2; // skip SOI
  let markersRead = 0;

  while (position < MAX_JPEG_HEADER_SCAN_BYTES && markersRead < MAX_JPEG_MARKERS) {
    const prefix = readExact(fd, position, 2);
    if (!prefix || prefix[0] !== 0xff) return FAIL;

    let marker = prefix[1];
    position += 2;
    markersRead += 1;

    // JPEG permits any number of 0xff fill bytes before a marker code.
    while (marker === 0xff) {
      if (markersRead >= MAX_JPEG_MARKERS || position >= MAX_JPEG_HEADER_SCAN_BYTES) return FAIL;
      const fill = readExact(fd, position, 1);
      if (!fill) return FAIL;
      marker = fill[0];
      position += 1;
      markersRead += 1;
    }

    // A stuffed zero is valid only in entropy-coded scan data. We never scan
    // that data: dimensions must be declared before SOS.
    if (marker === 0x00) return FAIL;
    if (marker === 0xd9 || marker === 0xda) return FAIL;
    if (isStandaloneJpegMarker(marker)) continue;

    const lengthBuffer = readExact(fd, position, 2);
    if (!lengthBuffer) return FAIL;
    const segmentLength = lengthBuffer.readUInt16BE(0);
    if (segmentLength < 2) return FAIL;

    const payloadStart = position + 2;
    const payloadLength = segmentLength - 2;

    if (isJpegStartOfFrame(marker)) {
      // SOF payload: precision (1), height (2), width (2), components (1)...
      if (payloadStart + 5 > MAX_JPEG_HEADER_SCAN_BYTES) return FAIL;
      const frame = readExact(fd, payloadStart, 5);
      if (!frame) return FAIL;
      const height = frame.readUInt16BE(1);
      const width = frame.readUInt16BE(3);
      if (width === 0 || height === 0) return FAIL;
      return { width, height };
    }

    // Skip exactly this segment's payload. The next loop starts at its marker.
    position = payloadStart + payloadLength;
  }

  return FAIL;
}

function readExact(fd: number, position: number, length: number): Buffer | undefined {
  const buffer = Buffer.allocUnsafe(length);
  let offset = 0;
  while (offset < length) {
    const read = readSync(fd, buffer, offset, length - offset, position + offset);
    if (read <= 0) return undefined;
    offset += read;
  }
  return buffer;
}

function isStandaloneJpegMarker(marker: number): boolean {
  return marker === 0x01 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7);
}

function isJpegStartOfFrame(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}
