/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Toolbar } from '../Toolbar';

afterEach(() => cleanup());

function renderToolbar(overrides: Partial<Parameters<typeof Toolbar>[0]> = {}) {
    const props = {
        project: { name: 'so100-arm' },
        filename: 'so100.kcad.ts',
        isModified: false,
        onValidate: vi.fn(),
        onRun: vi.fn(),
        agentRailOpen: false,
        onToggleAgentRail: vi.fn(),
        referenceImagesPresent: false,
        referenceImagesVisible: true,
        onToggleReferenceImages: vi.fn(),
        ...overrides,
    };
    render(<Toolbar {...props} />);
    return props;
}

describe('Toolbar', () => {
    it('renders project name, filename, validate and run buttons', () => {
        renderToolbar();

        expect(screen.getByText('so100-arm')).toBeDefined();
        expect(screen.getByText('so100.kcad.ts')).toBeDefined();
        expect(screen.getByRole('button', { name: 'Validate' })).toBeDefined();
        expect(screen.getByRole('button', { name: 'Run' })).toBeDefined();
    });

    it('fires Validate callback when clicked', () => {
        const props = renderToolbar();
        fireEvent.click(screen.getByRole('button', { name: 'Validate' }));
        expect(props.onValidate).toHaveBeenCalledTimes(1);
    });

    it('fires Run callback when clicked', () => {
        const props = renderToolbar();
        fireEvent.click(screen.getByRole('button', { name: 'Run' }));
        expect(props.onRun).toHaveBeenCalledTimes(1);
    });

    it('fires onToggleAgentRail when agent button clicked', () => {
        const props = renderToolbar();
        fireEvent.click(screen.getByRole('button', { name: 'Open agent rail' }));
        expect(props.onToggleAgentRail).toHaveBeenCalledTimes(1);
    });

    it('reflects agentRailOpen state in the toggle button', () => {
        renderToolbar({ agentRailOpen: true });
        const btn = screen.getByRole('button', { name: 'Close agent rail' });
        expect(btn.getAttribute('aria-pressed')).toBe('true');
    });

    it('shows modified dot when isModified=true', () => {
        renderToolbar({ isModified: true });
        expect(screen.getByTestId('toolbar-modified-dot')).toBeDefined();
    });

    it('hides modified dot when isModified=false', () => {
        renderToolbar({ isModified: false });
        expect(screen.queryByTestId('toolbar-modified-dot')).toBeNull();
    });

    it('falls back to placeholder name when project is null', () => {
        renderToolbar({ project: null });
        expect(screen.getByText('Untitled Project')).toBeDefined();
    });

    it('omits the reference-images toggle when no reference image is present', () => {
        renderToolbar({ referenceImagesPresent: false });
        expect(screen.queryByRole('button', { name: /reference images?/i })).toBeNull();
    });

    it('renders the reference-images toggle when a reference image is present', () => {
        renderToolbar({ referenceImagesPresent: true, referenceImagesVisible: true });
        const btn = screen.getByRole('button', { name: 'Hide reference images' });
        expect(btn.getAttribute('aria-pressed')).toBe('true');
    });

    it('reflects hidden state in the reference-images toggle', () => {
        renderToolbar({ referenceImagesPresent: true, referenceImagesVisible: false });
        const btn = screen.getByRole('button', { name: 'Show reference images' });
        expect(btn.getAttribute('aria-pressed')).toBe('false');
    });

    it('fires onToggleReferenceImages when reference-images button clicked', () => {
        const props = renderToolbar({ referenceImagesPresent: true });
        fireEvent.click(screen.getByRole('button', { name: /reference images?/i }));
        expect(props.onToggleReferenceImages).toHaveBeenCalledTimes(1);
    });
});
