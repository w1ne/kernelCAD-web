// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import App from '../App';
import * as GeometryEngine from '../lib/geometryEngine';
import { initFeatures } from '../features/init';
import type { EditorLike } from '../types/editor';
import { parseCode } from '../lib/ast';

const runUIE2E = process.env.KERNELCAD_UI_E2E === '1';
const describeUI = runUIE2E ? describe : describe.skip;

vi.mock('../components/Viewer', () => ({
    default: () => <div data-testid="viewer-mock" />,
}));

vi.mock('../lib/geometryEngine', () => ({
    init: vi.fn().mockResolvedValue(undefined),
    executeCode: vi.fn().mockResolvedValue([]),
    exportSTEP: vi.fn().mockResolvedValue(new Blob()),
    exportSTL: vi.fn().mockResolvedValue(new Blob()),
    defaultCode: '// KernelCAD Start',
    GeometryEngine: {
        getInstance: () => ({
            initialize: vi.fn().mockResolvedValue(true),
            executeCode: vi.fn().mockResolvedValue({ geometries: [], sketches: [] }),
            exportSTEP: vi.fn().mockResolvedValue(new Blob()),
            exportSTL: vi.fn().mockResolvedValue(new Blob()),
        }),
    },
}));

vi.mock('../components/Editor', () => ({
    default: function EditorMock(props: { value: string; onChange: (value: string) => void; onMount?: (editor: EditorLike) => void }) {
        const { value, onChange, onMount } = props;

        React.useEffect(() => {
            if (!onMount) return;
            onMount({
                layout: vi.fn(),
                setPosition: vi.fn(),
                revealLineInCenter: vi.fn(),
                focus: vi.fn(),
                getModel: () => ({
                    getValue: () => value,
                    getLineContent: () => '',
                }),
                getPosition: () => ({ lineNumber: 1, column: 1 }),
                executeEdits: vi.fn(),
            });
        }, [onMount, value]);

        return (
            <textarea
                data-testid="code-editor"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        );
    },
}));

if (typeof window !== 'undefined') {
    window.ResizeObserver = class ResizeObserver {
        observe() { }
        unobserve() { }
        disconnect() { }
    };
}

