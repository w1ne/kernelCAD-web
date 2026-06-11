// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** @vitest-environment jsdom */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EditorPanel } from '../EditorPanel';
import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock CodeEditor
vi.mock('../../Editor', () => ({
    default: ({ value, onChange, onMount }: any) => (
        <div data-testid="mock-editor">
            <textarea
                data-testid="editor-textarea"
                value={value}
                readOnly={false}
                onChange={(e) => onChange(e.target.value)}
            />
            <button onClick={() => onMount({ layout: vi.fn() })}>Mount</button>
        </div>
    )
}));

describe('EditorPanel', () => {
    afterEach(() => {
        cleanup();
    });

    const defaultProps = {
        code: 'const x = 1;',
        onChange: vi.fn(),
        onMount: vi.fn(),
        error: null,
        visible: true
    };

    it('should render the editor when visible', () => {
        render(<EditorPanel {...defaultProps} />);
        expect(screen.getByTestId('mock-editor')).toBeTruthy();
        const textarea = screen.getByTestId('editor-textarea') as HTMLTextAreaElement;
        expect(textarea.value).toBe('const x = 1;');
    });

    it('should not render anything when not visible', () => {
        const { container } = render(<EditorPanel {...defaultProps} visible={false} />);
        expect(container.firstChild).toBeNull();
    });

    it('should call onChange when editor content changes', () => {
        const onChange = vi.fn();
        render(<EditorPanel {...defaultProps} onChange={onChange} />);
        const textarea = screen.getByTestId('editor-textarea');
        fireEvent.change(textarea, { target: { value: 'const y = 2;' } });
        expect(onChange).toHaveBeenCalledWith('const y = 2;');
    });

    it('should display error message when provided', () => {
        render(<EditorPanel {...defaultProps} error="Syntax error at line 1" />);
        expect(screen.getByText(/Syntax error at line 1/i)).toBeTruthy();
    });

    it('should trigger onMount when editor mounts', () => {
        const onMount = vi.fn();
        render(<EditorPanel {...defaultProps} onMount={onMount} />);
        fireEvent.click(screen.getByText('Mount'));
        expect(onMount).toHaveBeenCalled();
    });
});
