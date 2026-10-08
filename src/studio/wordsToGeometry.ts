// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Words to geometry. The hosted agent can be off. These prompts still become
// a parametric .kcad.ts the kernel can build: a flat plate with clearance
// holes, a hex-cap bolt, or a single-bend L-bracket. Anything else is refused
// in words, rather than drawn as a guess.

export const WORDS_GEOMETRY_KEY = 'kc:words-geometry';

const CLEARANCE_MM: Record<string, number> = {
    '2': 2.4,
    '2.5': 2.9,
    '3': 3.4,
    '4': 4.5,
    '5': 5.5,
    '6': 6.6,
    '8': 9,
    '10': 11,
    '12': 13.5,
};

/** ISO 4017 hex head: across flats and head height, millimetres. */
const HEX_HEAD_MM: Record<string, { acrossFlats: number; headHeight: number }> = {
    '3': { acrossFlats: 5.5, headHeight: 2 },
    '4': { acrossFlats: 7, headHeight: 2.8 },
    '5': { acrossFlats: 8, headHeight: 3.5 },
    '6': { acrossFlats: 10, headHeight: 4 },
    '8': { acrossFlats: 13, headHeight: 5.3 },
    '10': { acrossFlats: 16, headHeight: 6.4 },
    '12': { acrossFlats: 18, headHeight: 7.5 },
};

const COUNT_WORDS: Record<string, number> = {
    a: 1,
    an: 1,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
};

const HOLE_SIZE_MISSING = 'Say the hole size, like 4 M3 holes or 2 5 mm holes.';

/** Hole layouts the plate builder places: centre, a pair, or the four corners. */
const PLACED_COUNTS = new Set([1, 2, 4]);

export interface WordsGeometry {
    ok: true;
    source: string;
    title: string;
    assumptions: readonly string[];
}

export interface WordsRefusal {
    ok: false;
    code: 'words.empty' | 'words.unsupported';
    message: string;
}

export type WordsResult = WordsGeometry | WordsRefusal;

function num(value: number): string {
    const rounded = Math.round(value * 1000) / 1000;
    return String(rounded);
}

function commentLine(text: string): string {
    return `// ${text.replace(/[\r\n]+/g, ' ').slice(0, 240)}`;
}

function sizeOf(prompt: string): [number, number, number] | null {
    const match = prompt.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:mm\s+)?by\s+(\d+(?:\.\d+)?)\s*(?:mm\s+)?by\s+(\d+(?:\.\d+)?)/i);
    if (!match) return null;
    const raw = match[1] != null
        ? [match[1], match[2], match[3]]
        : [match[4], match[5], match[6]];
    const values = raw.map((item) => Number(item));
    if (values.some((item) => !Number.isFinite(item) || item <= 0 || item > 2000)) return null;
    return [values[0]!, values[1]!, values[2]!];
}

function countOf(token: string): number | null {
    const word = COUNT_WORDS[token.toLowerCase()];
    if (word) return PLACED_COUNTS.has(word) ? word : null;
    const value = Number(token);
    if (!Number.isInteger(value)) return null;
    return PLACED_COUNTS.has(value) ? value : null;
}

type HoleRequest = { count: number; diameter: number; note: string } | { error: string } | null;

const COUNT_REFUSAL = 'Say 1, 2, or 4 holes. Other counts are not placed.';

function threadedHoles(prompt: string): HoleRequest {
    const counted = prompt.match(/(\d+|a|an|one|two|three|four)\s+M(\d+(?:\.\d+)?)\b(?:\s+mounting)?\s+holes?/i);
    const single = counted ? null : prompt.match(/\bM(\d+(?:\.\d+)?)\s+holes?/i);
    if (!counted && !single) return null;
    const thread = counted ? counted[2]! : single![1]!;
    const count = counted ? countOf(counted[1]!) : 1;
    if (count == null) return { error: COUNT_REFUSAL };
    const diameter = CLEARANCE_MM[thread];
    if (diameter == null) {
        return { error: `M${thread} has no clearance drill in this builder. Use M2, M2.5, M3, M4, M5, M6, M8, M10, or M12.` };
    }
    return { count, diameter, note: `M${thread} clearance is ${num(diameter)} mm (ISO 273 medium). The prompt named the thread.` };
}

function drilledHoles(prompt: string): HoleRequest {
    const counted = prompt.match(/(\d+|a|an|one|two|three|four)\s+(\d+(?:\.\d+)?)\s*mm\s+holes?/i);
    const single = counted ? null : prompt.match(/(\d+(?:\.\d+)?)\s*mm\s+holes?/i);
    if (!counted && !single) return null;
    const diameter = Number(counted ? counted[2] : single![1]);
    const count = counted ? countOf(counted[1]!) : 1;
    if (count == null) return { error: COUNT_REFUSAL };
    if (!Number.isFinite(diameter) || diameter <= 0 || diameter > 40) return { error: 'The hole diameter is not a usable millimetre size.' };
    return { count, diameter, note: `Hole diameter ${num(diameter)} mm is taken from the prompt.` };
}

