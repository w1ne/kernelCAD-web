// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/helpers/drawingPdf/svgToPdf.ts
//
// SVG engineering-drawing sheet -> vector PDF, for the drawing-to-CAD fixtures.
//
// Preference order: an installed converter (rsvg-convert, inkscape, cairosvg)
// because those are what real sheets pass through; otherwise the minimal
// writer below. The minimal writer understands exactly the SVG subset the
// svg-drawing exporter emits (paths of M/L/Z, line, rect, circle, text with an
// optional rotate(), group-inherited stroke/fill/dash/font attributes) and
// writes real PDF drawing operators: stroked paths with their line width and
// dash array, filled arrowheads, and text in the standard Helvetica font. It
// is deliberately a DIFFERENT producer from cairo so the importer is tested
// against two independent PDF writers, not one.
//
// Also exports `writeRasterPdf`, a page that holds only an embedded image —
// the scanned-drawing case the importer must refuse.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

export type SvgPdfConverter = 'rsvg-convert' | 'inkscape' | 'cairosvg' | 'minimal';

function hasCommand(cmd: string): boolean {
  try {
    execFileSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** First available external converter, or `'minimal'`. */
export function detectSvgPdfConverter(): SvgPdfConverter {
  for (const c of ['rsvg-convert', 'inkscape', 'cairosvg'] as const) {
    if (hasCommand(c)) return c;
  }
  return 'minimal';
}

/** Convert SVG text to PDF bytes with the named (or best available) converter. */
export function svgToPdf(svg: string, converter: SvgPdfConverter = detectSvgPdfConverter()): Uint8Array {
  if (converter === 'minimal') return minimalSvgToPdf(svg);
  const dir = mkdtempSync(join(tmpdir(), 'kc-svg2pdf-'));
  try {
    const src = join(dir, 'sheet.svg');
    const out = join(dir, 'sheet.pdf');
    // The exporter asks for generic `sans-serif`, which on many systems maps to
    // a face without the drafting symbols (⌀ ▾ ⌴ ⌵) — the PDF's text layer is
    // right either way, but the rendered page would show tofu boxes. DejaVu
    // Sans carries them; fontconfig falls back to the default when absent.
    writeFileSync(src, svg.replace(/font-family="sans-serif"/g, 'font-family="DejaVu Sans"'), 'utf8');
    if (converter === 'rsvg-convert') {
      execFileSync('rsvg-convert', ['-f', 'pdf', '-o', out, src], { stdio: 'ignore' });
    } else if (converter === 'inkscape') {
      execFileSync('inkscape', [src, '--export-type=pdf', `--export-filename=${out}`], { stdio: 'ignore' });
    } else {
      execFileSync('cairosvg', [src, '-o', out], { stdio: 'ignore' });
    }
    return new Uint8Array(readFileSync(out));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Minimal PDF object writer
// ---------------------------------------------------------------------------

function buildPdf(objects: Array<string | Buffer>): Uint8Array {
  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
  let offset = chunks[0].length;
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(offset);
    const head = Buffer.from(`${i + 1} 0 obj\n`, 'latin1');
    const b = typeof body === 'string' ? Buffer.from(body, 'latin1') : body;
    const tail = Buffer.from('\nendobj\n', 'latin1');
    chunks.push(head, b, tail);
    offset += head.length + b.length + tail.length;
  });
  const xrefAt = offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) xref += `${String(o).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  chunks.push(Buffer.from(xref, 'latin1'));
  return new Uint8Array(Buffer.concat(chunks));
}

function streamObject(dict: string, data: Buffer): Buffer {
  return Buffer.concat([
    Buffer.from(`<< ${dict} /Length ${data.length} >>\nstream\n`, 'latin1'),
    data,
    Buffer.from('\nendstream', 'latin1'),
  ]);
}

const PT_PER_MM = 72 / 25.4;
const n = (v: number): string => {
  const r = Math.round(v * 10000) / 10000;
  return Object.is(r, -0) ? '0' : String(r);
};

// Helvetica advance widths (1/1000 em) for the characters a drawing sheet uses.
const HELVETICA_WIDTHS: Record<string, number> = {
  ' ': 278, '.': 278, ',': 278, ':': 278, '-': 333, '+': 584, '=': 584, '/': 278,
  '(': 333, ')': 333, '°': 400, '±': 584, '×': 584, 'Ø': 778, '—': 1000,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500,
  K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
  U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222,
  k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278,
  u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
};

// WinAnsi code points for the non-ASCII glyphs a sheet uses. The standard 14
// fonts have no diameter sign, so ⌀ is written as Ø — the substitute drafting
// practice itself uses on type that lacks U+2300.
const WIN_ANSI: Record<string, number> = { '°': 0xb0, '±': 0xb1, '×': 0xd7, 'Ø': 0xd8, '—': 0x97 };

function winAnsiHex(text: string): string {
  let hex = '';
  for (const ch of text.replace(/⌀/g, 'Ø')) {
    const code = WIN_ANSI[ch] ?? ch.charCodeAt(0);
    hex += (code < 256 ? code : 0x3f).toString(16).padStart(2, '0');
  }
  return `<${hex}>`;
}

function helveticaWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text.replace(/⌀/g, 'Ø')) {
    w += /[0-9]/.test(ch) ? 556 : (HELVETICA_WIDTHS[ch] ?? 556);
  }
  return (w / 1000) * size;
}

// ---------------------------------------------------------------------------
// SVG subset -> content stream
// ---------------------------------------------------------------------------

type Attrs = Record<string, string>;

function parseAttrs(src: string): Attrs {
  const out: Attrs = {};
  for (const m of src.matchAll(/([\w:-]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

const decodeEntities = (s: string): string =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

function colorOp(value: string | undefined, stroke: boolean): string {
  const v = (value ?? '#000').trim();
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  let r = 0, g = 0, b = 0;
  if (m) {
    const hex = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
    r = parseInt(hex.slice(0, 2), 16) / 255;
    g = parseInt(hex.slice(2, 4), 16) / 255;
    b = parseInt(hex.slice(4, 6), 16) / 255;
  }
  return `${n(r)} ${n(g)} ${n(b)} ${stroke ? 'RG' : 'rg'}`;
}

function pathOps(d: string): string {
  const ops: string[] = [];
  for (const m of d.matchAll(/([MLZmlz])([^MLZmlz]*)/g)) {
    const nums = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const cmd = m[1].toUpperCase();
    if (cmd === 'Z') {
      ops.push('h');
      continue;
    }
    for (let i = 0; i + 1 < nums.length; i += 2) {
      ops.push(`${n(nums[i])} ${n(nums[i + 1])} ${cmd === 'M' && i === 0 ? 'm' : 'l'}`);
    }
  }
  return ops.join(' ');
}

function circleOps(cx: number, cy: number, r: number): string {
  const k = 0.5522847498 * r;
  return [
    `${n(cx + r)} ${n(cy)} m`,
    `${n(cx + r)} ${n(cy + k)} ${n(cx + k)} ${n(cy + r)} ${n(cx)} ${n(cy + r)} c`,
    `${n(cx - k)} ${n(cy + r)} ${n(cx - r)} ${n(cy + k)} ${n(cx - r)} ${n(cy)} c`,
    `${n(cx - r)} ${n(cy - k)} ${n(cx - k)} ${n(cy - r)} ${n(cx)} ${n(cy - r)} c`,
    `${n(cx + k)} ${n(cy - r)} ${n(cx + r)} ${n(cy - k)} ${n(cx + r)} ${n(cy)} c`,
    'h',
  ].join(' ');
}

/** Paint a shape with the inherited fill/stroke state. */
function paint(geometry: string, a: Attrs): string {
  const fill = a.fill !== undefined && a.fill !== 'none';
  const stroke = a.stroke !== undefined && a.stroke !== 'none';
  if (!fill && !stroke) return '';
  const state: string[] = [];
  if (fill) state.push(colorOp(a.fill, false));
  if (stroke) {
    state.push(colorOp(a.stroke, true));
    state.push(`${n(Number(a['stroke-width'] ?? '1'))} w`);
    const dash = a['stroke-dasharray'];
    state.push(dash && dash !== 'none'
      ? `[${dash.trim().split(/[\s,]+/).map(v => n(Number(v))).join(' ')}] 0 d`
      : '[] 0 d');
    state.push(a['stroke-linecap'] === 'round' ? '1 J' : '0 J');
  }
  const op = fill && stroke ? 'B' : fill ? 'f' : 'S';
  return `q ${state.join(' ')} ${geometry} ${op} Q`;
}

/** Minimal SVG -> PDF for the svg-drawing exporter's output subset. */
export function minimalSvgToPdf(svg: string): Uint8Array {
  const root = /<svg\b([^>]*)>/.exec(svg);
  if (!root) throw new Error('minimalSvgToPdf: no <svg> root');
  const rootAttrs = parseAttrs(root[1]);
  const [, , vbW, vbH] = (rootAttrs.viewBox ?? '0 0 297 210').split(/\s+/).map(Number);
  const pageW = vbW * PT_PER_MM;
  const pageH = vbH * PT_PER_MM;

  const content: string[] = [
    // Sheet millimetres, y down — the SVG user space.
    `1 0 0 -1 0 ${n(pageH)} cm ${n(PT_PER_MM)} 0 0 ${n(PT_PER_MM)} 0 0 cm`,
  ];

  const stack: Attrs[] = [{ ...rootAttrs, fill: rootAttrs.fill ?? '#000' }];
  const inherited = (): Attrs => stack[stack.length - 1];
  const tagRe = /<(\/?)([\w:-]+)([^>]*?)(\/?)>|([^<]+)/g;
  let inDefs = 0;
  let pendingText: Attrs | null = null;

  for (const m of svg.slice(root.index + root[0].length).matchAll(tagRe)) {
    const [, closing, tag, attrSrc, selfClosing, textNode] = m;
    if (textNode !== undefined) {
      if (pendingText && textNode.trim().length > 0) {
        content.push(textOps(decodeEntities(textNode), pendingText));
      }
      continue;
    }
    if (tag === 'defs') {
      inDefs += closing ? -1 : selfClosing ? 0 : 1;
      continue;
    }
    if (inDefs > 0) continue;
    if (closing) {
      if (tag === 'g' || tag === 'svg') stack.pop();
      if (tag === 'text') pendingText = null;
      continue;
    }
    const a: Attrs = { ...inherited(), ...parseAttrs(attrSrc) };
    // `transform` does not inherit into children for our subset; text handles its own.
    switch (tag) {
      case 'g':
        if (!selfClosing) stack.push(a);
        break;
      case 'path':
        content.push(paint(pathOps(a.d ?? ''), a));
        break;
      case 'line':
        content.push(paint(`${n(+a.x1)} ${n(+a.y1)} m ${n(+a.x2)} ${n(+a.y2)} l`, { ...a, fill: 'none' }));
        break;
      case 'rect':
        content.push(paint(`${n(+a.x)} ${n(+a.y)} ${n(+a.width)} ${n(+a.height)} re`, a));
        break;
      case 'circle':
        content.push(paint(circleOps(+a.cx, +a.cy, +a.r), a));
        break;
      case 'text':
        pendingText = selfClosing ? null : a;
        break;
      default:
        break;
    }
  }

  const contentBytes = Buffer.from(content.filter(Boolean).join('\n'), 'latin1');
  return buildPdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(pageW)} ${n(pageH)}] ` +
      '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    streamObject('', contentBytes),
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ]);
}

