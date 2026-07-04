// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Toolbar } from '../Toolbar';

// ---------------------------------------------------------------------------
// Module mocks (hoisted so they apply before Toolbar is imported)
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
    useNavigate: () => mockNavigate,
}));

const mockSession = vi.fn<[], { session: { user: { email: string } } | null; loading: boolean }>();
vi.mock('../../funnel/hooks/useSession', () => ({
    useOptionalSession: () => mockSession(),
}));

const mockSaveProject = vi.fn();
vi.mock('../../funnel/lib/apiClient', () => ({
    saveProject: (...args: unknown[]) => mockSaveProject(...args),
}));

// ---------------------------------------------------------------------------

afterEach(() => {
    cleanup();
    mockNavigate.mockClear();
    mockSession.mockClear();
    mockSaveProject.mockClear();
});

beforeEach(() => {
    // Default: not signed in
    mockSession.mockReturnValue({ session: null, loading: false });
    // Mock clipboard
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
});

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
        code: 'const x = box(10, 10, 10);',
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

// ---------------------------------------------------------------------------
// Publish & Share
// ---------------------------------------------------------------------------

describe('Toolbar — Publish & Share', () => {
    it('renders a Publish & Share button', () => {
        renderToolbar();
        expect(screen.getByTestId('toolbar-publish')).toBeDefined();
    });

    it('navigates to /signin with current path as next when not signed in', async () => {
        mockSession.mockReturnValue({ session: null, loading: false });
        renderToolbar();
        fireEvent.click(screen.getByTestId('toolbar-publish'));
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
        expect(mockNavigate).toHaveBeenCalledWith({
            to: '/signin',
            search: { next: window.location.pathname },
        });
    });

    it('calls saveProject with privacy public_unlisted and the editor code when signed in', async () => {
        mockSession.mockReturnValue({ session: { user: { email: 'test@test.com' } }, loading: false });
        mockSaveProject.mockResolvedValue({ slug: 'test-slug', projectId: 'p-1' });

        renderToolbar({ code: 'const y = sphere(5);', projectName: 'My Model' });
        fireEvent.click(screen.getByTestId('toolbar-publish'));

        await waitFor(() => expect(mockSaveProject).toHaveBeenCalledTimes(1));
        const call = mockSaveProject.mock.calls[0][0];
        expect(call.privacy).toBe('public_unlisted');
        expect(call.code).toBe('const y = sphere(5);');
    });

    it('writes the /p/<slug> URL to the clipboard after a successful publish', async () => {
        mockSession.mockReturnValue({ session: { user: { email: 'test@test.com' } }, loading: false });
        mockSaveProject.mockResolvedValue({ slug: 'my-slug', projectId: 'p-2' });
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });

        renderToolbar({ code: 'box(1)' });
        fireEvent.click(screen.getByTestId('toolbar-publish'));

        await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
        expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/p/my-slug`);
    });

    it('shows "Link copied" feedback after a successful publish', async () => {
        mockSession.mockReturnValue({ session: { user: { email: 'test@test.com' } }, loading: false });
        mockSaveProject.mockResolvedValue({ slug: 'done-slug', projectId: 'p-3' });

        renderToolbar({ code: 'box(2)' });
        fireEvent.click(screen.getByTestId('toolbar-publish'));

        await waitFor(() => expect(screen.getByTestId('toolbar-publish-link')).toBeDefined());
        expect(screen.getByTestId('toolbar-publish-link').textContent).toContain('done-slug');
    });

    it('disables the publish button while saving', async () => {
        mockSession.mockReturnValue({ session: { user: { email: 'test@test.com' } }, loading: false });
        // Never resolves — keeps us in saving state
        mockSaveProject.mockReturnValue(new Promise(() => {}));

        renderToolbar({ code: 'box(3)' });
        fireEvent.click(screen.getByTestId('toolbar-publish'));

        await waitFor(() =>
            expect((screen.getByTestId('toolbar-publish') as HTMLButtonElement).disabled).toBe(true),
        );
    });
});

// ---------------------------------------------------------------------------
// My Designs link
// ---------------------------------------------------------------------------

describe('Toolbar — My Designs', () => {
    it('shows the My Designs link when the user is signed in', () => {
        mockSession.mockReturnValue({ session: { user: { email: 'a@b.com' } }, loading: false });
        renderToolbar();
        const link = screen.getByTestId('toolbar-my-designs');
        expect(link.getAttribute('href')).toBe('/me');
    });

    it('hides the My Designs link when not signed in', () => {
        mockSession.mockReturnValue({ session: null, loading: false });
        renderToolbar();
        expect(screen.queryByTestId('toolbar-my-designs')).toBeNull();
    });
});
