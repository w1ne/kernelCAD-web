// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Comment ranges of a TypeScript / JavaScript source, found by a small
// scanner instead of the TypeScript parser. Intent lint runs on every
// evaluate; building a full AST (and loading the ~64 MB `typescript`
// package) just to blank comments cost more than many models take to build.

export interface CommentRange {
  pos: number;
  end: number;
}

/** Keywords after which a `/` starts a regular expression, not a division. */
const REGEX_AFTER_WORD = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw',
  'case', 'do', 'else', 'yield', 'await',
]);

const IDENT = /[A-Za-z0-9_$\u0080-￿]/;
const SPACE = /[ \t\n\r]/;

/**
 * Every `//` and `/* *\/` comment in `src`, in order. Strings, template
 * literals (with nested `${}` code) and regular-expression literals are
 * skipped, so a `//` inside them is never taken for a comment.
 */
export function commentRanges(src: string): CommentRange[] {
  return new Scanner(src).run();
}

class Scanner {
  private i = 0;
  private depth = 0;
  /** Brace depth at which each open template literal's `${` resumes it. */
  private readonly templates: number[] = [];
  /** Whether a `/` here would start a regex (no value to its left). */
  private regexOk = true;
  private readonly out: CommentRange[] = [];

  constructor(private readonly src: string) {}

  run(): CommentRange[] {
    while (this.i < this.src.length) this.step();
    return this.out;
  }

  private step(): void {
    const c = this.src[this.i];
    const next = this.src[this.i + 1];
    if (c === '/' && (next === '/' || next === '*')) return this.comment(next === '*');
    if (c === '\'' || c === '"') return this.string(c);
    if (c === '`') {
      this.i++;
      return this.templateText();
    }
    if (c === '/' && this.regexOk) return this.regex();
    if (c === '{' || c === '}') return this.brace(c);
    if (IDENT.test(c)) return this.word();
    this.i++;
    if (SPACE.test(c)) return;
    // `)` and `]` end a value; any other punctuator expects an operand.
    this.regexOk = c !== ')' && c !== ']';
  }

  private comment(block: boolean): void {
    const start = this.i;
    if (block) {
      const close = this.src.indexOf('*/', this.i + 2);
      this.i = close < 0 ? this.src.length : close + 2;
    } else {
      const eol = this.src.indexOf('\n', this.i);
      this.i = eol < 0 ? this.src.length : eol;
    }
    this.out.push({ pos: start, end: this.i });
  }

  private string(quote: string): void {
    this.i++;
    while (this.i < this.src.length && this.src[this.i] !== quote && this.src[this.i] !== '\n') {
      this.i += this.src[this.i] === '\\' ? 2 : 1;
    }
    this.i++;
    this.regexOk = false;
  }

  /** Template text from just past "`" or a closing "}" of `${}`. */
  private templateText(): void {
    while (this.i < this.src.length) {
      const c = this.src[this.i];
      if (c === '\\') {
        this.i += 2;
      } else if (c === '`') {
        this.i++;
        this.regexOk = false;
        return;
      } else if (c === '$' && this.src[this.i + 1] === '{') {
        this.i += 2;
        this.templates.push(this.depth);
        this.depth++;
        this.regexOk = true;
        return;
      } else {
        this.i++;
      }
    }
  }

  private regex(): void {
    this.i++;
    let inClass = false;
    while (this.i < this.src.length && this.src[this.i] !== '\n') {
      const r = this.src[this.i];
      if (r === '\\') {
        this.i += 2;
        continue;
      }
      if (r === '/' && !inClass) break;
      if (r === '[') inClass = true;
      else if (r === ']') inClass = false;
      this.i++;
    }
    this.i++;
    while (this.i < this.src.length && /[a-z]/i.test(this.src[this.i])) this.i++;
    this.regexOk = false;
  }

  private brace(c: string): void {
    this.i++;
    this.regexOk = true;
    if (c === '{') {
      this.depth++;
      return;
    }
    this.depth--;
    if (this.templates.length > 0 && this.templates[this.templates.length - 1] === this.depth) {
      this.templates.pop();
      this.templateText();
    }
  }

  private word(): void {
    const start = this.i;
    while (this.i < this.src.length && IDENT.test(this.src[this.i])) this.i++;
    this.regexOk = REGEX_AFTER_WORD.has(this.src.slice(start, this.i));
  }
}
