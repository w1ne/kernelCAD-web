// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import {
    buildFeatureSourceIndex,
    featureLabel,
    featuresAtPosition,
    getFeatureSourceIndex,
} from './featureSourceIndex';

function rec(id: string, kind: string, line: number, column: number, name?: string): FeatureRecord {
    return {
        id,
        kind: kind as FeatureRecord['kind'],
        inputs: {},
        params: {},
        transforms: [],
        suppressed: false,
        scriptLocation: { file: 'm.kcad.ts', line, column },
        ...(name ? { metadata: { name } } : {}),
    };
}

// Line 1: chained calls on one statement; line 3: a nested call.
const CODE = [
    "const plate = box(60, 40, 10).hole('top', { u: -15, v: 0, diameter: 10, depth: 'through' });",
    "const peg: number = 5;",
    "const out = plate.subtract(cylinder(4, 20));",
    "return out;",
].join('\n');
const FEATURES = [
    rec('box_1', 'box', 1, 15),
    rec('hole_1', 'hole', 1, 31, 'mount'),
    rec('cylinder_1', 'cylinder', 3, 28),
    rec('boolean_1', 'boolean', 3, 19),
];

describe('featureSourceIndex', () => {
    it('resolves each call site to callee-through-paren (TypeScript source)', () => {
        const index = buildFeatureSourceIndex(CODE, FEATURES);
        const text = (id: string): string => {
            const r = index.byFeatureId.get(id)!.callRange!;
            return CODE.split('\n')[r.startLineNumber - 1]!.slice(r.startColumn - 1, r.endColumn - 1);
        };
        expect(text('box_1')).toBe('box(60, 40, 10)');
        expect(text('hole_1')).toBe("hole('top', { u: -15, v: 0, diameter: 10, depth: 'through' })");
        expect(text('cylinder_1')).toBe('cylinder(4, 20)');
        expect(text('boolean_1')).toBe('subtract(cylinder(4, 20))');
    });

    it('picks the innermost call, then the statement', () => {
        const index = buildFeatureSourceIndex(CODE, FEATURES);
        expect(featuresAtPosition(index, 1, 16)).toEqual(['box_1']);
        expect(featuresAtPosition(index, 1, 60)).toEqual(['hole_1']);
        // Nested call wins over its enclosing call.
        expect(featuresAtPosition(index, 3, 30)).toEqual(['cylinder_1']);
        expect(featuresAtPosition(index, 3, 22)).toEqual(['boolean_1']);
        // `const plate` — not on a call: every feature of that statement.
        expect(featuresAtPosition(index, 1, 3).sort()).toEqual(['box_1', 'hole_1']);
        // A line with no feature.
        expect(featuresAtPosition(index, 2, 3)).toEqual([]);
    });

    it('degrades a stale location to a whole-line range, never a wrong call', () => {
        // The buffer gained a line above the evaluated source.
        const edited = `// note\n${CODE}`;
        const index = buildFeatureSourceIndex(edited, FEATURES);
        const box = index.byFeatureId.get('box_1')!;
        expect(box.callRange).toBeUndefined();
        expect(box.statementRange).toEqual({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 8 });
    });

    it('labels by name, else kind', () => {
        const index = buildFeatureSourceIndex(CODE, FEATURES);
        expect(featureLabel(index.byFeatureId.get('hole_1')!)).toBe('mount · line 1');
        expect(featureLabel(index.byFeatureId.get('box_1')!)).toBe('box · line 1');
    });

    it('caches per evaluation and source; re-evaluation invalidates', () => {
        const first = getFeatureSourceIndex(CODE, FEATURES);
        expect(getFeatureSourceIndex(CODE, FEATURES)).toBe(first);
        // New evaluation → new records array → rebuilt.
        const reEvaluated = FEATURES.map((f) => ({ ...f }));
        expect(getFeatureSourceIndex(CODE, reEvaluated)).not.toBe(first);
        // Source edit → rebuilt.
        expect(getFeatureSourceIndex(`${CODE}\n`, FEATURES)).not.toBe(first);
    });
});
