// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { pointerIsOver } from './pointerOver';

type Ev = Parameters<typeof pointerIsOver>[1];
const ev = (type: string, pointerType: string): Ev => ({ type, pointerType });

function replay(events: Ev[]): boolean {
    return events.reduce((over, e) => pointerIsOver(over, e), false);
}

describe('pointerIsOver (hover pre-selection gate)', () => {
    it('is off before any pointer reaches the canvas (R3F pointer sits at the centre)', () => {
        // A phone or an untouched desktop page: no events. Hovering here tinted
        // the face under the screen centre with the 30 % orange overlay.
        expect(replay([])).toBe(false);
    });

    it('follows a mouse or pen in and out', () => {
        expect(replay([ev('pointerenter', 'mouse'), ev('pointermove', 'mouse')])).toBe(true);
        expect(replay([ev('pointermove', 'mouse'), ev('pointerleave', 'mouse')])).toBe(false);
        expect(replay([ev('pointermove', 'pen')])).toBe(true);
        expect(replay([ev('pointerdown', 'mouse'), ev('pointerup', 'mouse')])).toBe(true);
    });

    it('holds for a finger only while it is pressed', () => {
        expect(replay([ev('pointerdown', 'touch')])).toBe(true);
        expect(replay([ev('pointerdown', 'touch'), ev('pointermove', 'touch')])).toBe(true);
        expect(replay([ev('pointerdown', 'touch'), ev('pointerup', 'touch')])).toBe(false);
        expect(replay([ev('pointerdown', 'touch'), ev('pointercancel', 'touch')])).toBe(false);
        // A stray touch move without a press does not start hovering.
        expect(replay([ev('pointermove', 'touch')])).toBe(false);
    });
});
