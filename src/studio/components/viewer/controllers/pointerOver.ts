// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** True while a pointer actually points at `el`: a mouse or pen over it, or
 *  a finger pressed on it. R3F's pointer starts at the canvas centre and a
 *  touch leaves it where the finger lifted, so without this gate a viewer
 *  that is only being looked at (a phone, an embed, a desktop page the mouse
 *  has not entered yet) pre-selects whatever face sits under the centre and
 *  tints it with the hover overlay. */
export function pointerIsOver(over: boolean, e: Pick<PointerEvent, 'type' | 'pointerType'>): boolean {
    if (e.type === 'pointerleave' || e.type === 'pointercancel') return false;
    if (e.pointerType === 'touch') {
        if (e.type === 'pointerdown') return true;
        if (e.type === 'pointerup') return false;
        return over;
    }
    return true;
}
