// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Characterisation for ParametricLayer: pins the marker tree it renders for
// POINT/LINE entities and the props/handlers it hands to TransformControls.
/** @vitest-environment happy-dom */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { Circle, Line, Point } from '../../../modeling/constraints/types';

// The layer renders R3F host elements (`<group>`, `<mesh>`, …) which react-dom
// turns into unknown DOM nodes. `group` needs the `position` of the THREE.Group
// R3F would hand the ref, or the centroid effect cannot park the dummy.
class FakeGroup extends HTMLElement {
    #position = new THREE.Vector3();
    get position(): THREE.Vector3 {
        return this.#position;
    }
    set position(value: THREE.Vector3 | [number, number, number]) {
        if (Array.isArray(value)) this.#position.set(value[0], value[1], value[2]);
        else this.#position.copy(value);
    }
}
customElements.define('x-kc-group', FakeGroup);
const nativeCreateElement = document.createElement.bind(document);
document.createElement = ((tag: string, options?: ElementCreationOptions) =>
    tag === 'group' ? nativeCreateElement('x-kc-group', options) : nativeCreateElement(tag, options)
) as typeof document.createElement;

const hoisted = vi.hoisted(() => ({
    transformProps: null as null | {
        mode?: string;
        showZ?: boolean;
        size?: number;
        translationSnap?: number;
        object?: unknown;
        onMouseDown?: () => void;
        onObjectChange?: () => void;
        onMouseUp?: () => void;
    },
    selectEntity: vi.fn(),
    updateEntity: vi.fn(),
    solve: vi.fn(),
    entities: new Map<string, unknown>(),
    selectedEntityIds: [] as string[],
}));

vi.mock('@react-three/drei/core/TransformControls', () => ({
    TransformControls: (props: NonNullable<typeof hoisted.transformProps>) => {
        hoisted.transformProps = props;
        return null;
    },
}));

vi.mock('../../../context/WorkbenchContext', () => ({
    useWorkbench: () => ({
        entities: hoisted.entities,
        selectedEntityIds: hoisted.selectedEntityIds,
        selectEntity: hoisted.selectEntity,
        updateEntity: hoisted.updateEntity,
        solve: hoisted.solve,
    }),
}));

import { ParametricLayer } from './ParametricLayer';

function point(id: string, x: number, y: number): Point {
    return { id, type: 'POINT', x, y, fixed: false };
}

function line(id: string, p1: string, p2: string): Line {
    return { id, type: 'LINE', p1, p2 };
}

function circle(id: string, center: string, radius: number): Circle {
    return { id, type: 'CIRCLE', center, radius };
}

beforeEach(() => {
    hoisted.transformProps = null;
    hoisted.entities = new Map<string, unknown>();
    hoisted.selectedEntityIds = [];
    hoisted.selectEntity.mockReset();
    hoisted.updateEntity.mockReset();
    hoisted.solve.mockReset();
});

afterEach(() => cleanup());

describe('ParametricLayer characterisation', () => {
    it('renders one marker per POINT and one segment per resolvable LINE', () => {
        hoisted.entities = new Map<string, unknown>([
            ['p1', point('p1', 1, 2)],
            ['p2', point('p2', 3, 4)],
            ['l1', line('l1', 'p1', 'p2')],
            ['l2', line('l2', 'p1', 'missing')],
            ['c1', circle('c1', 'p1', 2)],
        ]);
        const { container } = render(<ParametricLayer />);

        expect(container.querySelectorAll('sphereGeometry').length).toBe(2);
        expect(container.querySelectorAll('lineSegments').length).toBe(1);
        expect(container.querySelectorAll('meshBasicMaterial').length).toBe(2);
        expect(container.querySelectorAll('lineBasicMaterial').length).toBe(1);
        expect(hoisted.transformProps).toBeNull();
    });

    it('colours selected markers differently and selects on click', () => {
        hoisted.entities = new Map<string, unknown>([
            ['p1', point('p1', 1, 2)],
            ['p2', point('p2', 3, 4)],
            ['l1', line('l1', 'p1', 'p2')],
        ]);
        hoisted.selectedEntityIds = ['p1', 'l1'];
        const { container } = render(<ParametricLayer />);

        const materials = [...container.querySelectorAll('meshBasicMaterial')];
        expect(materials.map((m) => m.getAttribute('color'))).toEqual(['red', 'yellow']);
        expect(container.querySelector('lineBasicMaterial')!.getAttribute('color')).toBe('orange');

        fireEvent.click(container.querySelectorAll('mesh')[0], { metaKey: true });
        expect(hoisted.selectEntity).toHaveBeenCalledWith('p1', true);
        fireEvent.click(container.querySelector('lineSegments')!);
        expect(hoisted.selectEntity).toHaveBeenCalledWith('l1', false);
    });

    it('parks the transform gizmo at the selected points centroid', () => {
        hoisted.entities = new Map<string, unknown>([
            ['p1', point('p1', 1, 2)],
            ['p2', point('p2', 3, 4)],
        ]);
        hoisted.selectedEntityIds = ['p1', 'p2'];
        render(<ParametricLayer />);

        expect(hoisted.transformProps).not.toBeNull();
        expect(hoisted.transformProps!.mode).toBe('translate');
        expect(hoisted.transformProps!.showZ).toBe(false);
        expect(hoisted.transformProps!.size).toBe(0.6);
        expect(hoisted.transformProps!.translationSnap).toBe(0.5);
        const dummy = hoisted.transformProps!.object as FakeGroup;
        expect([dummy.position.x, dummy.position.y]).toEqual([2, 3]);
    });

    it('translates the captured points by the dummy delta and re-solves', () => {
        hoisted.entities = new Map<string, unknown>([
            ['p1', point('p1', 1, 2)],
            ['p2', point('p2', 3, 4)],
        ]);
        hoisted.selectedEntityIds = ['p1', 'p2'];
        render(<ParametricLayer />);

        const dummy = hoisted.transformProps!.object as FakeGroup;
        act(() => hoisted.transformProps!.onMouseDown!());
        dummy.position.x = 5;
        dummy.position.y = 7;
        act(() => hoisted.transformProps!.onObjectChange!());

        expect(hoisted.updateEntity).toHaveBeenCalledWith('p1', { x: 4, y: 6 });
        expect(hoisted.updateEntity).toHaveBeenCalledWith('p2', { x: 6, y: 8 });
        expect(hoisted.solve).toHaveBeenCalledTimes(1);

        act(() => hoisted.transformProps!.onMouseUp!());
        act(() => hoisted.transformProps!.onObjectChange!());
        expect(hoisted.updateEntity).toHaveBeenCalledTimes(2);
    });
});
