import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShellStore } from '../store/shellStore';
import type { ValidatorResult } from '../../modeling/mates/validator';

function makeValidity(status: ValidatorResult['status']): ValidatorResult {
    return { status, diagnostics: [], partCount: 0, jointCount: 0 };
}

describe('ShellStore', () => {
    let store: ShellStore;

    afterEach(() => {
        store?.reset();
    });

    it('initial snapshot is all-null UI state', () => {
        store = new ShellStore();
        const s = store.getSnapshot();
        expect(s.selectedFeatureId).toBeNull();
        expect(s.agentRailOpen).toBe(false);
        expect(s.previousValidity).toBeNull();
        expect(s.currentValidity).toBeNull();
    });

    it('setSelectedFeatureId fans out exactly once per distinct value', () => {
        store = new ShellStore();
        const listener = vi.fn();
        store.subscribe(listener);

        store.setSelectedFeatureId('output-horn');
        store.setSelectedFeatureId('output-horn'); // idempotent
        store.setSelectedFeatureId('bracket');
        store.setSelectedFeatureId(null);
        store.setSelectedFeatureId(null); // idempotent

        expect(listener).toHaveBeenCalledTimes(3);
        expect(store.getSnapshot().selectedFeatureId).toBeNull();
    });

    it('setAgentRailOpen is idempotent on same value', () => {
        store = new ShellStore();
        const listener = vi.fn();
        store.subscribe(listener);

        store.setAgentRailOpen(true);
        store.setAgentRailOpen(true);
        store.setAgentRailOpen(false);

        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('publishValidity rotates current → previous', () => {
        store = new ShellStore();
        const v1 = makeValidity('solved');
        const v2 = makeValidity('error');
        const v3 = makeValidity('solved');

        store.publishValidity(v1);
        expect(store.getSnapshot().previousValidity).toBeNull();
        expect(store.getSnapshot().currentValidity).toBe(v1);

        store.publishValidity(v2);
        expect(store.getSnapshot().previousValidity).toBe(v1);
        expect(store.getSnapshot().currentValidity).toBe(v2);

        store.publishValidity(v3);
        expect(store.getSnapshot().previousValidity).toBe(v2);
        expect(store.getSnapshot().currentValidity).toBe(v3);
    });

    it('publishValidity of identical reference is a no-op', () => {
        store = new ShellStore();
        const v1 = makeValidity('solved');
        const listener = vi.fn();
        store.subscribe(listener);

        store.publishValidity(v1);
        store.publishValidity(v1);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(store.getSnapshot().previousValidity).toBeNull();
    });

    it('publishValidity(null) is a valid clear, fans out once', () => {
        store = new ShellStore();
        store.publishValidity(makeValidity('solved'));
        const listener = vi.fn();
        store.subscribe(listener);

        store.publishValidity(null);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(store.getSnapshot().currentValidity).toBeNull();
    });

    it('subscribe returns an unsubscribe function', () => {
        store = new ShellStore();
        const listener = vi.fn();
        const unsubscribe = store.subscribe(listener);

        store.setSelectedFeatureId('a');
        unsubscribe();
        store.setSelectedFeatureId('b');

        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('proposeStagedEdit populates the slot and fans out', () => {
        store = new ShellStore();
        const listener = vi.fn();
        store.subscribe(listener);

        store.proposeStagedEdit({
            id: 'e1',
            intent: 'x',
            fromCode: 'a',
            toCode: 'b',
        });
        expect(store.getSnapshot().stagedEdit?.id).toBe('e1');
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('proposeStagedEdit is idempotent on identical reference', () => {
        store = new ShellStore();
        const edit = { id: 'e1', intent: 'x', fromCode: 'a', toCode: 'b' };
        store.proposeStagedEdit(edit);
        const listener = vi.fn();
        store.subscribe(listener);
        store.proposeStagedEdit(edit);
        expect(listener).not.toHaveBeenCalled();
    });

    it('clearStagedEdit clears and fans out once', () => {
        store = new ShellStore();
        store.proposeStagedEdit({ id: 'e1', intent: 'x', fromCode: 'a', toCode: 'b' });
        const listener = vi.fn();
        store.subscribe(listener);
        store.clearStagedEdit();
        store.clearStagedEdit();
        expect(store.getSnapshot().stagedEdit).toBeNull();
        expect(listener).toHaveBeenCalledTimes(1);
    });
});
