// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Blank TypeScript type syntax so acorn (JS-only) can analyze `.kcad.ts`.
 *
 * Type-only spans become spaces so line/column locations stay aligned with
 * the original source. This is not a compiler — Studio still executes
 * modern scripts on the node kernel, which transpiles TypeScript for real.
 */

const IDENT_START = /[A-Za-z_$]/;
const IDENT_PART = /[A-Za-z0-9_$]/;

type BraceKind = 'block' | 'object' | 'spec';

export function stripTypeScriptSyntax(source: string): string {
    const n = source.length;
    const out = source.split('');
    let i = 0;
    let lastKind: 'ident' | 'number' | 'string' | 'punct' | null = null;
    let lastPunct = '';
    let lastIdent = '';
    let statementStart = true;
    let expectBinding = false;
    let inImport = false;
    const braces: BraceKind[] = [];

    const blank = (start: number, end: number): void => {
        const to = Math.min(end, n);
        for (let k = start; k < to; k++) {
            if (out[k] !== '\n' && out[k] !== '\r') out[k] = ' ';
        }
    };

    const peek = (d = 0): string => source[i + d] ?? '';

    const skipWs = (): void => {
        while (i < n) {
            const c = source[i];
            if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v') {
                if (c === '\n' || c === '\r') statementStart = true;
                i++;
                continue;
            }
            break;
        }
    };

    const skipLineComment = (): void => {
        i += 2;
        while (i < n && source[i] !== '\n' && source[i] !== '\r') i++;
    };

    const skipBlockComment = (): void => {
        i += 2;
        while (i < n && !(source[i] === '*' && source[i + 1] === '/')) i++;
        if (i < n) i += 2;
    };

    const skipString = (quote: string): void => {
        i++;
        while (i < n) {
            const c = source[i];
            if (c === '\\') {
                i += 2;
                continue;
            }
            if (c === quote) {
                i++;
                return;
            }
            if (c === '\n') return;
            i++;
        }
    };

    const skipTemplate = (): void => {
        i++;
        while (i < n) {
            const c = source[i];
            if (c === '\\') {
                i += 2;
                continue;
            }
            if (c === '`') {
                i++;
                return;
            }
            if (c === '$' && source[i + 1] === '{') {
                i += 2;
                let depth = 1;
                while (i < n && depth > 0) {
                    const inner = source[i];
                    if (inner === '\\') {
                        i += 2;
                        continue;
                    }
                    if (inner === '`' || inner === '"' || inner === "'") {
                        skipString(inner);
                        continue;
                    }
                    if (inner === '{') depth++;
                    else if (inner === '}') depth--;
                    if (depth > 0) i++;
                }
                if (source[i] === '}') i++;
                continue;
            }
            i++;
        }
    };

    const skipCommentsAndWs = (): void => {
        for (;;) {
            skipWs();
            if (source[i] === '/' && source[i + 1] === '/') {
                skipLineComment();
                continue;
            }
            if (source[i] === '/' && source[i + 1] === '*') {
                skipBlockComment();
                continue;
            }
            break;
        }
    };

    const readIdent = (): string => {
        const start = i;
        i++;
        while (i < n && IDENT_PART.test(source[i]!)) i++;
        return source.slice(start, i);
    };

    const skipNumber = (): void => {
        if (source[i] === '0' && (source[i + 1] === 'x' || source[i + 1] === 'X' || source[i + 1] === 'b' || source[i + 1] === 'B' || source[i + 1] === 'o' || source[i + 1] === 'O')) {
            i += 2;
        }
        while (i < n && /[0-9a-fA-Fn._]/.test(source[i]!)) i++;
    };

    const skipType = (): boolean => {
        skipCommentsAndWs();
        const start = i;
        if (i >= n) return false;
        let angle = 0;
        let paren = 0;
        let bracket = 0;
        let brace = 0;
        let seenTerm = false;
        let progressed = false;

        const depth = (): number => angle + paren + bracket + brace;

        while (i < n) {
            skipCommentsAndWs();
            if (i >= n) break;
            const c = source[i]!;
            const d = depth();

            if (d === 0) {
                if (c === '=' && peek(1) !== '>' && peek(1) !== '=') break;
                if (c === ',' || c === ';' || c === ')') break;
                if (c === '}') break;
                if (c === '{' && seenTerm) break;
            }

            if (c === '"' || c === "'") {
                skipString(c);
                seenTerm = true;
                progressed = true;
                continue;
            }
            if (c === '`') {
                skipTemplate();
                seenTerm = true;
                progressed = true;
                continue;
            }
            if (c === '<' ) {
                angle++;
                i++;
                seenTerm = false;
                progressed = true;
                continue;
            }
            if (c === '>') {
                if (angle > 0) angle--;
                i++;
                seenTerm = true;
                progressed = true;
                continue;
            }
            if (c === '(') {
                paren++;
                i++;
                seenTerm = false;
                progressed = true;
                continue;
            }
            if (c === ')') {
                if (paren > 0) paren--;
                else break;
                i++;
                seenTerm = true;
                progressed = true;
                continue;
            }
            if (c === '[') {
                bracket++;
                i++;
                seenTerm = false;
                progressed = true;
                continue;
            }
            if (c === ']') {
                if (bracket > 0) bracket--;
                i++;
                seenTerm = true;
                progressed = true;
                continue;
            }
            if (c === '{') {
                brace++;
                i++;
                seenTerm = false;
                progressed = true;
                continue;
            }
            if (c === '}') {
                if (brace > 0) brace--;
                i++;
                seenTerm = true;
                progressed = true;
                continue;
            }
            if (c === '=' && peek(1) === '>') {
                i += 2;
                seenTerm = false;
                progressed = true;
                continue;
            }
            if (IDENT_START.test(c)) {
                readIdent();
                seenTerm = true;
                progressed = true;
                continue;
            }
            if (c === '.' || c === '|' || c === '&' || c === ':' || c === '?' || c === '!' || c === '*' || c === '-' || c === '+') {
                if (c === '|' || c === '&' || c === ':' || c === '.') seenTerm = false;
                i++;
                progressed = true;
                continue;
            }
            if (c >= '0' && c <= '9') {
                skipNumber();
                seenTerm = true;
                progressed = true;
                continue;
            }
            if (d === 0) break;
            i++;
            progressed = true;
        }

        return progressed && i > start;
    };

    const skipTypeAnnotation = (): boolean => {
        skipCommentsAndWs();
        if (source[i] !== ':') return false;
        const colon = i;
        i++;
        if (!skipType()) {
            i = colon;
            return false;
        }
        blank(colon, i);
        return true;
    };

    const looksLikeGeneric = (): boolean => {
        skipCommentsAndWs();
        if (source[i] !== '<') return false;
        const start = i;
        let angle = 1;
        i++;
        while (i < n && angle > 0) {
            skipCommentsAndWs();
            if (i >= n) {
                i = start;
                return false;
            }
            const c = source[i]!;
            if (c === '"' || c === "'") {
                skipString(c);
                continue;
            }
            if (c === '`') {
                skipTemplate();
                continue;
            }
            if (angle === 1 && c === '&' && peek(1) === '&') {
                i = start;
                return false;
            }
            if (angle === 1 && c === '|' && peek(1) === '|') {
                i = start;
                return false;
            }
            if (c === '<') {
                angle++;
                i++;
                continue;
            }
            if (c === '>') {
                angle--;
                i++;
                continue;
            }
            i++;
        }
        if (angle !== 0) {
            i = start;
            return false;
        }
        blank(start, i);
        return true;
    };

    const skipNonNull = (): void => {
        skipCommentsAndWs();
        if (source[i] !== '!') return;
        if (peek(1) === '=' || peek(1) === '!') return;
        blank(i, i + 1);
        i++;
    };

    const skipAsOrSatisfies = (keyword: string): boolean => {
        if (inImport) return false;
        if (braces[braces.length - 1] === 'spec') return false;
        if (lastPunct === '*') return false;
        if (lastKind !== 'ident' && lastKind !== 'number' && lastKind !== 'string' && lastPunct !== ')' && lastPunct !== ']' && lastPunct !== '}') {
            return false;
        }
        const start = i - keyword.length;
        skipCommentsAndWs();
        if (!skipType()) {
            i = start + keyword.length;
            return false;
        }
        blank(start, i);
        return true;
    };

    const skipBalancedBracesFrom = (openAt: number): void => {
        let depth = 1;
        i = openAt + 1;
        while (i < n && depth > 0) {
            const c = source[i]!;
            if (c === '"' || c === "'") {
                skipString(c);
                continue;
            }
            if (c === '`') {
                skipTemplate();
                continue;
            }
            if (c === '/' && peek(1) === '/') {
                skipLineComment();
                continue;
            }
            if (c === '/' && peek(1) === '*') {
                skipBlockComment();
                continue;
            }
            if (c === '{') depth++;
            else if (c === '}') depth--;
            i++;
        }
    };

    const skipDeclarationToSemiOrBrace = (): void => {
        while (i < n) {
            skipCommentsAndWs();
            const c = source[i];
            if (c === '"' || c === "'") {
                skipString(c);
                continue;
            }
            if (c === '`') {
                skipTemplate();
                continue;
            }
            if (c === '{') {
                const open = i;
                skipBalancedBracesFrom(open);
                return;
            }
            if (c === ';') {
                i++;
                return;
            }
            if (c === '\n' && lastKind === 'ident') {
                return;
            }
            i++;
        }
    };

    const classifyBrace = (): BraceKind => {
        if (inImport) return 'spec';
        if (lastPunct === '(' || lastPunct === ',' || lastPunct === '[' || lastPunct === '=' || lastPunct === ':' || lastPunct === '!') {
            return 'object';
        }
        if (lastIdent === 'return' || lastIdent === 'throw' || lastIdent === 'case' || lastIdent === 'yield' || lastIdent === 'of') {
            return 'object';
        }
        return 'block';
    };

    const inObjectKey = (): boolean => braces[braces.length - 1] === 'object';

    while (i < n) {
        skipCommentsAndWs();
        if (i >= n) break;
        const c = source[i]!;

        if (c === '"' || c === "'") {
            skipString(c);
            lastKind = 'string';
            lastPunct = '';
            expectBinding = false;
            statementStart = false;
            continue;
        }
        if (c === '`') {
            skipTemplate();
            lastKind = 'string';
            lastPunct = '';
            expectBinding = false;
            statementStart = false;
            continue;
        }

        if (IDENT_START.test(c)) {
            const identStart = i;
            const prevPunct = lastPunct;
            const prevExpectBinding = expectBinding;
            const word = readIdent();
            if (word === 'const' || word === 'let' || word === 'var') {
                expectBinding = true;
                lastKind = 'ident';
                lastIdent = word;
                lastPunct = '';
                statementStart = false;
                continue;
            }
            if (word === 'import' || word === 'export') {
                inImport = true;
                lastKind = 'ident';
                lastIdent = word;
                lastPunct = '';
                statementStart = false;
                continue;
            }
            if (inImport && word === 'type') {
                // `import type` / `export type {` — drop the modifier keyword.
                blank(identStart, i);
                lastKind = 'ident';
                lastPunct = '';
                continue;
            }
            if ((word === 'interface' || word === 'type' || word === 'enum' || word === 'declare')
                && statementStart
                && braces[braces.length - 1] !== 'object') {
                const afterKeyword = i;
                skipCommentsAndWs();
                const next = source[i] ?? '';
                // Object keys like `{ type: 'frame' }` must not look like aliases.
                if (IDENT_START.test(next)) {
                    skipDeclarationToSemiOrBrace();
                    blank(identStart, i);
                    lastKind = 'punct';
                    lastPunct = ';';
                    lastIdent = '';
                    statementStart = true;
                    expectBinding = false;
                    continue;
                }
                i = afterKeyword;
            }
            if (word === 'as' || word === 'satisfies') {
                if (skipAsOrSatisfies(word)) {
                    lastKind = 'ident';
                    lastPunct = '';
                    expectBinding = false;
                    statementStart = false;
                    continue;
                }
            }
            lastKind = 'ident';
            lastIdent = word;
            lastPunct = '';
            statementStart = false;

            skipCommentsAndWs();
            if (source[i] === '?' && peek(1) === ':') {
                blank(i, i + 1);
                i++;
            }
            if (source[i] === '!' && peek(1) === ':') {
                blank(i, i + 1);
                i++;
            }
            const allowAnnotation = !inObjectKey()
                && (prevExpectBinding || prevPunct === '(' || prevPunct === ',');
            if (allowAnnotation && source[i] === ':') {
                skipTypeAnnotation();
            }
            looksLikeGeneric();
            skipNonNull();
            expectBinding = false;
            continue;
        }

        if (c >= '0' && c <= '9') {
            skipNumber();
            lastKind = 'number';
            lastPunct = '';
            lastIdent = '';
            expectBinding = false;
            statementStart = false;
            skipNonNull();
            continue;
        }

        if (c === '{') {
            const kind = classifyBrace();
            braces.push(kind);
            lastKind = 'punct';
            lastPunct = '{';
            lastIdent = '';
            i++;
            statementStart = kind === 'block';
            expectBinding = false;
            continue;
        }
        if (c === '}') {
            braces.pop();
            lastKind = 'punct';
            lastPunct = '}';
            lastIdent = '';
            i++;
            statementStart = true;
            expectBinding = false;
            if (braces.length === 0) inImport = false;
            continue;
        }
        if (c === '(') {
            lastKind = 'punct';
            lastPunct = '(';
            lastIdent = '';
            i++;
            statementStart = false;
            expectBinding = false;
            continue;
        }
        if (c === ')') {
            lastKind = 'punct';
            lastPunct = ')';
            lastIdent = '';
            i++;
            statementStart = false;
            expectBinding = false;
            skipCommentsAndWs();
            if (source[i] === ':') skipTypeAnnotation();
            looksLikeGeneric();
            skipNonNull();
            continue;
        }
        if (c === '[') {
            lastKind = 'punct';
            lastPunct = '[';
            lastIdent = '';
            i++;
            statementStart = false;
            continue;
        }
        if (c === ']') {
            lastKind = 'punct';
            lastPunct = ']';
            lastIdent = '';
            i++;
            statementStart = false;
            skipCommentsAndWs();
            if (expectBinding && source[i] === ':') skipTypeAnnotation();
            skipNonNull();
            expectBinding = false;
            continue;
        }
        if (c === ';') {
            inImport = false;
            expectBinding = false;
            statementStart = true;
            lastKind = 'punct';
            lastPunct = ';';
            lastIdent = '';
            i++;
            continue;
        }
        if (c === '=' && peek(1) === '>') {
            lastKind = 'punct';
            lastPunct = '=>';
            lastIdent = '';
            i += 2;
            statementStart = false;
            expectBinding = false;
            continue;
        }
        if (c === ':' && expectBinding) {
            skipTypeAnnotation();
            expectBinding = false;
            continue;
        }

        lastKind = 'punct';
        lastPunct = c;
        lastIdent = '';
        statementStart = false;
        expectBinding = false;
        i++;
    }

    return out.join('');
}
