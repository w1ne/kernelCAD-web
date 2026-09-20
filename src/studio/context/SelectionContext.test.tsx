// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// Characterisation cover for SelectionProvider, written before the
// phase-split refactor: pins the observable context value, the state-machine
// side effects of setIsFaceSelecting/setSketchMode, and the localStorage
// persistence of hiddenIds.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { SelectionProvider, useSelection } from './SelectionContext';
import { WorkbenchStateProvider } from './WorkbenchStateContext';

function Probe() {
    const selection = useSelection();
    return (
        <div>
            <span data-testid="selectedItemIds">{JSON.stringify(selection.selectedItemIds)}</span>
            <span data-testid="selectedItemId">{String(selection.selectedItemId)}</span>
            <span data-testid="sketchMode">{JSON.stringify(selection.sketchMode)}</span>
            <span data-testid="isFaceSelecting">{String(selection.isFaceSelecting)}</span>
            <span data-testid="planes">{selection.planes.map((p) => p.id).join(',')}</span>
            <span data-testid="hiddenIds">{JSON.stringify(selection.hiddenIds)}</span>
            <span data-testid="selectedFace">{JSON.stringify(selection.selectedFace)}</span>
            <span data-testid="selectedSketchName">{String(selection.selectedSketchName)}</span>
            <span data-testid="sketches">{selection.sketches.length}</span>
            <button data-testid="select-a" onClick={() => selection.setSelectedItemId('a')} />
            <button data-testid="clear-selection" onClick={() => selection.setSelectedItemId(null)} />
            <button data-testid="toggle-a-multi" onClick={() => selection.toggleSelection('a', true)} />
            <button data-testid="toggle-b-multi" onClick={() => selection.toggleSelection('b', true)} />
            <button data-testid="toggle-c-single" onClick={() => selection.toggleSelection('c', false)} />
            <button data-testid="face-on" onClick={() => selection.setIsFaceSelecting(true)} />
            <button data-testid="face-off" onClick={() => selection.setIsFaceSelecting(false)} />
            <button
                data-testid="sketch-xy"
                onClick={() => selection.setSketchMode({ active: true, plane: 'XY', currentSketch: null, tool: 'line' })}
            />
            <button
                data-testid="sketch-off"
                onClick={() => selection.setSketchMode({ active: false, plane: null, currentSketch: null, tool: 'select' })}
            />
            <button data-testid="hide-x" onClick={() => selection.hideItem('x')} />
            <button data-testid="toggle-x" onClick={() => selection.toggleVisibility('x')} />
            <button data-testid="show-all" onClick={() => selection.showAll()} />
        </div>
    );
}

function renderSelection() {
    return render(
        <WorkbenchStateProvider>
            <SelectionProvider>
                <Probe />
            </SelectionProvider>
        </WorkbenchStateProvider>,
    );
}

function click(testId: string) {
    act(() => {
        screen.getByTestId(testId).click();
    });
}

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    cleanup();
});

describe('SelectionProvider characterisation', () => {
    it('exposes the documented initial value', () => {
        renderSelection();
        expect(screen.getByTestId('selectedFace').textContent).toBe('null');
        expect(screen.getByTestId('selectedSketchName').textContent).toBe('null');
        expect(screen.getByTestId('selectedItemIds').textContent).toBe('[]');
        expect(screen.getByTestId('selectedItemId').textContent).toBe('null');
        expect(screen.getByTestId('isFaceSelecting').textContent).toBe('false');
        expect(screen.getByTestId('sketches').textContent).toBe('0');
        expect(screen.getByTestId('planes').textContent).toBe('base-xy,base-xz,base-yz');
        expect(screen.getByTestId('hiddenIds').textContent).toBe('[]');
        expect(screen.getByTestId('sketchMode').textContent).toBe(
            JSON.stringify({ active: false, plane: null, currentSketch: null, tool: 'select' }),
        );
    });

    it('derives the primary id from the trailing multi-selection', () => {
        renderSelection();
        click('select-a');
        expect(screen.getByTestId('selectedItemIds').textContent).toBe('["a"]');
        expect(screen.getByTestId('selectedItemId').textContent).toBe('a');

        click('toggle-b-multi');
        expect(screen.getByTestId('selectedItemIds').textContent).toBe('["a","b"]');
        expect(screen.getByTestId('selectedItemId').textContent).toBe('b');

        click('toggle-a-multi');
        expect(screen.getByTestId('selectedItemIds').textContent).toBe('["b"]');
        expect(screen.getByTestId('selectedItemId').textContent).toBe('b');

        click('toggle-c-single');
        expect(screen.getByTestId('selectedItemIds').textContent).toBe('["c"]');

        click('clear-selection');
        expect(screen.getByTestId('selectedItemIds').textContent).toBe('[]');
        expect(screen.getByTestId('selectedItemId').textContent).toBe('null');
    });

    it('drives face selection and sketch mode through the central state machine', () => {
        renderSelection();
        click('face-on');
        expect(screen.getByTestId('isFaceSelecting').textContent).toBe('true');
        click('face-off');
        expect(screen.getByTestId('isFaceSelecting').textContent).toBe('false');

        click('sketch-xy');
        expect(screen.getByTestId('sketchMode').textContent).toBe(
            JSON.stringify({ active: true, plane: 'XY', currentSketch: null, tool: 'line' }),
        );
        click('sketch-off');
        expect(screen.getByTestId('sketchMode').textContent).toBe(
            JSON.stringify({ active: false, plane: null, currentSketch: null, tool: 'select' }),
        );
    });

    it('toggles and persists hiddenIds', () => {
        localStorage.setItem('kernelcad_hidden_ids', JSON.stringify(['pre']));
        renderSelection();
        expect(screen.getByTestId('hiddenIds').textContent).toBe('["pre"]');

        click('hide-x');
        expect(screen.getByTestId('hiddenIds').textContent).toBe('["pre","x"]');
        click('hide-x');
        expect(screen.getByTestId('hiddenIds').textContent).toBe('["pre","x"]');

        click('toggle-x');
        expect(screen.getByTestId('hiddenIds').textContent).toBe('["pre"]');
        expect(localStorage.getItem('kernelcad_hidden_ids')).toBe('["pre"]');

        click('show-all');
        expect(screen.getByTestId('hiddenIds').textContent).toBe('[]');
        expect(localStorage.getItem('kernelcad_hidden_ids')).toBe('[]');
    });
});
