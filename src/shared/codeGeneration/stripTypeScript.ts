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

/** Mutable scan state, shared by the phase helpers below. */
interface StripState {
    source: string;
    n: number;
    out: string[];
    i: number;
    lastKind: 'ident' | 'number' | 'string' | 'punct' | null;
    lastPunct: string;
    lastIdent: string;
    statementStart: boolean;
    expectBinding: boolean;
    inImport: boolean;
    braces: BraceKind[];
}

const blank = (st: StripState, start: number, end: number): void => {
    const to = Math.min(end, st.n);
    for (let k = start; k < to; k++) {
        if (st.out[k] !== '\n' && st.out[k] !== '\r') st.out[k] = ' ';
    }
};

const peek = (st: StripState, d = 0): string => st.source[st.i + d] ?? '';

const skipWs = (st: StripState): void => {
    while (st.i < st.n) {
        const c = st.source[st.i];
        if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v') {
            if (c === '\n' || c === '\r') st.statementStart = true;
            st.i++;
            continue;
        }
        break;
    }
};

const skipLineComment = (st: StripState): void => {
    st.i += 2;
    while (st.i < st.n && st.source[st.i] !== '\n' && st.source[st.i] !== '\r') st.i++;
};

const skipBlockComment = (st: StripState): void => {
    st.i += 2;
    while (st.i < st.n && !(st.source[st.i] === '*' && st.source[st.i + 1] === '/')) st.i++;
    if (st.i < st.n) st.i += 2;
};

const skipString = (st: StripState, quote: string): void => {
    st.i++;
    while (st.i < st.n) {
        const c = st.source[st.i];
        if (c === '\\') {
            st.i += 2;
            continue;
        }
        if (c === quote) {
            st.i++;
            return;
        }
        if (c === '\n') return;
        st.i++;
    }
};

const skipTemplateInterpolation = (st: StripState): void => {
    st.i += 2;
    let depth = 1;
    while (st.i < st.n && depth > 0) {
        const inner = st.source[st.i];
        if (inner === '\\') {
            st.i += 2;
            continue;
        }
        if (inner === '`' || inner === '"' || inner === "'") {
            skipString(st, inner);
            continue;
        }
        if (inner === '{') depth++;
        else if (inner === '}') depth--;
        if (depth > 0) st.i++;
    }
    if (st.source[st.i] === '}') st.i++;
};

const skipTemplate = (st: StripState): void => {
    st.i++;
    while (st.i < st.n) {
        const c = st.source[st.i];
        if (c === '\\') {
            st.i += 2;
            continue;
        }
        if (c === '`') {
            st.i++;
            return;
        }
        if (c === '$' && st.source[st.i + 1] === '{') {
            skipTemplateInterpolation(st);
            continue;
        }
        st.i++;
    }
};

const skipCommentsAndWs = (st: StripState): void => {
    for (;;) {
        skipWs(st);
        if (st.source[st.i] === '/' && st.source[st.i + 1] === '/') {
            skipLineComment(st);
            continue;
        }
        if (st.source[st.i] === '/' && st.source[st.i + 1] === '*') {
            skipBlockComment(st);
            continue;
        }
        break;
    }
};

const readIdent = (st: StripState): string => {
    const start = st.i;
    st.i++;
    while (st.i < st.n && IDENT_PART.test(st.source[st.i]!)) st.i++;
    return st.source.slice(start, st.i);
};

const skipNumber = (st: StripState): void => {
    if (st.source[st.i] === '0' && (st.source[st.i + 1] === 'x' || st.source[st.i + 1] === 'X' || st.source[st.i + 1] === 'b' || st.source[st.i + 1] === 'B' || st.source[st.i + 1] === 'o' || st.source[st.i + 1] === 'O')) {
        st.i += 2;
    }
    while (st.i < st.n && /[0-9a-fA-Fn._]/.test(st.source[st.i]!)) st.i++;
};

interface TypeCounters { angle: number; paren: number; bracket: number; brace: number }

interface TypeScan { seenTerm: boolean; progressed: boolean }

