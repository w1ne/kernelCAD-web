// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/import/importSvgWalk.ts
//
// The SVG element walk: group transforms, skipped non-rendering subtrees and
// same-document `<use>` expansion. It hands each geometry element, with its
// final user-space-to-mm matrix, to the emitter that importSvg.ts supplies,
// so this module never needs to know how a <rect> or <path> becomes contours.

import { SvgParseError, IDENTITY, attrNum, mul, parseTransform, type Matrix, type Tag } from './importSvgParsing';

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
  if (lower === 'svg' || (lower === 'symbol' && target.attrs.viewBox !== undefined)) {
    // These establish a new viewport: the use's width/height and the
    // target's viewBox/preserveAspectRatio would set the scale, and getting
    // that wrong silently resizes every instance.
    throw new SvgParseError(
      'unsupported-element',
      `${targetWhere}: a referenced <${target.name}> with its own viewport (viewBox) is not supported. ` +
        'Reference a <g> or a viewBox-free <symbol>, or convert the clones to paths in the source tool ' +
        '(Inkscape: Edit > Clone > Unlink Clone).',
    );
  }

  ctx.useChain.push(id);
  const tm = mul(placed, localTransform(target));
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
