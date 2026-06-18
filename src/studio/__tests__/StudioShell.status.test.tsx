// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let workbenchComputing = false;
let agentRailOpen = false;
let recomputeRawPairs: Array<{ a: string; b: string; volumeMm3: number }> = [];
let recomputeValidity: { diagnostics: { code: string; severity: string }[] } | null = null;

vi.mock('../context/WorkbenchContext', () => ({
    useWorkbench: () => ({
        code: '',
        isReady: true,
        isComputing: workbenchComputing,
        error: null,
        geometries: [],
        selectedItemIds: [],
        viewMode3D: 'shadedWithEdges',
        layoutMode: 'split',
        activeDialog: null,
        executeGeometry: vi.fn(),
        mutateCode: vi.fn(),
        setSelectedItemId: vi.fn(),
        codeContext: { returnedVariables: [] },
        setActiveDialog: vi.fn(),
    }),
}));

vi.mock('../store/useShellStore', () => ({
    useShellStore: () => ({ agentRailOpen, selectedFeatureId: null }),
    shellStore: {
        setAgentRailOpen: vi.fn(),
        proposeStagedEdit: vi.fn(),
        pruneSectionKeepWhole: vi.fn(),
    },
}));

vi.mock('../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => ({
        features: [],
        geometries: [],
        validity: recomputeValidity,
        paramTable: null,
        diagnostics: [],
        recomputeMs: 0,
        joints: [],
        rawInterferencePairs: recomputeRawPairs,
    }),
}));

vi.mock('../context/ProjectContext', () => ({
    useProject: () => ({ activeProject: null }),
}));

vi.mock('../components/Layout/Header', () => ({ Header: () => <div data-testid="header" /> }));
vi.mock('../Toolbar', () => ({ Toolbar: () => <div data-testid="toolbar" /> }));
vi.mock('../Viewport', () => ({ Viewport: () => <div data-testid="viewport" /> }));
vi.mock('../Inspector', () => ({ Inspector: () => <div data-testid="inspector" /> }));
vi.mock('../AgentRail', () => ({ AgentRail: () => <div data-testid="agent-rail" /> }));
vi.mock('../BottomDrawer', () => ({ BottomDrawer: () => <div data-testid="bottom-drawer" /> }));
vi.mock('../components/Dialogs/ProjectManagerDialog', () => ({ default: () => null }));
vi.mock('../components/Layout/StatusBar', () => ({
    StatusBar: ({ isComputing, interferences }: { isComputing: boolean; interferences?: number }) => (
        <>
            <div data-testid="status-is-computing">{String(isComputing)}</div>
            <div data-testid="status-interferences">{String(interferences ?? 0)}</div>
        </>
    ),
}));

import { StudioShell } from '../StudioShell';

afterEach(() => cleanup());

beforeEach(() => {
    workbenchComputing = false;
    agentRailOpen = false;
    recomputeRawPairs = [];
    recomputeValidity = null;
});

describe('StudioShell status plumbing', () => {
    it('passes workbench computing state to the status bar', () => {
        workbenchComputing = true;

        render(<StudioShell />);

        expect(screen.getByTestId('status-is-computing').textContent).toBe('true');
    });

    it('places the open agent rail before the viewport', () => {
        agentRailOpen = true;

        render(<StudioShell />);

        const rail = screen.getByTestId('agent-rail');
        const viewport = screen.getByTestId('viewport');
        expect(rail.compareDocumentPosition(viewport) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('HUD interference count reads RAW pairs (pre-filter), not validator diagnostics', () => {
        // Simulate the lamp scenario: the script silences 3 known-acceptable
        // pairs via `ignore`, so the validator's diagnostic stream is empty
        // for `assembly.interference.overlap` — but the raw detection found
        // 3 contacts. The HUD MUST show 3, not 0.
        recomputeRawPairs = [
            { a: 'base', b: 'lower-arm', volumeMm3: 12 },
            { a: 'lower-arm', b: 'upper-arm', volumeMm3: 14 },
            { a: 'upper-arm', b: 'lamp-head', volumeMm3: 8 },
        ];
        recomputeValidity = { diagnostics: [] };

        render(<StudioShell />);

        expect(screen.getByTestId('status-interferences').textContent).toBe('3');
    });

    it('HUD shows 0 when raw pairs is empty, even if validator has unrelated diagnostics', () => {
        recomputeRawPairs = [];
        recomputeValidity = {
            diagnostics: [{ code: 'assembly.part.floating', severity: 'warning' }],
        };

        render(<StudioShell />);

        expect(screen.getByTestId('status-interferences').textContent).toBe('0');
    });
});
