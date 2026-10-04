// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CommandPaletteDialog, type PalettePage, type RecentProjects } from './CommandPalette';
import type { Command } from '../hooks/useCommandRegistry';
import { inspectorTabRequests, useInspectorTabRequests, viewTargetRequests } from '../hooks/studioNavigation';
import { useViewerInteraction } from '../hooks/viewer/useViewerInteraction';

beforeAll(() => {
    // cmdk scrolls the active item into view; jsdom has no layout.
    Element.prototype.scrollIntoView = function scrollIntoView() {};
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

function Harness({ commands, recent, onClose = () => {} }: {
    commands: Command[];
    recent?: RecentProjects;
    onClose?: () => void;
}) {
    const [open, setOpen] = useState(true);
    const [page, setPage] = useState<PalettePage>('commands');
    return (
        <>
            <button type="button" onClick={() => setOpen(true)}>opener</button>
            <CommandPaletteDialog
                open={open}
                onClose={() => {
                    setOpen(false);
                    onClose();
                }}
                commands={commands}
                recent={recent}
                page={page}
                onPageChange={setPage}
            />
        </>
    );
}

function commandSet(overrides: Partial<Record<string, Partial<Command>>> = {}): Command[] {
    const base: Command[] = [
        { id: 'model.run', label: 'Run model', section: 'Modeling', keywords: ['execute'], action: vi.fn() },
        { id: 'export.stl', label: 'Export STL', section: 'Export', keywords: ['download'], action: vi.fn() },
        { id: 'export.dxf', label: 'Export DXF', section: 'Export', disabled: true, description: 'Needs a planar face', action: vi.fn() },
        { id: 'panels.inspector', label: 'Hide inspector', section: 'Panels', shortcut: ['Mod', '\\'], action: vi.fn() },
        { id: 'selection.clear', label: 'Clear selection', section: 'Selection', action: vi.fn() },
    ];
    return base.map((c) => ({ ...c, ...overrides[c.id] }));
}

describe('CommandPaletteDialog', () => {
    it('is a labelled modal with the search box focused', () => {
        render(<Harness commands={commandSet()} />);
        const dialog = screen.getByRole('dialog', { name: 'Command palette' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(screen.getByRole('combobox')).toHaveFocus();
    });

    it('puts the selection group first and shows shortcuts inline', () => {
        render(<Harness commands={commandSet()} />);
        const options = screen.getAllByRole('option');
        expect(options[0]).toHaveTextContent('Clear selection');
        const inspector = options.find((o) => o.textContent?.includes('Hide inspector'));
        expect(inspector?.querySelectorAll('kbd')).toHaveLength(2);
    });

    it('filters as you type, closes, then runs the top match on Enter', async () => {
        const user = userEvent.setup();
        const order: string[] = [];
        const commands = commandSet({ 'export.stl': { action: vi.fn(() => order.push('action')) } });
        render(<Harness commands={commands} onClose={() => order.push('close')} />);
        await user.type(screen.getByRole('combobox'), 'stl');
        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(1);
        // Search results say where each command lives.
        expect(options[0]).toHaveTextContent('Export STLExport');
        await user.keyboard('{Enter}');
        // The palette is gone (and has returned focus) before the command runs.
        expect(order).toEqual(['close', 'action']);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('ranks the best match first across groups', async () => {
        const user = userEvent.setup();
        const commands: Command[] = [
            { id: 'panels.tab.export', label: 'Show export options', section: 'Panels', action: vi.fn() },
            { id: 'export.stl', label: 'Export STL', section: 'Export', action: vi.fn() },
        ];
        render(<Harness commands={commands} recent={{
            status: 'ready',
            items: [{ id: 'exp-rig', title: 'Exposure rig', detail: 'Updated 1 h ago', onOpen: vi.fn() }],
        }} />);
        await user.type(screen.getByRole('combobox'), 'exp');
        const options = screen.getAllByRole('option');
        expect(options.map((o) => o.getAttribute('data-command-id'))).toEqual([
            'export.stl', 'recent.exp-rig', 'panels.tab.export',
        ]);
        expect(options[0]).toHaveAttribute('aria-selected', 'true');
        expect(options[1]).toHaveTextContent('Recent project');
    });

    it('says so when nothing matches', async () => {
        const user = userEvent.setup();
        render(<Harness commands={commandSet()} />);
        await user.type(screen.getByRole('combobox'), 'zzqq');
        expect(screen.getByText(/No command matches/)).toBeInTheDocument();
    });

    it('does not run a disabled command', async () => {
        const user = userEvent.setup();
        const commands = commandSet();
        render(<Harness commands={commands} />);
        const dxf = screen.getByRole('option', { name: /Export DXF/ });
        expect(dxf).toHaveAttribute('aria-disabled', 'true');
        await user.click(dxf);
        expect(commands[2].action).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes on Escape and on Mod+K', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(<Harness commands={commandSet()} onClose={onClose} />);
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).toBeNull();

        await user.click(screen.getByText('opener'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        await user.keyboard('{Control>}k{/Control}');
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('opens the shortcuts list in place; Escape goes back', async () => {
        const user = userEvent.setup();
        function WithHelp() {
            const [page, setPage] = useState<PalettePage>('commands');
            const commands: Command[] = [{
                id: 'help.shortcuts', label: 'Keyboard shortcuts', section: 'Help', keepOpen: true,
                action: () => setPage('shortcuts'),
            }];
            return <CommandPaletteDialog open onClose={() => {}} commands={commands} page={page} onPageChange={setPage} />;
        }
        render(<WithHelp />);
        await user.keyboard('{Enter}');
        const help = screen.getByRole('region', { name: 'Keyboard shortcuts' });
        expect(within(help).getByText('Open the command palette')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Back to commands' })).toHaveFocus();
        await user.keyboard('{Escape}');
        expect(screen.getByRole('combobox')).toHaveFocus();
    });

    it('shows loading, error and saved projects', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<Harness commands={[]} recent={{ status: 'loading' }} />);
        expect(screen.getByText('Loading your projects…')).toBeInTheDocument();

        const retry = vi.fn();
        rerender(<Harness commands={[]} recent={{ status: 'error', retry }} />);
        await user.click(screen.getByRole('option', { name: /Could not load your projects/ }));
        expect(retry).toHaveBeenCalled();

        const onOpen = vi.fn();
        rerender(<Harness commands={[]} recent={{
            status: 'ready',
            items: [{ id: 'pipe-clamp', title: 'Pipe clamp', detail: 'Updated 5 min ago', onOpen }],
        }} />);
        await user.click(screen.getByRole('option', { name: /Pipe clamp/ }));
        expect(onOpen).toHaveBeenCalled();
    });

    it('renders nothing while closed', () => {
        render(<CommandPaletteDialog open={false} onClose={() => {}} commands={commandSet()} page="commands" onPageChange={() => {}} />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});

describe('studio navigation requests', () => {
    it('moves the viewer camera like the view gizmo does', () => {
        const { result } = renderHook(() => useViewerInteraction({
            setHoveredItemId: () => {},
            sketchActive: false,
            viewportFocusTarget: null,
            viewportFocusTargetVersion: 0,
        }));
        expect(result.current.navigationRequest).toBeNull();
        act(() => viewTargetRequests.request('xy'));
        expect(result.current.navigationRequest).toEqual({ target: 'xy', id: 1 });
        act(() => viewTargetRequests.request('fit'));
        expect(result.current.navigationRequest).toEqual({ target: 'fit', id: 2 });
    });

    it('delivers inspector tab requests to the mounted listener', () => {
        const onTab = vi.fn();
        const { unmount } = renderHook(() => useInspectorTabRequests(onTab));
        act(() => inspectorTabRequests.request('code'));
        expect(onTab).toHaveBeenCalledWith('code');
        unmount();
        inspectorTabRequests.request('params');
        expect(onTab).toHaveBeenCalledTimes(1);
    });
});
