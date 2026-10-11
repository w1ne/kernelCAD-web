// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The Markdown a blog post may use. A small subset, so every tag on the page is
// one this file chose; anything outside it fails with its line instead of
// rendering as something nobody checked.
//
// Blocks: paragraphs, `##` and `###` headings, `-` and `1.` lists, ``` fences,
// an image alone on its line (a figure; the "title" is the caption), and HTML
// comments (dropped, except `<!-- check ... -->`, which the build reads).
// Inline: `code`, [links](url), **bold**, *emphasis*, backslash escapes.
// Not supported: tables, block quotes, raw HTML, level-1 headings (the title
// comes from front matter), indented code, horizontal rules.

export interface HeadingBlock { readonly kind: 'heading'; readonly level: 2 | 3; readonly text: string; readonly line: number }
export interface ParagraphBlock { readonly kind: 'paragraph'; readonly text: string; readonly line: number }
export interface ListBlock { readonly kind: 'list'; readonly ordered: boolean; readonly items: readonly string[]; readonly line: number }
export interface CodeBlock { readonly kind: 'code'; readonly lang: string; readonly code: string; readonly line: number }
export interface FigureBlock {
  readonly kind: 'figure';
  readonly alt: string;
  /** As written: relative to the Markdown file. */
  readonly src: string;
  readonly caption: string | null;
  readonly line: number;
}
/** A `<!-- check ... -->` comment; `text` is what sits between `check` and `-->`. */
export interface CheckBlock { readonly kind: 'check'; readonly text: string; readonly line: number }

export type Block = HeadingBlock | ParagraphBlock | ListBlock | CodeBlock | FigureBlock | CheckBlock;

/** A Markdown problem at a line of the file. */
export class MarkdownError extends Error {
  readonly line: number;
  readonly detail: string;

  constructor(line: number, detail: string) {
    super(`line ${line}: ${detail}`);
    this.name = 'MarkdownError';
    this.line = line;
    this.detail = detail;
  }
}

const FENCE_OPEN = /^```([\w+-]*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*?)\s*$/;
const IMAGE = /^!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)\s*$/;
const LIST_ITEM = /^(?:([-*])|(\d+)\.)\s+(.*)$/;
const COMMENT = /^<!--([\s\S]*?)-->\s*$/;

const UNSUPPORTED: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\s*>/, 'block quotes are not supported'],
  [/^\s*\|/, 'tables are not supported; use a list or a code block'],
  [/^\s*<[A-Za-z/]/, 'raw HTML is not supported; use Markdown'],
  [/^ {4,}\S/, 'indented code is not supported; use a ``` fence'],
  [/^\s*~~~/, 'use ``` for code fences'],
  [/^\s*([-*_])(\s*\1){2,}\s*$/, 'horizontal rules and underlined headings are not supported'],
];

interface Open {
  paragraph: { lines: string[]; line: number } | null;
  list: { ordered: boolean; items: string[]; line: number } | null;
}

/**
 * Splits a post body into blocks. `firstLine` is the file line the body starts
 * on, so every block and every error carries a line of the real file.
 */
export function parseBlocks(body: string, firstLine: number): Block[] {
  const lines = body.split('\n').map((line) => line.trimEnd());
  const blocks: Block[] = [];
  const open: Open = { paragraph: null, list: null };
  const flush = (): void => {
    if (open.paragraph) blocks.push({ kind: 'paragraph', text: open.paragraph.lines.join(' '), line: open.paragraph.line });
    if (open.list) blocks.push({ kind: 'list', ...open.list });
    open.paragraph = null;
    open.list = null;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const lineNo = firstLine + i;
    if (line.trim() === '') {
      flush();
      i += 1;
    } else if (FENCE_OPEN.test(line) || line.startsWith('<!--')) {
      flush();
      const block = line.startsWith('<!--') ? readComment(lines, i, firstLine) : readFence(lines, i, firstLine);
      if (block.block) blocks.push(block.block);
      i = block.next;
    } else {
      if (!structuralLine(line, lineNo, open, flush, blocks)) textLine(line, lineNo, open, flush);
      i += 1;
    }
  }
  flush();

  if (blocks.length === 0) throw new MarkdownError(firstLine, 'the post has no text');
  if (blocks[0].kind !== 'paragraph') {
    throw new MarkdownError(blocks[0].line, 'a post starts with a paragraph, the lede');
  }
  return blocks;
}

/** Headings, figures and list items. Returns false for a plain text line. */
function structuralLine(line: string, lineNo: number, open: Open, flush: () => void, blocks: Block[]): boolean {
  const heading = HEADING.exec(line);
  if (heading) {
    flush();
    const level = heading[1].length;
    if (level === 1) throw new MarkdownError(lineNo, 'the title comes from front matter; remove the level-1 heading');
    if (level > 3) throw new MarkdownError(lineNo, 'only ## and ### headings are supported');
    blocks.push({ kind: 'heading', level: level as 2 | 3, text: heading[2], line: lineNo });
    return true;
  }
  const image = IMAGE.exec(line);
  if (image) {
    flush();
    blocks.push({ kind: 'figure', alt: image[1], src: image[2], caption: image[3] ?? null, line: lineNo });
    return true;
  }
  const item = LIST_ITEM.exec(line);
  // As in CommonMark, a numbered line inside a paragraph starts a list only
  // when it is item 1, so wrapped text that begins "12. " stays text.
  if (item && !(open.paragraph && item[2] !== undefined && item[2] !== '1')) {
    const ordered = item[2] !== undefined;
    if (!open.list || open.list.ordered !== ordered) {
      flush();
      open.list = { ordered, items: [], line: lineNo };
    }
    open.list.items.push(item[3].trim());
    return true;
  }
  return false;
}