function textOps(text: string, a: Attrs): string {
  const size = Number(a['font-size'] ?? '3');
  const width = helveticaWidth(text, size);
  const anchor = a['text-anchor'] ?? 'start';
  const shift = anchor === 'middle' ? -width / 2 : anchor === 'end' ? -width : 0;
  const x = Number(a.x ?? '0');
  const y = Number(a.y ?? '0');
  // rotate(deg cx cy) about the anchor — the only transform the exporter puts on text.
  const rot = /rotate\(\s*(-?[\d.]+)/.exec(a.transform ?? '');
  const deg = rot ? Number(rot[1]) : 0;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  // Local frame: translate to the anchor, rotate in SVG (y-down) space, then
  // flip y so glyphs stand upright under the page's y-down CTM.
  return [
    `q ${colorOp(a.fill, false)}`,
    `1 0 0 1 ${n(x)} ${n(y)} cm`,
    `${n(cos)} ${n(sin)} ${n(-sin)} ${n(cos)} 0 0 cm`,
    '1 0 0 -1 0 0 cm',
    `BT /F1 ${n(size)} Tf ${n(shift)} 0 Td ${winAnsiHex(text)} Tj ET Q`,
  ].join(' ');
}

/** A single-page PDF whose only content is an embedded 8-bit greyscale image. */
export function writeRasterPdf(opts: { widthPx: number; heightPx: number; pixels: Uint8Array; pageMm?: [number, number] }): Uint8Array {
  const [wMm, hMm] = opts.pageMm ?? [297, 210];
  const pageW = wMm * PT_PER_MM;
  const pageH = hMm * PT_PER_MM;
  const image = deflateSync(Buffer.from(opts.pixels));
  const content = Buffer.from(`q ${n(pageW)} 0 0 ${n(pageH)} 0 0 cm /Im1 Do Q`, 'latin1');
  return buildPdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(pageW)} ${n(pageH)}] ` +
      '/Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>',
    streamObject('', content),
    streamObject(
      `/Type /XObject /Subtype /Image /Width ${opts.widthPx} /Height ${opts.heightPx} ` +
        '/ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode',
      image,
    ),
  ]);
}