describeUI('UI Workflows E2E', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        initFeatures();
    });

    afterEach(() => {
        cleanup();
    });

    it('should perform a full Sketch -> Extrude workflow via UI', async () => {
        render(<App />);

        await screen.findByTitle('Start Sketch (Plane Selection)');

        fireEvent.click(screen.getByTitle('Start Sketch (Plane Selection)'));
        fireEvent.click(await screen.findByText('XY Plane (Top)'));
        expect(await screen.findByText(/Sketch Mode - XY Plane/i)).toBeTruthy();

        const canvas = document.querySelector('canvas');
        expect(canvas).toBeDefined();
        if (!canvas) throw new Error('Canvas not found');

        canvas.getBoundingClientRect = vi.fn().mockReturnValue({
            width: 1200, height: 800, top: 0, left: 0, bottom: 800, right: 1200, x: 0, y: 0,
        });

        fireEvent.mouseDown(canvas, { clientX: 600, clientY: 400 });
        fireEvent.mouseMove(canvas, { clientX: 700, clientY: 400 });
        fireEvent.mouseUp(canvas, { clientX: 700, clientY: 400 });

        fireEvent.click(await screen.findByText(/Done \(1\)/i));
        expect(await screen.findByText(/Extrude:/i)).toBeTruthy();

        fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '50' } });
        fireEvent.click(screen.getByText('Extrude'));

        await waitFor(() => {
            const executeCalls = vi.mocked(GeometryEngine.executeCode).mock.calls;
            const generatedCode = executeCalls.map((c) => c[0]).join('\n');
            expect(generatedCode).toContain("new Sketcher('XY')");
            expect(generatedCode).toContain('.lineTo(');
            expect(generatedCode).toContain('.extrude(50)');
        }, { timeout: 10000 });
    });

    it('should delete a sketch from history without corrupting code', async () => {
        render(<App />);

        const initialCode = `
export default function main() {
  function drawPart() {
    const box = replicad.makeBox(10, 10, 10);
    const sketch = new Sketcher('XY')
      .movePointerTo([0, 0])
      .lineTo([10, 0])
      .done();
    return [box, sketch];
  }
  return drawPart();
}
`.trim();

        expect(typeof window.setCode).toBe('function');
        window.setCode?.(initialCode);

        expect(await screen.findByText('sketch')).toBeTruthy();
        fireEvent.click(screen.getByText('sketch'));
        const editor = screen.getByTestId('code-editor') as HTMLTextAreaElement;
        editor.focus();
        fireEvent.keyDown(editor, { key: 'Delete' });

        await waitFor(() => {
            expect(editor.value).not.toContain('const sketch');
            expect(editor.value).not.toContain('onst sketch');
            expect(editor.value).toContain('return [box]');
            expect(() => parseCode(editor.value)).not.toThrow();
        });
    });

    it('should expose test window helpers for selection and hover', async () => {
        render(<App />);

        await waitFor(() => {
            expect(typeof window.__TEST_SELECT_ITEM).toBe('function');
            expect(typeof window.__TEST_SET_HOVERED).toBe('function');
            expect(typeof window.selectedItemId).toBe('function');
            expect(typeof window.getHoveredItemId).toBe('function');
            expect(typeof window.getGeometryMetrics).toBe('function');
            expect(typeof window.getEngineDiagnostics).toBe('function');
            expect(typeof window.resetEngineDiagnostics).toBe('function');
            expect(typeof window.getMutationDiagnostics).toBe('function');
            expect(typeof window.resetMutationDiagnostics).toBe('function');
        });

        const historyId = 'box:1:1:10';
        window.__TEST_SELECT_ITEM?.(historyId);
        expect(window.selectedItemId?.()).toBe(historyId);

        window.__TEST_SET_HOVERED?.(historyId);
        expect(window.getHoveredItemId?.()).toBe(historyId);
        expect(window.getGeometryMetrics?.()).toEqual({
            staleMainResponsesDropped: 0,
            stalePreviewResponsesDropped: 0,
            currentCodeRevision: 0,
            lastSuccessfulRevision: null,
            executionHistoryLength: 0,
        });
        expect(window.getExecutionHistory?.()).toEqual([]);
        expect(window.getMutationDiagnostics?.()).toEqual({
            attempts: 0,
            succeeded: 0,
            failed: 0,
        });
    });

    it('should recover after reload and delete an autosaved sketch without syntax errors', async () => {
        const autosavedCode = `
export default function main() {
  function drawPart() {
    const box = replicad.makeBox(10, 10, 10);
    const sketch = new Sketcher('XY')
      .movePointerTo([0, 0])
      .lineTo([10, 0])
      .done();
    return [box, sketch];
  }
  return drawPart();
}
`.trim();

        localStorage.setItem('kernelcad_current_project', JSON.stringify({
            version: '1.0',
            name: 'Auto-saved Project',
            code: autosavedCode,
            viewState: {
                viewMode: 'code',
                viewMode3D: 'shaded',
                sidePanelVisible: true,
                showSketches: true
            },
            lastUpdated: new Date('2026-02-12T00:00:00.000Z').toISOString()
        }));

        const { unmount } = render(<App />);
        expect(await screen.findByText('sketch')).toBeTruthy();
        unmount();

        render(<App />);

        expect(await screen.findByText('sketch')).toBeTruthy();
        fireEvent.click(screen.getByText('sketch'));
        fireEvent.keyDown(window, { key: 'Delete' });

        await waitFor(() => {
            const editor = screen.getByTestId('code-editor') as HTMLTextAreaElement;
            expect(editor.value).not.toContain('const sketch');
            expect(() => parseCode(editor.value)).not.toThrow();
            expect(screen.queryByText(/SyntaxError:/i)).toBeNull();
        });
    });
});
