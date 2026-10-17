// SPDX-License-Identifier: MIT
// A drawing sheet SVG as DXF R2013 (AC1027), millimetres, y up.
// AutoCAD, Fusion, Onshape, and SolidWorks open this. It is the open form of
// the simplified DWG those tools export from a drawing.

const pair = (code: number, value: string | number): string => `${code}\n${value}\n`;

function num(attrs: Record<string, string>, name: string): number {
  const n = Number(attrs[name]);
  return Number.isFinite(n) ? n : 0;
}

function layerFor(cls: string, tag: string): string {
  if (cls.includes('hidden')) return 'HIDDEN';
  if (cls.includes('dim') || tag === 'text') return 'ANNOTATION';
  return 'GEOMETRY';
}

function viewHeight(svg: string): number {
  const box = /viewBox\s*=\s*"([^"]+)"/.exec(svg)?.[1] ?? '';
  const parts = box.trim().split(/[\s,]+/).map(Number);
  return parts.length === 4 && parts[3] > 0 ? parts[3] : 0;
}

interface AttrEl { tag: string; attrs: Record<string, string>; text: string; cls: string }

function attrsOf(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of src.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

const DRAWABLE = new Set(['line', 'circle', 'rect', 'path', 'text']);

function closeTag(tag: string, classes: string[], text: AttrEl | null): AttrEl | null {
  if (tag === 'g' && classes.length > 1) classes.pop();
  return tag === 'text' ? null : text;
}

function openTag(tag: string, attrSrc: string, selfClose: string, classes: string[], out: AttrEl[]): AttrEl | null {
  const attrs = attrsOf(attrSrc);
  const cls = `${classes[classes.length - 1] ?? ''} ${attrs.class ?? ''}`.trim();
  if (tag === 'g') classes.push(cls);
  if (!DRAWABLE.has(tag)) return null;
  const el: AttrEl = { tag, attrs, text: '', cls };
  out.push(el);
  return tag === 'text' && !selfClose ? el : null;
}

/** Elements we can draw, with the class of the group that contains them. */
function elements(svg: string): AttrEl[] {
  const out: AttrEl[] = [];
  const classes: string[] = [''];
  const re = /<(\/?)([A-Za-z][\w:.-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let text: AttrEl | null = null;
  for (const m of svg.matchAll(re)) {
    const [, closing, tag, attrSrc, selfClose, raw] = m;
    if (raw !== undefined) { if (text) text.text += raw; continue; }
    if (!tag) continue;
    text = closing ? closeTag(tag, classes, text) : openTag(tag, attrSrc ?? '', selfClose ?? '', classes, out);
  }
  return out;
}

function pathLoops(d: string): Array<{ pts: Array<[number, number]>; closed: boolean }> {
  const loops: Array<{ pts: Array<[number, number]>; closed: boolean }> = [];
  let pts: Array<[number, number]> = [];
  let cx = 0;
  let cy = 0;
  let closed = false;
  const tokens = d.match(/[MLHVZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const take = (i: number) => Number(tokens[i]);
  for (let i = 0; i < tokens.length;) {
    const op = tokens[i].toUpperCase();
    if (op === 'M' || op === 'L') {
      if (op === 'M' && pts.length > 1) { loops.push({ pts, closed }); pts = []; closed = false; }
      cx = take(i + 1); cy = take(i + 2); pts.push([cx, cy]); i += 3;
    } else if (op === 'H') { cx = take(i + 1); pts.push([cx, cy]); i += 2; }
    else if (op === 'V') { cy = take(i + 1); pts.push([cx, cy]); i += 2; }
    else if (op === 'Z') { closed = true; i += 1; }
    else i += 1;
  }
  if (pts.length > 1) loops.push({ pts, closed });
  return loops;
}

function poly(pts: Array<[number, number]>, closed: boolean, layer: string, height: number): string {
  const flag = closed ? 1 : 0;
  const verts = pts.map(([x, y]) => pair(10, round(x)) + pair(20, round(height - y))).join('');
  return pair(0, 'LWPOLYLINE') + pair(8, layer) + pair(90, pts.length) + pair(70, flag) + verts;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function textRotation(transform: string | undefined): number {
  const m = /rotate\(\s*(-?\d*\.?\d+)/.exec(transform ?? '');
  if (!m) return 0;
  return round(-Number(m[1]));
}

function entity(el: AttrEl, height: number): string {
  const layer = layerFor(el.cls, el.tag);
  const y = (v: number) => round(height - v);
  if (el.tag === 'line') {
    return pair(0, 'LINE') + pair(8, layer) +
      pair(10, round(num(el.attrs, 'x1'))) + pair(20, y(num(el.attrs, 'y1'))) +
      pair(11, round(num(el.attrs, 'x2'))) + pair(21, y(num(el.attrs, 'y2')));
  }
  if (el.tag === 'circle') {
    return pair(0, 'CIRCLE') + pair(8, layer) +
      pair(10, round(num(el.attrs, 'cx'))) + pair(20, y(num(el.attrs, 'cy'))) +
      pair(40, round(num(el.attrs, 'r')));
  }
  if (el.tag === 'rect') {
    const x = num(el.attrs, 'x');
    const top = num(el.attrs, 'y');
    const w = num(el.attrs, 'width');
    const h = num(el.attrs, 'height');
    return poly([[x, top], [x + w, top], [x + w, top + h], [x, top + h]], true, layer, height);
  }
  if (el.tag === 'path') {
    return pathLoops(el.attrs.d ?? '').map((loop) => poly(loop.pts, loop.closed, layer, height)).join('');
  }
  const label = el.text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  if (!label) return '';
  return pair(0, 'TEXT') + pair(8, layer) +
    pair(10, round(num(el.attrs, 'x'))) + pair(20, y(num(el.attrs, 'y'))) +
    pair(40, round(num(el.attrs, 'font-size') || 2.5)) +
    pair(1, label) + pair(50, textRotation(el.attrs.transform));
}

/** DXF of one drawing sheet. Coordinates are millimetres, y up. */
export function svgSheetToDxf(svg: string): string {
  const height = viewHeight(svg);
  const body = elements(svg).map((el) => entity(el, height)).join('');
  return pair(0, 'SECTION') + pair(2, 'HEADER') +
    pair(9, '$ACADVER') + pair(1, 'AC1027') +
    pair(9, '$INSUNITS') + pair(70, 4) +
    pair(9, '$MEASUREMENT') + pair(70, 1) +
    pair(0, 'ENDSEC') +
    pair(0, 'SECTION') + pair(2, 'ENTITIES') +
    body +
    pair(0, 'ENDSEC') +
    pair(0, 'EOF');
}
