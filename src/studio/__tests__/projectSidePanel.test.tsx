// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// The /p/<slug> side panel: the check verdict, the one Download (with the
// customizer's configuration baked in), "Keep this model" per ownership and
// "Continue in chat".

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { ProjectRow } from '../../funnel/lib/apiClient';

const wb = vi.hoisted(() => ({
    value: {} as Record<string, unknown>,
}));
const exporter = vi.hoisted(() => ({
    exportViaServer: vi.fn(),
    downloadBlob: vi.fn(),
}));

vi.mock('../context/WorkbenchContext', () => ({
    useWorkbench: () => wb.value,
}));
vi.mock('../exportViaServer', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../exportViaServer')>()),
    exportViaServer: exporter.exportViaServer,
    downloadBlob: exporter.downloadBlob,
}));
vi.mock('../customizer/StudioModelCustomizer', () => ({
    StudioModelCustomizer: () => <div data-testid="model-customizer" />,
}));
vi.mock('../routes/-ProjectViewerActions', () => ({ ProjectViewerActions: () => <div data-testid="viewer-actions" /> }));
vi.mock('../routes/-ServerRevisionHistory', () => ({ ServerRevisionList: () => null }));
vi.mock('../../funnel/components/SignInButton', () => ({
    SignInButton: ({ children, redirectTo }: { children: ReactNode; redirectTo?: string }) => (
        <button type="button" data-redirect={redirectTo}>{children}</button>
    ),
}));

import { ProjectSidePanel, useProjectDownload } from '../routes/-ProjectSidePanel';
import type { ProjectOwnership } from '../routes/-projectPageModel';

const CODE = "const w = param('Width', 40, { min: 10, max: 80 });\nreturn box(w, 10, 10);";

function mesh(max: number[]) {
    const vertices = new Float32Array([0, 0, 0, ...max, 0, max[1], 0]);
    return { featureId: 'box_1', faces: [{ vertices, indices: new Uint32Array([0, 1, 2]), normals: new Float32Array(9), faceId: 0 }] };
}

const ROW: ProjectRow = {
    id: 'p1',
    slug: 'pipe-clamp',
    title: 'Pipe clamp bracket',
    privacy: 'public_unlisted',
    current_code: CODE,
    parameters: [],
    version: 5,
    updated_at: '2026-09-29T10:00:00.000Z',
    owner_id: null,
};

function Harness(props: { ownership?: ProjectOwnership; session?: unknown }) {
    const download = useProjectDownload(ROW.slug, []);
    return (
        <ProjectSidePanel
            slug={ROW.slug}
            project={ROW}
            session={(props.session ?? null) as never}
            ownership={props.ownership ?? 'anonymous'}
            now={Date.parse('2026-09-29T12:00:00.000Z')}
            download={download}
            claiming={false}
            onClaim={vi.fn()}
            privacyBusy={false}
            upgradeNeeded={false}
            onTogglePrivacy={vi.fn()}
            onUpgrade={vi.fn()}
            onRestored={vi.fn()}
        />
    );
}

const writeText = vi.fn();

