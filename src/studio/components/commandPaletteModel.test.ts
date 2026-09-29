// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { rankCommands, scoreCommand, uniqueValues, updatedAgo } from './commandPaletteModel';

describe('scoreCommand', () => {
    it('ranks a label prefix above a keyword or description hit', () => {
        const exportStl = scoreCommand('Export STL', 'exp', ['download', 'Mesh; printable / preview']);
        const run = scoreCommand('Run model', 'exp', ['rebuild', 'recompute', 'execute', 'Re-run the script']);
        expect(exportStl).toBe(1);
        expect(run).toBe(0);
    });

    it('needs every query word to match', () => {
        expect(scoreCommand('Export STL', 'export stl')).toBeGreaterThan(0);
        expect(scoreCommand('Export STL', 'export step')).toBe(0);
    });

    it('matches a keyword word start below any label match', () => {
        const keyword = scoreCommand('Background: Light', 'theme', ['theme', 'viewport']);
        const label = scoreCommand('Show code', 'code');
        expect(keyword).toBeGreaterThan(0);
        expect(label).toBeGreaterThan(keyword);
    });

    it('tolerates skipped letters in the label only', () => {
        expect(scoreCommand('Save view as PNG', 'svpng')).toBeGreaterThan(0);
        expect(scoreCommand('Clear selection', 'xyz', ['deselect'])).toBe(0);
    });

    it('shows everything for an empty query', () => {
        expect(scoreCommand('Anything', '   ')).toBe(1);
    });
});

describe('uniqueValues', () => {
    it('keeps equal labels apart for cmdk', () => {
        const values = uniqueValues([
            { id: 'a', label: 'Switch to Bracket', action: () => {} },
            { id: 'b', label: 'Switch to Bracket', action: () => {} },
        ]);
        expect(values.get('a')).toBe('Switch to Bracket');
        expect(values.get('b')).toBe('Switch to Bracket b');
    });
});

describe('updatedAgo', () => {
    const now = Date.parse('2026-09-29T12:00:00Z');
    it('prints minutes, hours and days', () => {
        expect(updatedAgo('2026-09-29T11:59:50Z', now)).toBe('Updated just now');
        expect(updatedAgo('2026-09-29T11:55:00Z', now)).toBe('Updated 5 min ago');
        expect(updatedAgo('2026-09-29T09:00:00Z', now)).toBe('Updated 3 h ago');
        expect(updatedAgo('2026-09-27T12:00:00Z', now)).toBe('Updated 2 d ago');
    });
    it('is empty for a bad date', () => {
        expect(updatedAgo('not a date', now)).toBe('');
    });
});

describe('rankCommands', () => {
    it('drops misses and puts the best match first, stable on ties', () => {
        const cmd = (id: string, label: string, keywords: string[] = []) => ({ id, label, keywords, action: () => {} });
        const ranked = rankCommands([
            cmd('tab', 'Show export options'),
            cmd('run', 'Run model', ['execute']),
            cmd('stl', 'Export STL'),
            cmd('step', 'Export STEP'),
        ], 'exp');
        expect(ranked.map((c) => c.id)).toEqual(['stl', 'step', 'tab']);
    });
});
