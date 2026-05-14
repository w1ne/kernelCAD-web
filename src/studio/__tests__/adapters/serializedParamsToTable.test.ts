import { describe, expect, it } from 'vitest';
import { serializedParamsToTable } from '../../adapters/serializedParamsToTable';

describe('serializedParamsToTable', () => {
    it('empty input → null', () => {
        expect(serializedParamsToTable([])).toBeNull();
    });

    it('one number entry → table with 1 declared param', () => {
        const t = serializedParamsToTable([
            { name: 'Width', type: 'number', value: 60, defaultValue: 60, meta: { min: 10, max: 200 } },
        ]);
        expect(t?.size()).toBe(1);
        expect(t?.get('Width').value).toBe(60);
    });

    it('value differs from defaultValue → set is applied', () => {
        const t = serializedParamsToTable([
            { name: 'Wall', type: 'number', value: 12, defaultValue: 8 },
        ]);
        expect(t?.get('Wall').value).toBe(12);
        expect(t?.get('Wall').defaultValue).toBe(8);
    });

    it('skips invalid entries without throwing', () => {
        const t = serializedParamsToTable([
            { name: 'A', type: 'number', value: 1, defaultValue: 1 },
            // Duplicate — will throw inside declare; adapter must swallow.
            { name: 'A', type: 'number', value: 2, defaultValue: 2 },
            { name: 'B', type: 'boolean', value: true, defaultValue: false },
        ]);
        expect(t?.size()).toBe(2);
        expect(t?.get('A').value).toBe(1);
        expect(t?.get('B').value).toBe(true);
    });
});