/** A line of running text: continues the list item or paragraph it belongs to. */
function textLine(line: string, lineNo: number, open: Open, flush: () => void): void {
  if (open.list) {
    // An indented line, or a lazy one straight after an item, continues it.
    const items = open.list.items;
    items[items.length - 1] = `${items[items.length - 1]} ${line.trim()}`;
    return;
  }
  for (const [pattern, detail] of UNSUPPORTED) {
    if (pattern.test(line)) throw new MarkdownError(lineNo, detail);
  }
  if (!open.paragraph) {
    flush();
    open.paragraph = { lines: [], line: lineNo };
  }
  open.paragraph.lines.push(line.trim());
}

function readFence(lines: readonly string[], start: number, firstLine: number): { block: CodeBlock; next: number } {
  const lang = FENCE_OPEN.exec(lines[start])![1];
  const end = lines.findIndex((line, i) => i > start && line.trim() === '```');
  if (end === -1) throw new MarkdownError(firstLine + start, 'a ``` fence is never closed');
  return {
    block: { kind: 'code', lang, code: lines.slice(start + 1, end).join('\n'), line: firstLine + start },
    next: end + 1,
  };
}

function readComment(lines: readonly string[], start: number, firstLine: number): { block: CheckBlock | null; next: number } {
  const line = lines[start];
  const single = COMMENT.exec(line);
  if (single) {
    const inner = single[1].trim();
    const check = /^check\b\s*([\s\S]*)$/.exec(inner);
    return { block: check ? { kind: 'check', text: check[1].trim(), line: firstLine + start } : null, next: start + 1 };
  }
  if (line.includes('-->')) throw new MarkdownError(firstLine + start, 'put nothing after --> on the line of a comment');
  if (/^<!--\s*check\b/.test(line)) throw new MarkdownError(firstLine + start, 'a check comment must fit on one line');
  const end = lines.findIndex((l, i) => i > start && l.includes('-->'));
  if (end === -1) throw new MarkdownError(firstLine + start, 'an HTML comment is never closed');
  if (!/-->\s*$/.test(lines[end])) throw new MarkdownError(firstLine + end, 'put nothing after --> on the line of a comment');
  return { block: null, next: end + 1 };
}

// ---- inline ----------------------------------------------------------------

type Inline =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'link'; readonly href: string; readonly children: readonly Inline[] }
  | { readonly kind: 'strong' | 'em'; readonly children: readonly Inline[] };

const ESCAPABLE = '\\`*_[]()#!<>-.+';

function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let text = '';
  const pushText = (): void => {
    if (text) out.push({ kind: 'text', text });
    text = '';
  };
  let i = 0;
  while (i < source.length) {
    const span = inlineSpan(source, i);
    if (span) {
      pushText();
      out.push(span.node);
      i = span.end;
    } else if (source[i] === '\\' && ESCAPABLE.includes(source[i + 1] ?? '')) {
      text += source[i + 1];
      i += 2;
    } else {
      text += source[i];
      i += 1;
    }
  }
  pushText();
  return out;
}

/** The code span, link, bold or emphasis starting at `i`, if one does. */
function inlineSpan(source: string, i: number): { node: Inline; end: number } | null {
  const c = source[i];
  if (c === '`') {
    const end = source.indexOf('`', i + 1);
    return end > i ? { node: { kind: 'code', text: source.slice(i + 1, end) }, end: end + 1 } : null;
  }
  if (c === '[') {
    const close = source.indexOf('](', i + 1);
    const end = close === -1 ? -1 : source.indexOf(')', close + 2);
    if (close === -1 || end === -1 || source.slice(i + 1, close).includes('[')) return null;
    const href = source.slice(close + 2, end);
    if (href === '' || /\s/.test(href)) return null;
    return { node: { kind: 'link', href, children: parseInline(source.slice(i + 1, close)) }, end: end + 1 };
  }
  if (source.startsWith('**', i)) {
    const end = source.indexOf('**', i + 2);
    return end > i + 2 ? { node: { kind: 'strong', children: parseInline(source.slice(i + 2, end)) }, end: end + 2 } : null;
  }
  if (c === '*' && /\S/.test(source[i + 1] ?? '')) {
    const end = source.indexOf('*', i + 1);
    if (end > i + 1 && /\S/.test(source[end - 1]) && source[end + 1] !== '*') {
      return { node: { kind: 'em', children: parseInline(source.slice(i + 1, end)) }, end: end + 1 };
    }
  }
  return null;
}

/** Escape for HTML text content. Quotes stay as they are. */
export function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escape for a double-quoted attribute value. */
export function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, '&quot;');
}

function toHtml(nodes: readonly Inline[]): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case 'text':
          return escapeText(node.text);
        case 'code':
          return `<code>${escapeText(node.text)}</code>`;
        case 'link':
          return `<a href="${escapeAttr(node.href)}">${toHtml(node.children)}</a>`;
        case 'strong':
          return `<strong>${toHtml(node.children)}</strong>`;
        case 'em':
          return `<em>${toHtml(node.children)}</em>`;
      }
    })
    .join('');
}

function toText(nodes: readonly Inline[]): string {
  return nodes.map((node) => ('children' in node ? toText(node.children) : node.text)).join('');
}

/** A line of Markdown text as HTML. */
export function renderInline(source: string): string {
  return toHtml(parseInline(source));
}

/** A line of Markdown text as the words a reader sees, markup removed. */
export function plainText(source: string): string {
  return toText(parseInline(source));
}
