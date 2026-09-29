// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { READ_ONLY_EDIT_HINT, resolveSourceEditTarget, targetForEdit, type SourceEditTargetInput } from './sourceEditTarget';

const base: SourceEditTargetInput = {
    viewerMode: false,
    hasControlledCode: false,
    script: null,
    gallery: null,
    devSourceSave: true,
    hasActiveProject: true,
};

describe('resolveSourceEditTarget', () => {
    it('saves to the active project on the plain Studio route', () => {
        expect(resolveSourceEditTarget(base)).toEqual({ kind: 'project' });
        expect(resolveSourceEditTarget({ ...base, devSourceSave: false })).toEqual({ kind: 'project' });
    });

    it('uses the dev file endpoint only for a dev ?script= route', () => {
        expect(resolveSourceEditTarget({ ...base, script: 'examples/a.kcad.ts' }))
            .toEqual({ kind: 'script', script: 'examples/a.kcad.ts' });
        // Hosted ?script= link: no file endpoint, apply in memory.
        expect(resolveSourceEditTarget({ ...base, script: 'examples/a.kcad.ts', devSourceSave: false }))
            .toEqual({ kind: 'memory' });
    });

    it('is read-only in a viewer, whatever else is set', () => {
        expect(resolveSourceEditTarget({ ...base, viewerMode: true, script: 'examples/a.kcad.ts' }))
            .toEqual({ kind: 'readOnly', hint: READ_ONLY_EDIT_HINT });
    });

    it('never writes the local project for a host-controlled embed or a gallery link', () => {
        expect(resolveSourceEditTarget({ ...base, hasControlledCode: true })).toEqual({ kind: 'memory' });
        expect(resolveSourceEditTarget({ ...base, gallery: 'arm' })).toEqual({ kind: 'memory' });
        expect(resolveSourceEditTarget({ ...base, hasActiveProject: false })).toEqual({ kind: 'memory' });
    });
});

describe('targetForEdit', () => {
    it('keeps a staged script edit on its file (dev only); read-only wins', () => {
        expect(targetForEdit({ kind: 'project' }, 'examples/a.kcad.ts', true))
            .toEqual({ kind: 'script', script: 'examples/a.kcad.ts' });
        expect(targetForEdit({ kind: 'project' }, 'examples/a.kcad.ts', false)).toEqual({ kind: 'project' });
        expect(targetForEdit({ kind: 'project' }, undefined, true)).toEqual({ kind: 'project' });
        const readOnly = { kind: 'readOnly', hint: READ_ONLY_EDIT_HINT } as const;
        expect(targetForEdit(readOnly, 'examples/a.kcad.ts', true)).toBe(readOnly);
    });
});