beforeEach(() => {
    wb.value = {
        code: CODE,
        geometries: [mesh([40, 10, 10])],
        featureRecords: [],
        scriptParams: [{ name: 'Width', type: 'number', value: 40, defaultValue: 40, meta: { min: 10, max: 80 } }],
        scriptReview: { ok: true, diagnostics: [], validator: { status: 'solved', partCount: 1, jointCount: 0 } },
        error: null,
    };
    exporter.exportViaServer.mockReset();
    exporter.downloadBlob.mockReset();
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

describe('ProjectSidePanel', () => {
    it('shows the title, a Verified badge for a model that passed its checks, and its size', () => {
        render(<Harness />);
        expect(screen.getByTestId('panel-title').textContent).toBe('Pipe clamp bracket');
        expect(screen.getByText('Verified')).toBeTruthy();
        expect(screen.getByText('no interferences')).toBeTruthy();
        expect(screen.getByTestId('model-size').textContent).toBe('40 × 10 × 10 mm');
        expect(screen.getByText(/Not saved to an account · 2 h ago · r5/)).toBeTruthy();
    });

    it('never says Verified when no check ran', () => {
        wb.value = { ...wb.value, scriptReview: null };
        render(<Harness />);
        expect(screen.queryByText('Verified')).toBeNull();
        expect(screen.getByText('Built')).toBeTruthy();
    });

    it('says the model did not build and disables Download', () => {
        wb.value = { ...wb.value, geometries: [], error: 'Unknown identifier foo' };
        render(<Harness />);
        expect(screen.getByText('Did not build')).toBeTruthy();
        expect((screen.getByTestId('download-primary') as HTMLButtonElement).disabled).toBe(true);
    });

    it('downloads the configuration in the page URL through the server export', async () => {
        window.history.replaceState(null, '', '/p/pipe-clamp?p.Width=62');
        const blob = new Blob(['solid']);
        exporter.exportViaServer.mockResolvedValue({ blob, downloadName: 'x.stl' });
        render(<Harness />);

        await act(async () => {
            fireEvent.click(screen.getByTestId('download-primary'));
        });

        await waitFor(() => expect(exporter.downloadBlob).toHaveBeenCalledTimes(1));
        const [format, code] = exporter.exportViaServer.mock.calls[0];
        expect(format).toBe('step');
        expect(code).toContain("param('Width', 62");
        expect(exporter.downloadBlob).toHaveBeenCalledWith(blob, 'pipe-clamp-Width62.step');
    });

    it('offers the dimensioned drawing in the download menu and exports it as a PDF', async () => {
        const blob = new Blob(['%PDF']);
        exporter.exportViaServer.mockResolvedValue({ blob, downloadName: 'x.pdf' });
        render(<Harness />);

        fireEvent.click(screen.getByTestId('download-formats'));
        await act(async () => {
            fireEvent.click(screen.getByRole('menuitem', { name: /^Drawing \(PDF\)/ }));
        });

        await waitFor(() => expect(exporter.downloadBlob).toHaveBeenCalledTimes(1));
        expect(exporter.exportViaServer.mock.calls[0][0]).toBe('pdf-drawing');
        expect(exporter.downloadBlob).toHaveBeenCalledWith(blob, 'pipe-clamp-drawing.pdf');
    });

    it('shows the export error with the server hint', async () => {
        exporter.exportViaServer.mockRejectedValue(Object.assign(new Error('mesh is not closed'), { hint: 'Try STEP instead.' }));
        render(<Harness />);
        await act(async () => {
            fireEvent.click(screen.getByTestId('download-primary'));
        });
        const status = await screen.findByTestId('download-status');
        expect(status.textContent).toContain('Download failed');
    });

    it('offers an anonymous visitor to sign in and keep the model, returning with claim=1', () => {
        render(<Harness />);
        const keep = screen.getByRole('button', { name: 'Sign in to keep' });
        expect(keep.getAttribute('data-redirect')).toContain('claim=1');
        expect(screen.getByRole('link', { name: 'Other ways to sign in' }).getAttribute('href')).toBe('/signin?next=%2Fp%2Fpipe-clamp');
    });

    it('lets a signed-in visitor save an anonymous project', () => {
        render(<Harness session={{ user: { id: 'u1' } }} />);
        expect(screen.getByRole('button', { name: 'Save to my projects' })).toBeTruthy();
    });

    it('tells the owner it is saved and hides Keep for someone else\'s project', () => {
        const { unmount } = render(<Harness ownership="owner" session={{ user: { id: 'u1' } }} />);
        expect(screen.getByTestId('keep-saved').textContent).toContain('Saved to your projects');
        expect(screen.getByRole('button', { name: 'Make private' })).toBeTruthy();
        unmount();
        render(<Harness ownership="other" />);
        expect(screen.queryByTestId('panel-keep')).toBeNull();
    });

    it('copies the resume prompt for the chat', async () => {
        render(<Harness />);
        fireEvent.click(screen.getByTestId('resume-prompt-copy'));
        await waitFor(() => expect(writeText).toHaveBeenCalledWith(
            'Continue kernelCAD project pipe-clamp: Pipe clamp bracket. Open it with get_project.',
        ));
        expect(await screen.findByText('Copied')).toBeTruthy();
        const claude = screen.getByRole('link', { name: 'Open Claude with this prompt' });
        expect(claude.getAttribute('href')).toContain('https://claude.ai/new?q=Continue%20kernelCAD');
    });
});