const TYPE_PUNCT = new Set(['.', '|', '&', ':', '?', '!', '*', '-', '+']);
const TYPE_PUNCT_RESETS_TERM = new Set(['|', '&', ':', '.']);

/** Depth-0 characters that end a type span. */
const atTypeBoundary = (st: StripState, c: string, d: number, seenTerm: boolean): boolean => {
    if (d !== 0) return false;
    if (c === '=' && peek(st, 1) !== '>' && peek(st, 1) !== '=') return true;
    if (c === ',' || c === ';' || c === ')') return true;
    if (c === '}') return true;
    if (c === '{' && seenTerm) return true;
    return false;
};

/** Consume one structural character of a type span; `'break'` ends the span. */
const consumeTypeGrouping = (st: StripState, c: string, counters: TypeCounters): 'skip' | 'seen' | 'unseen' | 'break' => {
    if (c === '<') {
        counters.angle++;
        st.i++;
        return 'unseen';
    }
    if (c === '>') {
        if (counters.angle > 0) counters.angle--;
        st.i++;
        return 'seen';
    }
    if (c === '(') {
        counters.paren++;
        st.i++;
        return 'unseen';
    }
    if (c === ')') {
        if (counters.paren > 0) {
            counters.paren--;
            st.i++;
            return 'seen';
        }
        return 'break';
    }
    if (c === '[') {
        counters.bracket++;
        st.i++;
        return 'unseen';
    }
    if (c === ']') {
        if (counters.bracket > 0) counters.bracket--;
        st.i++;
        return 'seen';
    }
    if (c === '{') {
        counters.brace++;
        st.i++;
        return 'unseen';
    }
    if (c === '}') {
        if (counters.brace > 0) counters.brace--;
        st.i++;
        return 'seen';
    }
    if (c === '=' && peek(st, 1) === '>') {
        st.i += 2;
        return 'unseen';
    }
    return 'skip';
};

/** Consume one identifier / punctuation / number character of a type span. */
const consumeTypeAtom = (st: StripState, c: string): 'skip' | 'seen' | 'unseen' | 'unchanged' => {
    if (IDENT_START.test(c)) {
        readIdent(st);
        return 'seen';
    }
    if (TYPE_PUNCT.has(c)) {
        st.i++;
        return TYPE_PUNCT_RESETS_TERM.has(c) ? 'unseen' : 'unchanged';
    }
    if (c >= '0' && c <= '9') {
        skipNumber(st);
        return 'seen';
    }
    return 'skip';
};

const skipType = (st: StripState): boolean => {
    skipCommentsAndWs(st);
    const start = st.i;
    if (st.i >= st.n) return false;
    const counters: TypeCounters = { angle: 0, paren: 0, bracket: 0, brace: 0 };
    const scan: TypeScan = { seenTerm: false, progressed: false };
    const depth = (): number => counters.angle + counters.paren + counters.bracket + counters.brace;

    while (st.i < st.n) {
        skipCommentsAndWs(st);
        if (st.i >= st.n) break;
        const c = st.source[st.i]!;
        const d = depth();

        if (atTypeBoundary(st, c, d, scan.seenTerm)) break;

        if (c === '"' || c === "'") {
            skipString(st, c);
            scan.seenTerm = true;
            scan.progressed = true;
            continue;
        }
        if (c === '`') {
            skipTemplate(st);
            scan.seenTerm = true;
            scan.progressed = true;
            continue;
        }

        const grouping = consumeTypeGrouping(st, c, counters);
        if (grouping === 'break') break;
        if (grouping !== 'skip') {
            scan.seenTerm = grouping === 'seen';
            scan.progressed = true;
            continue;
        }

        const atom = consumeTypeAtom(st, c);
        if (atom !== 'skip') {
            if (atom === 'seen') scan.seenTerm = true;
            else if (atom === 'unseen') scan.seenTerm = false;
            scan.progressed = true;
            continue;
        }

        if (d === 0) break;
        st.i++;
        scan.progressed = true;
    }

    return scan.progressed && st.i > start;
};

