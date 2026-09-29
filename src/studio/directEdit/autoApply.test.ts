// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    AUTO_APPLY_STORAGE_KEY,
    autoApplyBlockReason,
    isAutoApplyEnabled,
    isValidityDrop,
    resetAutoApplySettingCache,
    setAutoApplyEnabled,
} from './autoApply';
import type { StagedEdit } from '../store/shellStore';

const drag: StagedEdit = {
    id: 'd1',
    intent: 'move',
    fromCode: 'a',
    toCode: 'b',
    evaluation: { ok: true },
    source: { kind: 'human', label: 'drag' },
};

beforeEach(() => {
    localStorage.clear();
    resetAutoApplySettingCache();
});

afterEach(() => {
    vi.restoreAllMocks();
    resetAutoApplySettingCache();
});

describe('auto-apply setting', () => {
    it('defaults to on and persists a change locally', () => {
        expect(isAutoApplyEnabled()).toBe(true);
        setAutoApplyEnabled(false);
        expect(localStorage.getItem(AUTO_APPLY_STORAGE_KEY)).toBe('false');
        resetAutoApplySettingCache();
        expect(isAutoApplyEnabled()).toBe(false);
    });

    it('falls back to the default when storage throws', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
        expect(isAutoApplyEnabled()).toBe(true);
    });
});

describe('autoApplyBlockReason', () => {
    it('lets a clean UI drag apply', () => {
        expect(autoApplyBlockReason(drag)).toBeNull();
        expect(autoApplyBlockReason({
            ...drag,
            validityDelta: { fromInterferences: 1, toInterferences: 0, fromVolumeMm3: 800, toVolumeMm3: 0, fromOk: false, toOk: true },
        })).toBeNull();
    });

    it('keeps agent and test proposals in review', () => {
        expect(autoApplyBlockReason({ ...drag, source: { kind: 'agent' } })).toMatch(/Agent edits/);
        expect(autoApplyBlockReason({ ...drag, source: undefined })).toMatch(/Agent edits/);
    });

    it('refuses a failed run and a validity drop, with the reason', () => {
        expect(autoApplyBlockReason({ ...drag, evaluation: { ok: false, error: 'boom' } })).toContain('failed to run (boom)');
        expect(autoApplyBlockReason({
            ...drag,
            validityDelta: { fromInterferences: 0, toInterferences: 2, fromVolumeMm3: 0, toVolumeMm3: 5, fromOk: true, toOk: false },
        })).toContain('interferences 0 → 2');
    });

    it('counts more interference volume or a valid→invalid flip as a drop', () => {
        const same = { fromInterferences: 1, toInterferences: 1, fromVolumeMm3: 10, toVolumeMm3: 10, fromOk: true, toOk: true };
        expect(isValidityDrop(same)).toBe(false);
        expect(isValidityDrop({ ...same, toVolumeMm3: 11 })).toBe(true);
        expect(isValidityDrop({ ...same, toOk: false })).toBe(true);
    });
});
