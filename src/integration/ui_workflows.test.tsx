// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import App from '../App';
import * as GeometryEngine from '../lib/geometryEngine';
import { initFeatures } from '../features/init';
import type { EditorLike } from '../types/editor';

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
});