const skipTypeAnnotation = (st: StripState): boolean => {
    skipCommentsAndWs(st);
    if (st.source[st.i] !== ':') return false;
    const colon = st.i;
    st.i++;
    if (!skipType(st)) {
        st.i = colon;
        return false;
    }
    blank(st, colon, st.i);
    return true;
};

const abortGenericScan = (st: StripState, start: number): false => {
    st.i = start;
    return false;
};

const skipGenericQuoted = (st: StripState, c: string): boolean => {
    if (c === '"' || c === "'") {
        skipString(st, c);
        return true;
    }
    if (c === '`') {
        skipTemplate(st);
        return true;
    }
    return false;
};

const isTopLevelLogicalOperator = (st: StripState, angle: number, c: string): boolean => {
    if (angle !== 1) return false;
    if (c === '&' && peek(st, 1) === '&') return true;
    if (c === '|' && peek(st, 1) === '|') return true;
    return false;
};

const looksLikeGeneric = (st: StripState): boolean => {
    skipCommentsAndWs(st);
    if (st.source[st.i] !== '<') return false;
    const start = st.i;
    let angle = 1;
    st.i++;
    while (st.i < st.n && angle > 0) {
        skipCommentsAndWs(st);
        if (st.i >= st.n) {
            return abortGenericScan(st, start);
        }
        const c = st.source[st.i]!;
        if (skipGenericQuoted(st, c)) {
            continue;
        }
        if (isTopLevelLogicalOperator(st, angle, c)) {
            return abortGenericScan(st, start);
        }
        if (c === '<') {
            angle++;
            st.i++;
            continue;
        }
        if (c === '>') {
            angle--;
            st.i++;
            continue;
        }
        st.i++;
    }
    if (angle !== 0) {
        return abortGenericScan(st, start);
    }
    blank(st, start, st.i);
    return true;
};

const skipNonNull = (st: StripState): void => {
    skipCommentsAndWs(st);
    if (st.source[st.i] !== '!') return;
    if (peek(st, 1) === '=' || peek(st, 1) === '!') return;
    blank(st, st.i, st.i + 1);
    st.i++;
};

const skipAsOrSatisfies = (st: StripState, keyword: string): boolean => {
    if (st.inImport) return false;
    if (st.braces[st.braces.length - 1] === 'spec') return false;
    if (st.lastPunct === '*') return false;
    if (st.lastKind !== 'ident' && st.lastKind !== 'number' && st.lastKind !== 'string' && st.lastPunct !== ')' && st.lastPunct !== ']' && st.lastPunct !== '}') {
        return false;
    }
    const start = st.i - keyword.length;
    skipCommentsAndWs(st);
    if (!skipType(st)) {
        st.i = start + keyword.length;
        return false;
    }
    blank(st, start, st.i);
    return true;
};

const skipBalancedBracesFrom = (st: StripState, openAt: number): void => {
    let depth = 1;
    st.i = openAt + 1;
    while (st.i < st.n && depth > 0) {
        const c = st.source[st.i]!;
        if (c === '"' || c === "'") {
            skipString(st, c);
            continue;
        }
        if (c === '`') {
            skipTemplate(st);
            continue;
        }
        if (c === '/' && peek(st, 1) === '/') {
            skipLineComment(st);
            continue;
        }
        if (c === '/' && peek(st, 1) === '*') {
            skipBlockComment(st);
            continue;
        }
        if (c === '{') depth++;
        else if (c === '}') depth--;
        st.i++;
    }
};

const skipDeclarationToSemiOrBrace = (st: StripState): void => {
    while (st.i < st.n) {
        skipCommentsAndWs(st);
        const c = st.source[st.i];
        if (c === '"' || c === "'") {
            skipString(st, c);
            continue;
        }
        if (c === '`') {
            skipTemplate(st);
            continue;
        }
        if (c === '{') {
            const open = st.i;
            skipBalancedBracesFrom(st, open);
            return;
        }
        if (c === ';') {
            st.i++;
            return;
        }
        if (c === '\n' && st.lastKind === 'ident') {
            return;
        }
        st.i++;
    }
};

