/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Toolbar } from '../Toolbar';

afterEach(() => cleanup());

function renderToolbar(overrides: Partial<Parameters<typeof Toolbar>[0]> = {}) {
    const props = {
        isModified: false,
        onValidate: vi.fn(),
        onRun: vi.fn(),
        agentRailOpen: false,
        onToggleAgentRail: vi.fn(),
        referenceImagesPresent: false,
        referenceImagesVisible: true,
        onToggleReferenceImages: vi.fn(),
        markingMode: false,
        onToggleMarkingMode: vi.fn(),
        sectionMode: false,
        onToggleSectionMode: vi.fn(),
        inspectorOpen: true,
        onToggleInspector: vi.fn(),
        ...overrides,
    };
    render(<Toolbar {...props} />);
    return props;
}

describe('Toolbar', () => {
    it('renders validate and run buttons without duplicating project identity', () => {
        renderToolbar();

        expect(screen.queryByText('so100-arm')).toBeNull();
        expect(screen.queryByText('so100.kcad.ts')).toBeNull();
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

    it('places the agent toggle before validate and run controls', () => {
        renderToolbar();

        const agent = screen.getByRole('button', { name: 'Open agent rail' });
        const validate = screen.getByRole('button', { name: 'Validate' });
        const run = screen.getByRole('button', { name: 'Run' });

        expect(agent.compareDocumentPosition(validate) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(agent.compareDocumentPosition(run) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('shows modified dot when isModified=true', () => {
        renderToolbar({ isModified: true });
        expect(screen.getByTestId('toolbar-modified-dot')).toBeDefined();
    });

    it('hides modified dot when isModified=false', () => {
        renderToolbar({ isModified: false });
        expect(screen.queryByTestId('toolbar-modified-dot')).toBeNull();
    });

    it('does not render placeholder project text when no project is loaded', () => {
        renderToolbar();
        expect(screen.queryByText('Untitled Project')).toBeNull();
        expect(screen.queryByText('untitled.kcad.ts')).toBeNull();
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

    it('fires onToggleInspector when the panel button is clicked', () => {
        const props = renderToolbar();
        fireEvent.click(screen.getByTestId('toolbar-inspector'));
        expect(props.onToggleInspector).toHaveBeenCalledTimes(1);
    });

    it('reflects inspectorOpen state in the panel toggle', () => {
        renderToolbar({ inspectorOpen: true });
        const btn = screen.getByRole('button', { name: 'Hide inspector panel' });
        expect(btn.getAttribute('aria-pressed')).toBe('true');
    });

    it('reflects hidden inspector state in the panel toggle', () => {
        renderToolbar({ inspectorOpen: false });
        const btn = screen.getByRole('button', { name: 'Show inspector panel' });
        expect(btn.getAttribute('aria-pressed')).toBe('false');
    });

    it('renders the Connect link pointing at /connect', () => {
        renderToolbar();
        const link = screen.getByTestId('toolbar-connect-link');
        expect(link.getAttribute('href')).toBe('/connect');
        expect(link.textContent).toContain('Connect');
    });
});