function holeRequest(prompt: string): HoleRequest {
    return threadedHoles(prompt) ?? drilledHoles(prompt);
}

function plateSource(prompt: string, size: [number, number, number], holes: { count: number; diameter: number; note: string } | null): WordsGeometry | WordsRefusal {
    const [width, height, thickness] = size;
    if (width < 8 || height < 8 || thickness < 0.5 || thickness > 25) {
        return { ok: false, code: 'words.unsupported', message: 'The plate needs a length and width of at least 8 mm and a thickness from 0.5 mm to 25 mm.' };
    }
    const assumptions = [
        'The three sizes are length, width, and thickness, in millimetres.',
        'A bracket without a fold is a flat plate a laser can cut.',
    ];
    const lines = [
        commentLine(prompt.trim()),
        commentLine(assumptions[0]!),
        commentLine(assumptions[1]!),
        `const width = param('width', ${num(width)}, { min: 8, max: 800, description: 'length from the prompt, mm' });`,
        `const height = param('height', ${num(height)}, { min: 8, max: 800, description: 'width from the prompt, mm' });`,
        `const thickness = param('thickness', ${num(thickness)}, { min: 0.5, max: 25, description: 'thickness from the prompt, mm' });`,
        'const plate = box(width, height, thickness);',
    ];
    if (!holes) {
        lines.push('return plate;');
        return {
            ok: true,
            title: `${num(width)} × ${num(height)} × ${num(thickness)} mm plate`,
            assumptions,
            source: lines.join('\n'),
        };
    }
    if (holes.count === 4 && (width < holes.diameter * 6 || height < holes.diameter * 6)) {
        return { ok: false, code: 'words.unsupported', message: 'Four holes do not fit on that plate with a margin of two diameters.' };
    }
    if (holes.count === 2 && width < holes.diameter * 6) {
        return { ok: false, code: 'words.unsupported', message: 'Two holes do not fit along that length with a margin of two diameters.' };
    }
    assumptions.push(holes.note);
    lines.splice(3, 0, commentLine(holes.note));
    lines.push(`const holeD = param('holeD', ${num(holes.diameter)}, { min: 1, max: 30, description: 'hole diameter, mm' });`);
    lines.push('const margin = holeD.multiply(2);');
    lines.push('const drill = (x, y) => cylinder(thickness.add(2), holeD.divide(2)).translate(x, y, -1);');
    if (holes.count === 1) {
        lines.push('return plate.subtract(drill(width.divide(2), height.divide(2)));');
    } else if (holes.count === 2) {
        lines.push('const y = height.divide(2);');
        lines.push('return plate.subtract(drill(margin, y), drill(width.subtract(margin), y));');
    } else {
        lines.push('const xFar = width.subtract(margin);');
        lines.push('const yFar = height.subtract(margin);');
        lines.push('return plate.subtract(drill(margin, margin), drill(xFar, margin), drill(margin, yFar), drill(xFar, yFar));');
    }
    return {
        ok: true,
        title: `${num(width)} × ${num(height)} × ${num(thickness)} mm plate, ${holes.count} hole${holes.count === 1 ? '' : 's'}`,
        assumptions,
        source: lines.join('\n'),
    };
}

function hexPoints(acrossFlats: number): string {
    const radius = (acrossFlats / 2) / Math.cos(Math.PI / 6);
    const points: string[] = [];
    for (let i = 0; i < 6; i += 1) {
        const angle = Math.PI / 6 + (i * Math.PI) / 3;
        points.push(`${num(radius * Math.cos(angle))}, ${num(radius * Math.sin(angle))}`);
    }
    return points.map((point, index) => `${index === 0 ? '.moveTo' : '.lineTo'}(${point})`).join('\n  ');
}