const classifyBrace = (st: StripState): BraceKind => {
    if (st.inImport) return 'spec';
    if (st.lastPunct === '(' || st.lastPunct === ',' || st.lastPunct === '[' || st.lastPunct === '=' || st.lastPunct === ':' || st.lastPunct === '!') {
        return 'object';
    }
    if (st.lastIdent === 'return' || st.lastIdent === 'throw' || st.lastIdent === 'case' || st.lastIdent === 'yield' || st.lastIdent === 'of') {
        return 'object';
    }
    return 'block';
};

const inObjectKey = (st: StripState): boolean => st.braces[st.braces.length - 1] === 'object';

const handleBindingKeyword = (st: StripState, word: string): boolean => {
    if (word === 'const' || word === 'let' || word === 'var') {
        st.expectBinding = true;
        st.lastKind = 'ident';
        st.lastIdent = word;
        st.lastPunct = '';
        st.statementStart = false;
        return true;
    }
    return false;
};

const handleImportKeyword = (st: StripState, word: string, identStart: number): boolean => {
    if (word === 'import' || word === 'export') {
        st.inImport = true;
        st.lastKind = 'ident';
        st.lastIdent = word;
        st.lastPunct = '';
        st.statementStart = false;
        return true;
    }
    if (st.inImport && word === 'type') {
        // `import type` / `export type {` — drop the modifier keyword.
        blank(st, identStart, st.i);
        st.lastKind = 'ident';
        st.lastPunct = '';
        return true;
    }
    return false;
};

const handleTypeDeclarationKeyword = (st: StripState, word: string, identStart: number): boolean => {
    if ((word === 'interface' || word === 'type' || word === 'enum' || word === 'declare')
        && st.statementStart
        && st.braces[st.braces.length - 1] !== 'object') {
        const afterKeyword = st.i;
        skipCommentsAndWs(st);
        const next = st.source[st.i] ?? '';
        // Object keys like `{ type: 'frame' }` must not look like aliases.
        if (IDENT_START.test(next)) {
            skipDeclarationToSemiOrBrace(st);
            blank(st, identStart, st.i);
            st.lastKind = 'punct';
            st.lastPunct = ';';
            st.lastIdent = '';
            st.statementStart = true;
            st.expectBinding = false;
            return true;
        }
        st.i = afterKeyword;
    }
    return false;
};

/** Consume a declaration keyword that may carry a type-only declaration. */
const handleTypeKeyword = (st: StripState, word: string, identStart: number): boolean => {
    if (handleBindingKeyword(st, word)) return true;
    if (handleImportKeyword(st, word, identStart)) return true;
    return handleTypeDeclarationKeyword(st, word, identStart);
};

const stepIdentifier = (st: StripState): void => {
    const identStart = st.i;
    const prevPunct = st.lastPunct;
    const prevExpectBinding = st.expectBinding;
    const word = readIdent(st);
    if (handleTypeKeyword(st, word, identStart)) return;
    if (word === 'as' || word === 'satisfies') {
        if (skipAsOrSatisfies(st, word)) {
            st.lastKind = 'ident';
            st.lastPunct = '';
            st.expectBinding = false;
            st.statementStart = false;
            return;
        }
    }
    st.lastKind = 'ident';
    st.lastIdent = word;
    st.lastPunct = '';
    st.statementStart = false;

    skipCommentsAndWs(st);
    if (st.source[st.i] === '?' && peek(st, 1) === ':') {
        blank(st, st.i, st.i + 1);
        st.i++;
    }
    if (st.source[st.i] === '!' && peek(st, 1) === ':') {
        blank(st, st.i, st.i + 1);
        st.i++;
    }
    const allowAnnotation = !inObjectKey(st)
        && (prevExpectBinding || prevPunct === '(' || prevPunct === ',');
    if (allowAnnotation && st.source[st.i] === ':') {
        skipTypeAnnotation(st);
    }
    looksLikeGeneric(st);
    skipNonNull(st);
    st.expectBinding = false;
};

