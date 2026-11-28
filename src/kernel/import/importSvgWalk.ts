// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/import/importSvgWalk.ts
//
// The SVG element walk: group transforms, skipped non-rendering subtrees and
// same-document `<use>` expansion, including `<symbol>` viewports. It hands each geometry element, with its
// final user-space-to-mm matrix, to the emitter that importSvg.ts supplies,
// so this module never needs to know how a <rect> or <path> becomes contours.

import {
  SvgParseError,
  IDENTITY,
  attrNum,
  mul,
  parsePreserveAspectRatio,
  parseTransform,
  parseViewBox,
  type Matrix,
  type Tag,
} from './importSvgParsing';

/** Draws one geometry element (`lower` is its lower-cased name) under `m`. */
export type GeometryEmitter = (lower: string, tag: Tag, m: Matrix) => void;

const NON_RENDERING = new Set(['defs', 'title', 'desc', 'metadata', 'style', 'script', 'clippath', 'mask', 'marker', 'symbol', 'lineargradient', 'radialgradient', 'pattern', 'filter', 'namedview', 'sodipodi', 'switch', 'animate', 'animatetransform', 'set']);

/** Shared state for one element walk, including `<use>` expansion. */
interface WalkContext {
  tags: Tag[];
  /** First element carrying each `id` (later duplicates lose, as in browsers). */
  ids: Map<string, number>;
  emit: GeometryEmitter;
  ignoredElements: string[];
  /** Ids of the `<use>` targets being expanded, outermost first. */
  useChain: string[];
  expansions: number;
}

/** Ceiling on `<use>` instantiations per document. Nested references fan out
 *  multiplicatively, so a short file could otherwise expand without bound. */
const MAX_USE_EXPANSIONS = 10_000;

/** Walk the element stream once, maintaining the transform stack and the
 *  non-rendering skip depth, and hand each geometry element to the emitter. */
export function emitSvgElements(
  tags: Tag[],
  rootMatrix: Matrix,
  emit: GeometryEmitter,
  ignoredElements: string[],
): void {
  const ids = new Map<string, number>();
  tags.forEach((tag, i) => {
    const id = tag.closing ? undefined : tag.attrs.id;
    if (id !== undefined && !ids.has(id)) ids.set(id, i);
  });
  walkTags({ tags, ids, emit, ignoredElements, useChain: [], expansions: 0 }, 0, tags.length, rootMatrix);
}

/** Emit the elements in `tags[from, to)` under the base transform `base`. */
function walkTags(ctx: WalkContext, from: number, to: number, base: Matrix): void {
  const stack: Matrix[] = [base];
  let skipDepth = 0;

  for (let i = from; i < to; i++) {
    const tag = ctx.tags[i];
    if (tag.name === 'svg') continue;

    const lower = tag.name.toLowerCase();

    if (skipDepth > 0) {
      skipDepth = advanceSkipDepth(tag, skipDepth);
      continue;
    }

    if (tag.closing) {
      closeOpenGroup(lower, stack);
      continue;
    }

    if (NON_RENDERING.has(lower)) {
      ctx.ignoredElements.push(`<${tag.name}> at offset ${tag.offset}`);
      if (!tag.selfClosing) skipDepth = 1;
      continue;
    }

    const parent = stack[stack.length - 1];
    const local = localTransform(tag);
    const m = mul(parent, local);

    if (lower === 'g') {
      // A self-closing <g> holds nothing; only push for a real subtree.
      if (!tag.selfClosing) stack.push(m);
    } else if (lower === 'use') {
      expandUse(ctx, tag, m);
    } else {
      ctx.emit(lower, tag, m);
    }
  }
}

/**
 * Instantiate the element a `<use>` references, as SVG 2 §5.6 defines it:
 * the target is drawn under the `<use>`'s own transform followed by
 * `translate(x, y)`, then the target's own transform. The target's
 * ancestors' transforms do NOT apply, and a target inside `<defs>` or a
 * `<symbol>` is drawn even though the definition itself is not.
 */
function expandUse(ctx: WalkContext, tag: Tag, m: Matrix): void {
  const where = `<use> at offset ${tag.offset}`;
  const id = hrefTargetId(tag, where);
  const index = ctx.ids.get(id);
  if (index === undefined) {
    throw new SvgParseError(
      'malformed-attribute',
      `${where}: references '#${id}', but no element in the document has id='${id}'.`,
    );
  }
  if (ctx.useChain.includes(id)) {
    throw new SvgParseError(
      'malformed-attribute',
      `${where}: circular reference ${[...ctx.useChain, id].map(v => `#${v}`).join(' -> ')}.`,
    );
  }
  if (++ctx.expansions > MAX_USE_EXPANSIONS) {
    throw new SvgParseError(
      'malformed-attribute',
      `${where}: more than ${MAX_USE_EXPANSIONS} <use> instances; nested references expand too far to import.`,
    );
  }

  const target = ctx.tags[index];
  const lower = target.name.toLowerCase();
  const placed = mul(m, [1, 0, 0, 1, attrNum(tag, 'x', 0), attrNum(tag, 'y', 0)]);
  const targetWhere = `<${target.name}> at offset ${target.offset} (via ${where})`;
  if (lower === 'svg') {
    // A nested <svg> brings its own x/y, overflow and percentage lengths;
    // getting any of them wrong silently moves or resizes every instance.
    throw new SvgParseError(
      'unsupported-element',
      `${targetWhere}: a <use> of a nested <svg> is not supported. ` +
        'Reference a <g> or a <symbol>, or convert the clones to paths in the source tool ' +
        '(Inkscape: Edit > Clone > Unlink Clone).',
    );
  }

  ctx.useChain.push(id);
  let tm = mul(placed, localTransform(target));
  if (lower === 'symbol' && target.attrs.viewBox !== undefined) {
    tm = mul(tm, symbolViewportTransform(tag, target, targetWhere));
  }
  if (lower === 'g' || lower === 'symbol') {
    if (!target.selfClosing) walkTags(ctx, index + 1, matchingClose(ctx.tags, index, targetWhere), tm);
  } else if (lower === 'use') {
    expandUse(ctx, target, tm);
  } else if (NON_RENDERING.has(lower)) {
    throw new SvgParseError(
      'unsupported-element',
      `${targetWhere}: a <use> of a non-rendering <${target.name}> draws nothing kernelCAD can import.`,
    );
  } else {
    ctx.emit(lower, target, tm);
  }
  ctx.useChain.pop();
}