function boltSource(prompt: string): WordsGeometry | WordsRefusal | null {
    const match = prompt.match(/\bM(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/i);
    if (!match || !/bolt/i.test(prompt)) return null;
    const thread = match[1]!;
    const length = Number(match[2]);
    const head = HEX_HEAD_MM[thread];
    if (!head) {
        return { ok: false, code: 'words.unsupported', message: `M${thread} is not in the hex-head table. Use M3, M4, M5, M6, M8, M10, or M12.` };
    }
    if (!Number.isFinite(length) || length < 4 || length > 200) {
        return { ok: false, code: 'words.unsupported', message: 'The bolt length must be from 4 mm to 200 mm.' };
    }
    const assumptions = [
        `Hex across flats ${num(head.acrossFlats)} mm and head height ${num(head.headHeight)} mm are ISO 4017 for M${thread}.`,
        'The shank is a plain cylinder at the major diameter. The thread is named, not cut.',
    ];
    const source = [
        commentLine(prompt.trim()),
        commentLine(assumptions[0]!),
        commentLine(assumptions[1]!),
        `const thread = param('thread', ${num(Number(thread))}, { min: 2, max: 24, description: 'M${thread} major diameter, mm' });`,
        `const length = param('length', ${num(length)}, { min: 4, max: 200, description: 'shank length under the head, mm' });`,
        'const head = path()',
        `  ${hexPoints(head.acrossFlats)}`,
        '  .close()',
        `  .extrude(${num(head.headHeight)});`,
        `const shank = cylinder(length, thread.divide(2)).translate(0, 0, ${num(head.headHeight - 0.2)});`,
        'return head.union(shank);',
    ].join('\n');
    return {
        ok: true,
        title: `M${thread}×${num(length)} hex-cap bolt`,
        assumptions,
        source,
    };
}

function bracketSource(prompt: string): WordsGeometry | WordsRefusal | null {
    if (!/l[-\s]?bracket|fold along/i.test(prompt)) return null;
    const size = sizeOf(prompt);
    if (!size) {
        return { ok: false, code: 'words.unsupported', message: 'An L-bracket needs a blank, like 100x60x2 mm.' };
    }
    const [length, width, thickness] = size;
    const foldMatch = prompt.match(/x\s*=\s*(\d+(?:\.\d+)?)/i);
    const angleMatch = prompt.match(/(\d+(?:\.\d+)?)\s*°/);
    const foldAt = foldMatch ? Number(foldMatch[1]) : length / 2;
    const angle = angleMatch ? Number(angleMatch[1]) : 90;
    if (foldAt <= thickness || foldAt >= length - thickness) {
        return { ok: false, code: 'words.unsupported', message: 'The fold has to sit on the blank, in from either end by at least the thickness.' };
    }
    if (angle <= 0 || angle >= 180) {
        return { ok: false, code: 'words.unsupported', message: 'The fold angle must be between 0 and 180 degrees.' };
    }
    const assumptions = [
        foldMatch ? `The fold is at x=${num(foldAt)} mm, as written.` : `No fold position was written, so the bend is at half the length, x=${num(foldAt)} mm.`,
        'Inside radius equals the thickness. K-factor is 0.38.',
    ];
    const source = [
        commentLine(prompt.trim()),
        commentLine(assumptions[0]!),
        commentLine(assumptions[1]!),
        `const length = param('length', ${num(length)}, { min: 20, max: 800, description: 'flat blank length, mm' });`,
        `const width = param('width', ${num(width)}, { min: 10, max: 800, description: 'flat blank width, mm' });`,
        'const blank = path()',
        '  .moveTo(0, 0)',
        '  .lineTo(length, 0)',
        '  .lineTo(length, width)',
        '  .lineTo(0, width)',
        '  .close();',
        `const sheet = sheetMetal(blank, { thickness: ${num(thickness)}, kFactor: 0.38 });`,
        `return sheet.bend({ atX: ${num(foldAt)} }, ${num(angle)}, ${num(thickness)});`,
    ].join('\n');
    return {
        ok: true,
        title: `${num(length)} × ${num(width)} × ${num(thickness)} mm L-bracket, ${num(angle)}° at x=${num(foldAt)}`,
        assumptions,
        source,
    };
}

/** A sized prompt that names a flat part, holes, or millimetres is a plate. */
function plateFromWords(text: string): WordsResult | null {
    const size = sizeOf(text);
    if (!size) return null;
    const named = /plate|bracket|panel|sheet|rectangle/i.test(text);
    const holes = holeRequest(text);
    if (holes && 'error' in holes) return { ok: false, code: 'words.unsupported', message: holes.error };
    if (!holes && /\bholes?\b/i.test(text)) return { ok: false, code: 'words.unsupported', message: HOLE_SIZE_MISSING };
    if (named || holes || /mm|millimetre|millimeter/i.test(text)) return plateSource(text, size, holes);
    return null;
}

export function wordsToGeometry(prompt: string): WordsResult {
    const text = prompt.trim();
    if (!text) {
        return { ok: false, code: 'words.empty', message: 'Describe a plate, a hex bolt, or an L-bracket.' };
    }
    const bolt = boltSource(text);
    if (bolt) return bolt;
    const bracket = bracketSource(text);
    if (bracket) return bracket;
    const plate = plateFromWords(text);
    if (plate) return plate;
    return {
        ok: false,
        code: 'words.unsupported',
        message: 'This builder makes a flat plate (60x40x5 mm with 4 M3 holes), a hex-cap bolt (M8x30), or an L-bracket (100x60x2 mm, 90° fold along x=50). Say one of those.',
    };
}

export function peekWordsGeometry(): WordsGeometry | null {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(WORDS_GEOMETRY_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<WordsGeometry>;
        if (parsed.ok !== true || typeof parsed.source !== 'string' || typeof parsed.title !== 'string') return null;
        return { ok: true, source: parsed.source, title: parsed.title, assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [] };
    } catch {
        return null;
    }
}

export function clearWordsGeometry(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(WORDS_GEOMETRY_KEY);
}

export function stashWordsGeometry(value: WordsGeometry): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(WORDS_GEOMETRY_KEY, JSON.stringify(value));
}