const stepNumber = (st: StripState): void => {
    skipNumber(st);
    st.lastKind = 'number';
    st.lastPunct = '';
    st.lastIdent = '';
    st.expectBinding = false;
    st.statementStart = false;
    skipNonNull(st);
};

/** Consume one punctuation character, updating the scan state. */
const stepPunct = (st: StripState, c: string): void => {
    if (c === '{') {
        const kind = classifyBrace(st);
        st.braces.push(kind);
        st.lastKind = 'punct';
        st.lastPunct = '{';
        st.lastIdent = '';
        st.i++;
        st.statementStart = kind === 'block';
        st.expectBinding = false;
        return;
    }
    if (c === '}') {
        st.braces.pop();
        st.lastKind = 'punct';
        st.lastPunct = '}';
        st.lastIdent = '';
        st.i++;
        st.statementStart = true;
        st.expectBinding = false;
        if (st.braces.length === 0) st.inImport = false;
        return;
    }
    if (c === '(') {
        st.lastKind = 'punct';
        st.lastPunct = '(';
        st.lastIdent = '';
        st.i++;
        st.statementStart = false;
        st.expectBinding = false;
        return;
    }
    if (c === ')') {
        st.lastKind = 'punct';
        st.lastPunct = ')';
        st.lastIdent = '';
        st.i++;
        st.statementStart = false;
        st.expectBinding = false;
        skipCommentsAndWs(st);
        if (st.source[st.i] === ':') skipTypeAnnotation(st);
        looksLikeGeneric(st);
        skipNonNull(st);
        return;
    }
    if (c === '[') {
        st.lastKind = 'punct';
        st.lastPunct = '[';
        st.lastIdent = '';
        st.i++;
        st.statementStart = false;
        return;
    }
    if (c === ']') {
        st.lastKind = 'punct';
        st.lastPunct = ']';
        st.lastIdent = '';
        st.i++;
        st.statementStart = false;
        skipCommentsAndWs(st);
        if (st.expectBinding && st.source[st.i] === ':') skipTypeAnnotation(st);
        skipNonNull(st);
        st.expectBinding = false;
        return;
    }
    if (c === ';') {
        st.inImport = false;
        st.expectBinding = false;
        st.statementStart = true;
        st.lastKind = 'punct';
        st.lastPunct = ';';
        st.lastIdent = '';
        st.i++;
        return;
    }
    if (c === '=' && peek(st, 1) === '>') {
        st.lastKind = 'punct';
        st.lastPunct = '=>';
        st.lastIdent = '';
        st.i += 2;
        st.statementStart = false;
        st.expectBinding = false;
        return;
    }
    if (c === ':' && st.expectBinding) {
        skipTypeAnnotation(st);
        st.expectBinding = false;
        return;
    }

    st.lastKind = 'punct';
    st.lastPunct = c;
    st.lastIdent = '';
    st.statementStart = false;
    st.expectBinding = false;
    st.i++;
};

export function stripTypeScriptSyntax(source: string): string {
    const st: StripState = {
        source,
        n: source.length,
        out: source.split(''),
        i: 0,
        lastKind: null,
        lastPunct: '',
        lastIdent: '',
        statementStart: true,
        expectBinding: false,
        inImport: false,
        braces: [],
    };

    while (st.i < st.n) {
        skipCommentsAndWs(st);
        if (st.i >= st.n) break;
        const c = st.source[st.i]!;

        if (c === '"' || c === "'") {
            skipString(st, c);
            st.lastKind = 'string';
            st.lastPunct = '';
            st.expectBinding = false;
            st.statementStart = false;
            continue;
        }
        if (c === '`') {
            skipTemplate(st);
            st.lastKind = 'string';
            st.lastPunct = '';
            st.expectBinding = false;
            st.statementStart = false;
            continue;
        }

        if (IDENT_START.test(c)) {
            stepIdentifier(st);
            continue;
        }

        if (c >= '0' && c <= '9') {
            stepNumber(st);
            continue;
        }

        stepPunct(st, c);
    }

    return st.out.join('');
}