/**
 * The viewBox-to-viewport transform of a `<symbol>` drawn by a `<use>`
 * (SVG 2 §5.6 and §8.2): the viewport is `width` x `height` at the
 * `<use>`'s x/y (already applied), with the `<use>` size overriding the
 * symbol's, and the viewBox is fitted into it by `preserveAspectRatio`.
 * Inputs the import cannot resolve exactly are refused: a missing or
 * percentage size (relative to a viewport CAD has no size for), `slice`
 * (which clips), and `refX`/`refY` or symbol `x`/`y` offsets.
 */
function symbolViewportTransform(use: Tag, symbol: Tag, where: string): Matrix {
  const viewBox = parseViewBox(symbol.attrs.viewBox, where)!;
  for (const name of ['x', 'y', 'refX', 'refY']) {
    const raw = symbol.attrs[name]?.trim();
    if (raw !== undefined && raw !== '' && Number(raw) !== 0) {
      throw new SvgParseError(
        'unsupported-element',
        `${where}: ${name}='${raw}' on a <symbol> with a viewBox is not supported; ` +
          'place the symbol with the <use> x/y or a transform instead.',
      );
    }
  }
  const width = viewportLength(use, symbol, 'width', where);
  const height = viewportLength(use, symbol, 'height', where);
  const aspect = parsePreserveAspectRatio(symbol.attrs.preserveAspectRatio);
  const sx = width / viewBox.width;
  const sy = height / viewBox.height;
  if (aspect.mode === 'none') return [sx, 0, 0, sy, -sx * viewBox.minX, -sy * viewBox.minY];
  if (aspect.mode === 'slice') {
    throw new SvgParseError(
      'unsupported-element',
      `${where}: preserveAspectRatio='${symbol.attrs.preserveAspectRatio!.trim()}' clips the symbol to its ` +
        'viewport, and the import does not clip geometry. Use meet or none, or expand the symbol in the source tool.',
    );
  }
  const s = Math.min(sx, sy);
  return [
    s, 0, 0, s,
    (width - s * viewBox.width) * aspect.alignX - s * viewBox.minX,
    (height - s * viewBox.height) * aspect.alignY - s * viewBox.minY,
  ];
}

/** A symbol viewport `width`/`height` in user units: the `<use>` value
 *  wins over the `<symbol>` one, and a plain or `px` number is required. */
function viewportLength(use: Tag, symbol: Tag, name: 'width' | 'height', where: string): number {
  const raw = (use.attrs[name] ?? symbol.attrs[name])?.trim();
  if (raw === undefined || raw === '' || raw === 'auto') {
    throw new SvgParseError(
      'unsupported-element',
      `${where}: a <symbol> with a viewBox needs a viewport size, but neither the <use> nor the <symbol> ` +
        `sets ${name}, and the SVG default (100% of the enclosing viewport) has no size in a CAD import. ` +
        `Set ${name} on the <use>.`,
    );
  }
  const value = Number(raw.replace(/px$/, ''));
  if (!Number.isFinite(value) || value <= 0) {
    throw new SvgParseError(
      'unsupported-element',
      `${where}: viewport ${name}='${raw}' must be a positive number of user units.`,
    );
  }
  return value;
}

/** The `#id` a `<use>` points at, from `href` (SVG 2) or `xlink:href` (SVG 1.1). */
function hrefTargetId(tag: Tag, where: string): string {
  const raw = (tag.attrs.href ?? tag.attrs['xlink:href'])?.trim();
  if (raw === undefined || raw === '') {
    throw new SvgParseError('malformed-attribute', `${where}: has no href, so it references nothing.`);
  }
  if (!raw.startsWith('#') || raw.length === 1) {
    throw new SvgParseError(
      'unsupported-element',
      `${where}: href='${raw}' points outside this document; only same-document references ('#id') ` +
        'are expanded. Embed the referenced geometry in the file.',
    );
  }
  return raw.slice(1);
}

/** Index of the closing tag that ends the element opened at `open`. */
function matchingClose(tags: Tag[], open: number, where: string): number {
  let depth = 0;
  for (let j = open; j < tags.length; j++) {
    if (tags[j].closing) depth--;
    else if (!tags[j].selfClosing) depth++;
    if (depth === 0) return j;
  }
  throw new SvgParseError('malformed-attribute', `${where}: the element is never closed.`);
}

function localTransform(tag: Tag): Matrix {
  return tag.attrs.transform !== undefined
    ? parseTransform(tag.attrs.transform, `<${tag.name}> at offset ${tag.offset}`)
    : IDENTITY;
}

/** Inside a non-rendering subtree: track nesting so `</defs>` ends it. */
function advanceSkipDepth(tag: Tag, skipDepth: number): number {
  if (!tag.closing && !tag.selfClosing) return skipDepth + 1;
  if (tag.closing) return skipDepth - 1;
  return skipDepth;
}

function closeOpenGroup(lower: string, stack: Matrix[]): void {
  if (lower === 'g' && stack.length > 1) stack.pop();
}
