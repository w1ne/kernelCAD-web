# kernelCAD Studio UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved Split Studio UI retrofit: hybrid Fusion/code-first shell with browser, viewport, Monaco, timeline, status, horizontal ribbon, and layout toggles.

**Architecture:** Keep the existing React Context stack and workbench providers. Add a small layout-mode state boundary, then retrofit current shell components instead of moving to `src/studio/` or rewriting command/core systems. New `TimelinePanel` and `StatusBar` are read-mostly UI surfaces fed by current code/history/geometry state.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS utility classes, lucide-react icons, Vitest + Testing Library, Playwright.

---

## File Structure

Create:

- `src/types/layout.ts` — `StudioLayoutMode` type shared by context/header/layout tests.
- `src/components/Layout/StatusBar.tsx` — status strip for prompt, compute state, selection, diagnostics.
- `src/components/Layout/StatusBar.test.tsx` — component tests for ready/computing/error states.
- `src/components/Layout/TimelinePanel.tsx` — lightweight history-derived bottom timeline.
- `src/components/Layout/TimelinePanel.test.tsx` — component tests for timeline render/select/toggle/delete.

Modify:

- `src/context/UIContext.tsx` — add `layoutMode` and `setLayoutMode`, persisted separately from legacy `viewMode`.
- `src/context/WorkbenchContext.tsx` — expose `layoutMode` through `useWorkbench()`.
- `src/components/Layout/Header.tsx` — project/workspace/control row with `Split`, `Viewport`, `Code` layout controls.
- `src/components/Layout/Header.test.tsx` — assert workspace tabs, layout controls, export, and view mode controls.
- `src/components/Toolbar.tsx` — change vertical rail to horizontal grouped ribbon.
- `src/components/Toolbar.test.tsx` — assert ribbon groups and command clicks.
- `src/components/Layout/WorkbenchLayout.tsx` — compose the Split Studio shell directly.
- `src/components/Layout/SidePanel.tsx` — remove the default AI assistant tab, keep browser-focused panel.
- `src/components/Layout/SidePanel.test.tsx` — update for browser-only SidePanel.
- `src/components/Shared/FloatingPanel.tsx` — default panels to viewport top-right.
- `src/config/panels.tsx` — normalize command panel initial positions.
- `tests/smoke.spec.ts` — assert Split Studio surfaces on load.

Leave unchanged unless a test failure proves otherwise:

- Core/kernel files under `src/capture`, `src/compute`, `src/backends`, `src/script-runtime`.
- Feature implementations under `src/features/core`.
- Command manager internals.
- Monaco editor implementation.
- R3F viewer internals.

---

## Task 1: Add Studio Layout Mode State

**Files:**
- Create: `src/types/layout.ts`
- Modify: `src/context/UIContext.tsx`
- Modify: `src/context/WorkbenchContext.tsx`
- Test: `src/context/UIContext.test.tsx`

- [ ] **Step 1: Write the failing layout-mode context test**

Create `src/context/UIContext.test.tsx`:

```tsx
/** @vitest-environment happy-dom */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { UIProvider, useUI } from './UIContext';
import { WorkbenchStateProvider } from './WorkbenchStateContext';

function wrapper({ children }: { children: React.ReactNode }) {
    return (
        <WorkbenchStateProvider>
            <UIProvider>{children}</UIProvider>
        </WorkbenchStateProvider>
    );
}

describe('UIContext layout mode', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('defaults to split layout mode', () => {
        const { result } = renderHook(() => useUI(), { wrapper });
        expect(result.current.layoutMode).toBe('split');
    });

    it('updates and persists layout mode', () => {
        const { result, unmount } = renderHook(() => useUI(), { wrapper });

        act(() => {
            result.current.setLayoutMode('viewport');
        });

        expect(result.current.layoutMode).toBe('viewport');
        expect(window.localStorage.getItem('kernelcad:layoutMode')).toBe('viewport');

        unmount();

        const { result: next } = renderHook(() => useUI(), { wrapper });
        expect(next.current.layoutMode).toBe('viewport');
    });
});
```

- [ ] **Step 2: Run the context test and verify it fails**

Run:

```bash
npm test -- src/context/UIContext.test.tsx
```

Expected: FAIL because `layoutMode` and `setLayoutMode` do not exist on `UIContextType`.

- [ ] **Step 3: Add the shared layout type**

Create `src/types/layout.ts`:

```ts
export type StudioLayoutMode = 'split' | 'viewport' | 'code';
```

- [ ] **Step 4: Extend `UIContext` with layout mode**

Modify `src/context/UIContext.tsx`.

Add the import near the existing imports:

```ts
import type { StudioLayoutMode } from '../types/layout';
```

Extend `UIContextType`:

```ts
export interface UIContextType {
    viewMode: 'code' | 'gui';
    setViewMode: (mode: 'code' | 'gui') => void;
    layoutMode: StudioLayoutMode;
    setLayoutMode: (mode: StudioLayoutMode) => void;
    viewMode3D: ViewMode3D;
    setViewMode3D: (mode: ViewMode3D) => void;
    activeDialog: string | null;
    setActiveDialog: (dialogId: string | null) => void;
    sidePanelVisible: boolean;
    setSidePanelVisible: (visible: boolean) => void;
    toggleSidePanel: () => void;
    activePanels: string[];
    openPanel: (id: string) => void;
    closePanel: (id: string) => void;
    contextMenu: { visible: boolean; position: { x: number, y: number } | null; type: 'FACE' | 'EDGE' | 'VERTEX' | 'SKETCH' };
    setContextMenu: (menu: { visible: boolean; position: { x: number, y: number } | null; type: 'FACE' | 'EDGE' | 'VERTEX' | 'SKETCH' }) => void;
}
```

Add `layoutMode` to `STORAGE_KEYS`:

```ts
const STORAGE_KEYS = {
    viewMode: 'kernelcad:viewMode',
    layoutMode: 'kernelcad:layoutMode',
    viewMode3D: 'kernelcad:viewMode3D',
    sidePanelVisible: 'kernelcad:sidePanelVisible',
} as const;
```

Add this reader below `readStoredViewMode()`:

```ts
function readStoredLayoutMode(): StudioLayoutMode {
    if (typeof window === 'undefined') return 'split';
    const raw = window.localStorage.getItem(STORAGE_KEYS.layoutMode);
    return raw === 'split' || raw === 'viewport' || raw === 'code' ? raw : 'split';
}
```

Inside `UIProvider`, add the state after `viewMode`:

```ts
const [layoutMode, setLayoutMode] = useState<StudioLayoutMode>(() => readStoredLayoutMode());
```

Add the persistence effect after the existing `viewMode` effect:

```ts
useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.layoutMode, layoutMode);
}, [layoutMode]);
```

Add `layoutMode` and `setLayoutMode` to the memoized value:

```ts
const value: UIContextType = useMemo(() => ({
    viewMode,
    setViewMode,
    layoutMode,
    setLayoutMode,
    viewMode3D,
    setViewMode3D,
    activeDialog,
    setActiveDialog,
    sidePanelVisible,
    setSidePanelVisible,
    toggleSidePanel,
    activePanels: state.activePanels,
    openPanel,
    closePanel,
    contextMenu,
    setContextMenu,
}), [viewMode, layoutMode, viewMode3D, activeDialog, setActiveDialog, sidePanelVisible, toggleSidePanel, state.activePanels, openPanel, closePanel, contextMenu]);
```

- [ ] **Step 5: Expose layout mode from `WorkbenchContext`**

Modify `src/context/WorkbenchContext.tsx`.

Inside the memoized `value`, add these after `setViewMode`:

```ts
layoutMode: uiCtx.layoutMode,
setLayoutMode: uiCtx.setLayoutMode,
```

Inside the dependency array, add these after `uiCtx.setViewMode`:

```ts
uiCtx.layoutMode,
uiCtx.setLayoutMode,
```

- [ ] **Step 6: Run the context test and verify it passes**

Run:

```bash
npm test -- src/context/UIContext.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/types/layout.ts src/context/UIContext.tsx src/context/WorkbenchContext.tsx src/context/UIContext.test.tsx
git commit -m "feat(ui): add studio layout mode state"
```

---

## Task 2: Add StatusBar

**Files:**
- Create: `src/components/Layout/StatusBar.tsx`
- Create: `src/components/Layout/StatusBar.test.tsx`

- [ ] **Step 1: Write the failing StatusBar tests**

Create `src/components/Layout/StatusBar.test.tsx`:

```tsx
/** @vitest-environment happy-dom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StatusBar } from './StatusBar';

afterEach(() => cleanup());

describe('StatusBar', () => {
    it('renders ready state with geometry and diagnostics summary', () => {
        render(
            <StatusBar
                isComputing={false}
                error={null}
                geometryCount={3}
                selectedCount={1}
                viewMode3D="shadedWithEdges"
                layoutMode="split"
                activeCommandLabel={null}
            />
        );

        expect(screen.getByText('Ready')).toBeDefined();
        expect(screen.getByText('3 bodies')).toBeDefined();
        expect(screen.getByText('1 selected')).toBeDefined();
        expect(screen.getByText('No diagnostics')).toBeDefined();
    });

    it('renders computing state', () => {
        render(
            <StatusBar
                isComputing={true}
                error={null}
                geometryCount={0}
                selectedCount={0}
                viewMode3D="wireframe"
                layoutMode="viewport"
                activeCommandLabel="Extrude"
            />
        );

        expect(screen.getByText('Computing...')).toBeDefined();
        expect(screen.getByText('Extrude')).toBeDefined();
        expect(screen.getByText('Wireframe')).toBeDefined();
    });

    it('renders error state with compact message', () => {
        render(
            <StatusBar
                isComputing={false}
                error={'OpenCascade Error (Code: 103)'}
                geometryCount={0}
                selectedCount={0}
                viewMode3D="shaded"
                layoutMode="code"
                activeCommandLabel={null}
            />
        );

        expect(screen.getByText('Error')).toBeDefined();
        expect(screen.getByText(/OpenCascade Error/)).toBeDefined();
    });
});
```

- [ ] **Step 2: Run the StatusBar test and verify it fails**

Run:

```bash
npm test -- src/components/Layout/StatusBar.test.tsx
```

Expected: FAIL because `StatusBar.tsx` does not exist.

- [ ] **Step 3: Implement `StatusBar`**

Create `src/components/Layout/StatusBar.tsx`:

```tsx
import { AlertTriangle, CheckCircle2, Loader2, MousePointer2 } from 'lucide-react';
import type { StudioLayoutMode } from '../../types/layout';
import type { ViewMode3D } from '../../types/viewMode';

interface StatusBarProps {
    isComputing: boolean;
    error: string | null;
    geometryCount: number;
    selectedCount: number;
    viewMode3D: ViewMode3D;
    layoutMode: StudioLayoutMode;
    activeCommandLabel: string | null;
}

function formatViewMode(mode: ViewMode3D): string {
    if (mode === 'shadedWithEdges') return 'Shaded + edges';
    if (mode === 'wireframe') return 'Wireframe';
    return 'Shaded';
}

function formatLayoutMode(mode: StudioLayoutMode): string {
    if (mode === 'split') return 'Split';
    if (mode === 'viewport') return 'Viewport';
    return 'Code';
}

function compactError(error: string): string {
    const firstLine = error.split('\n')[0]?.trim() || 'Unknown error';
    return firstLine.length > 96 ? `${firstLine.slice(0, 93)}...` : firstLine;
}

export function StatusBar({
    isComputing,
    error,
    geometryCount,
    selectedCount,
    viewMode3D,
    layoutMode,
    activeCommandLabel,
}: StatusBarProps) {
    const stateLabel = error ? 'Error' : isComputing ? 'Computing...' : 'Ready';
    const bodyLabel = geometryCount === 1 ? '1 body' : `${geometryCount} bodies`;
    const selectionLabel = selectedCount === 1 ? '1 selected' : `${selectedCount} selected`;

    return (
        <footer
            data-testid="status-bar"
            className="h-6 shrink-0 border-t border-[#2b313c] bg-[#101318] text-[11px] text-gray-400 flex items-center justify-between px-3 select-none"
        >
            <div className="flex items-center gap-3 min-w-0">
                <span className={`inline-flex items-center gap-1 font-medium ${error ? 'text-red-300' : isComputing ? 'text-blue-300' : 'text-emerald-300'}`}>
                    {error ? <AlertTriangle size={12} /> : isComputing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    {stateLabel}
                </span>
                {activeCommandLabel && (
                    <span className="text-blue-300">{activeCommandLabel}</span>
                )}
                {error ? (
                    <span className="truncate text-red-200 max-w-[48vw]">{compactError(error)}</span>
                ) : (
                    <span className="truncate">No diagnostics</span>
                )}
            </div>
            <div className="flex items-center gap-3">
                <span>{bodyLabel}</span>
                <span className="inline-flex items-center gap-1">
                    <MousePointer2 size={12} />
                    {selectionLabel}
                </span>
                <span>{formatViewMode(viewMode3D)}</span>
                <span>{formatLayoutMode(layoutMode)}</span>
            </div>
        </footer>
    );
}
```

- [ ] **Step 4: Run the StatusBar test and verify it passes**

Run:

```bash
npm test -- src/components/Layout/StatusBar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout/StatusBar.tsx src/components/Layout/StatusBar.test.tsx
git commit -m "feat(ui): add studio status bar"
```

---

## Task 3: Add TimelinePanel

**Files:**
- Create: `src/components/Layout/TimelinePanel.tsx`
- Create: `src/components/Layout/TimelinePanel.test.tsx`

- [ ] **Step 1: Write the failing TimelinePanel tests**

Create `src/components/Layout/TimelinePanel.test.tsx`:

```tsx
/** @vitest-environment happy-dom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HistoryItem } from '../../lib/codeAnalysis';
import { TimelinePanel } from './TimelinePanel';

const items: HistoryItem[] = [
    { id: 'box:1:1:20', name: 'box', type: 'Box', line: 1 },
    { id: 'fillet:2:1:30', name: 'fillet', type: 'Fillet', line: 2, detail: 'r=2' },
];

afterEach(() => cleanup());

describe('TimelinePanel', () => {
    it('renders timeline entries', () => {
        render(
            <TimelinePanel
                items={items}
                selectedItemId={null}
                hiddenIds={[]}
                onSelect={vi.fn()}
                onToggleVisibility={vi.fn()}
                onDelete={vi.fn()}
            />
        );

        expect(screen.getByText('Timeline')).toBeDefined();
        expect(screen.getByText('box')).toBeDefined();
        expect(screen.getByText('fillet')).toBeDefined();
        expect(screen.getByText('2 features')).toBeDefined();
    });

    it('selects a timeline entry', () => {
        const onSelect = vi.fn();
        render(
            <TimelinePanel
                items={items}
                selectedItemId={null}
                hiddenIds={[]}
                onSelect={onSelect}
                onToggleVisibility={vi.fn()}
                onDelete={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Box box/ }));
        expect(onSelect).toHaveBeenCalledWith(items[0]);
    });

    it('toggles visibility from the context menu', () => {
        const onToggleVisibility = vi.fn();
        render(
            <TimelinePanel
                items={items}
                selectedItemId={null}
                hiddenIds={[]}
                onSelect={vi.fn()}
                onToggleVisibility={onToggleVisibility}
                onDelete={vi.fn()}
            />
        );

        fireEvent.contextMenu(screen.getByRole('button', { name: /Fillet fillet/ }));
        fireEvent.click(screen.getByText('Hide / Show'));
        expect(onToggleVisibility).toHaveBeenCalledWith('fillet');
    });
});
```

- [ ] **Step 2: Run the TimelinePanel test and verify it fails**

Run:

```bash
npm test -- src/components/Layout/TimelinePanel.test.tsx
```

Expected: FAIL because `TimelinePanel.tsx` does not exist.

- [ ] **Step 3: Implement `TimelinePanel`**

Create `src/components/Layout/TimelinePanel.tsx`:

```tsx
import React from 'react';
import {
    Box,
    Circle,
    Cylinder,
    Eye,
    EyeOff,
    Layers,
    Rotate3D,
    Square,
    SquareArrowUp,
    SquareRoundCorner,
    SquaresIntersect,
    SquaresSubtract,
    SquaresUnite,
    Trash2,
} from 'lucide-react';
import type { HistoryItem } from '../../lib/codeAnalysis';
import { ChamferIcon } from '../../icons/cad';

interface TimelinePanelProps {
    items: HistoryItem[];
    selectedItemId: string | null;
    hiddenIds: string[];
    onSelect: (item: HistoryItem) => void;
    onToggleVisibility: (name: string) => void;
    onDelete: (item: HistoryItem) => void;
}

function iconForType(type: string) {
    switch (type) {
        case 'Box': return <Box size={14} />;
        case 'Cylinder': return <Cylinder size={14} />;
        case 'Sphere': return <Circle size={14} />;
        case 'Extrude': return <SquareArrowUp size={14} />;
        case 'Revolve': return <Rotate3D size={14} />;
        case 'Fillet': return <SquareRoundCorner size={14} />;
        case 'Chamfer': return <ChamferIcon size={14} />;
        case 'Cut': return <SquaresSubtract size={14} />;
        case 'Union': return <SquaresUnite size={14} />;
        case 'Intersect': return <SquaresIntersect size={14} />;
        case 'Sketch': return <Square size={14} />;
        default: return <Layers size={14} />;
    }
}

export function TimelinePanel({
    items,
    selectedItemId,
    hiddenIds,
    onSelect,
    onToggleVisibility,
    onDelete,
}: TimelinePanelProps) {
    const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; item: HistoryItem } | null>(null);

    React.useEffect(() => {
        const dismiss = () => setContextMenu(null);
        window.addEventListener('click', dismiss);
        return () => window.removeEventListener('click', dismiss);
    }, []);

    return (
        <section
            data-testid="timeline-panel"
            className="h-[58px] shrink-0 border-t border-[#2b313c] bg-[#171b22] text-gray-300 flex items-stretch select-none"
        >
            <div className="w-[92px] shrink-0 border-r border-[#2b313c] px-3 py-2">
                <div className="text-[10px] uppercase font-semibold text-gray-500">Timeline</div>
                <div className="text-[11px] text-gray-400">{items.length === 1 ? '1 feature' : `${items.length} features`}</div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden px-2 py-2 flex items-center gap-1">
                {items.length === 0 ? (
                    <div className="text-[11px] text-gray-500 px-2">No operations yet.</div>
                ) : items.map((item) => {
                    const selected = selectedItemId === item.id;
                    const hidden = hiddenIds.includes(item.name);
                    return (
                        <button
                            key={item.id}
                            type="button"
                            aria-label={`${item.type} ${item.name}`}
                            title={`${item.type}: ${item.name} (line ${item.line})`}
                            onClick={() => onSelect(item)}
                            onContextMenu={(event) => {
                                event.preventDefault();
                                setContextMenu({ x: event.clientX, y: event.clientY, item });
                            }}
                            className={[
                                'h-10 min-w-[74px] max-w-[110px] px-2 rounded border flex items-center gap-2 text-left transition-colors',
                                selected ? 'border-blue-400 bg-blue-500/15 text-white' : 'border-[#3b4554] bg-[#242b36] hover:bg-[#2b3443]',
                                hidden ? 'opacity-45 line-through' : '',
                            ].join(' ')}
                        >
                            <span className="text-blue-300 shrink-0">{iconForType(item.type)}</span>
                            <span className="min-w-0">
                                <span className="block truncate text-[11px] font-mono">{item.name}</span>
                                <span className="block truncate text-[9px] text-gray-500">{item.detail ?? `L${item.line}`}</span>
                            </span>
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                        </button>
                    );
                })}
            </div>

            {contextMenu && (
                <div
                    className="fixed z-50 min-w-[140px] rounded border border-[#3b4554] bg-[#1a1f29] py-1 text-xs shadow-xl"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-200 hover:bg-blue-600"
                        onClick={() => {
                            onToggleVisibility(contextMenu.item.name);
                            setContextMenu(null);
                        }}
                    >
                        {hiddenIds.includes(contextMenu.item.name) ? <Eye size={13} /> : <EyeOff size={13} />}
                        Hide / Show
                    </button>
                    <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-200 hover:bg-red-600"
                        onClick={() => {
                            onDelete(contextMenu.item);
                            setContextMenu(null);
                        }}
                    >
                        <Trash2 size={13} />
                        Delete
                    </button>
                </div>
            )}
        </section>
    );
}
```

- [ ] **Step 4: Run the TimelinePanel test and verify it passes**

Run:

```bash
npm test -- src/components/Layout/TimelinePanel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout/TimelinePanel.tsx src/components/Layout/TimelinePanel.test.tsx
git commit -m "feat(ui): add studio timeline strip"
```

---

## Task 4: Retrofit Header Into Studio Control Row

**Files:**
- Modify: `src/components/Layout/Header.tsx`
- Modify: `src/components/Layout/Header.test.tsx`

- [ ] **Step 1: Update the failing Header tests**

Replace `src/components/Layout/Header.test.tsx` with:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { WorkbenchProvider } from '../../context/WorkbenchContext';
import * as geometryEngine from '../../lib/geometryEngine';

vi.mock('../../lib/geometryEngine', async () => {
    const actual = await vi.importActual('../../lib/geometryEngine');
    const mockInstance = {
        initialize: vi.fn().mockResolvedValue(true),
        executeCode: vi.fn().mockResolvedValue({ geometries: [], sketches: [] }),
    };
    return {
        ...actual,
        exportSTEP: vi.fn().mockResolvedValue(new Blob(['mock data'])),
        exportSTL: vi.fn().mockResolvedValue(new Blob(['mock data'])),
        init: vi.fn().mockResolvedValue(true),
        GeometryEngine: {
            getInstance: () => mockInstance
        }
    };
});

afterEach(() => {
    cleanup();
    window.localStorage.clear();
});

describe('Header', () => {
    it('renders project name and workspace tabs', () => {
        render(
            <WorkbenchProvider>
                <Header />
            </WorkbenchProvider>
        );

        expect(screen.getByText('Untitled Project')).toBeDefined();
        expect(screen.getByRole('tab', { name: 'DESIGN' })).toBeDefined();
        expect(screen.getByRole('tab', { name: 'SKETCH' })).toBeDefined();
    });

    it('switches studio layout modes', () => {
        render(
            <WorkbenchProvider>
                <Header />
            </WorkbenchProvider>
        );

        const viewportButton = screen.getByRole('button', { name: 'Viewport Layout' });
        fireEvent.click(viewportButton);
        expect(window.localStorage.getItem('kernelcad:layoutMode')).toBe('viewport');

        const codeButton = screen.getByRole('button', { name: 'Code Layout' });
        fireEvent.click(codeButton);
        expect(window.localStorage.getItem('kernelcad:layoutMode')).toBe('code');

        const splitButton = screen.getByRole('button', { name: 'Split Layout' });
        fireEvent.click(splitButton);
        expect(window.localStorage.getItem('kernelcad:layoutMode')).toBe('split');
    });

    it('triggers STEP export', () => {
        render(
            <WorkbenchProvider>
                <Header />
            </WorkbenchProvider>
        );

        fireEvent.click(screen.getByTitle('Export STEP'));
        expect(geometryEngine.exportSTEP).toHaveBeenCalled();
    });

    it('switches between shading modes', () => {
        render(
            <WorkbenchProvider>
                <Header />
            </WorkbenchProvider>
        );

        const shadedEdges = screen.getByTitle('Shaded with Edges');
        const wireframe = screen.getByTitle('Wireframe');
        const shaded = screen.getByTitle('Shaded');

        expect(shadedEdges.className).toContain('bg-blue-100');

        fireEvent.click(wireframe);
        expect(wireframe.className).toContain('bg-blue-100');

        fireEvent.click(shaded);
        expect(shaded.className).toContain('bg-blue-100');
    });
});
```

- [ ] **Step 2: Run the Header test and verify it fails**

Run:

```bash
npm test -- src/components/Layout/Header.test.tsx
```

Expected: FAIL because workspace tabs and layout controls are not implemented yet.

- [ ] **Step 3: Update `Header`**

Modify `src/components/Layout/Header.tsx`.

Update the lucide import:

```ts
import { useWorkbench } from '../../context/WorkbenchContext';
import { Loader2, Download, FileDown, Code, Monitor, Undo2, Redo2, Box, Grid as GridIcon, Circle, FolderOpen, Columns3, Search, PanelRightOpen } from 'lucide-react';
```

Update the `useWorkbench()` destructuring:

```ts
const {
    layoutMode, setLayoutMode,
    viewMode3D, setViewMode3D,
    isComputing, code, commandManager, setActiveDialog
} = useWorkbench();
```

Replace the component `return` with:

```tsx
return (
    <div className="h-10 bg-[#eceff3] border-b border-[#c9ced6] flex items-center px-3 justify-between select-none shrink-0 text-[#252a31]" data-testid="header">
        <div className="flex items-center gap-3 min-w-0">
            <button
                onClick={() => setActiveDialog('projectManager')}
                className="flex items-center gap-2 group hover:bg-white px-2 py-1 rounded transition-colors min-w-0"
            >
                <div className="w-2 h-2 rounded-full bg-blue-600 group-hover:animate-pulse" />
                <span className="text-sm font-semibold flex items-center gap-2 min-w-0">
                    <span className="truncate max-w-[220px]">{activeProject?.name || 'Untitled Project'}</span>
                    <FolderOpen size={13} className="text-gray-500 group-hover:text-blue-600" />
                </span>
            </button>

            <div role="tablist" aria-label="Workspace" className="flex h-10 items-end gap-1">
                {['DESIGN', 'SKETCH'].map((workspace) => (
                    <button
                        key={workspace}
                        role="tab"
                        aria-selected={workspace === 'DESIGN'}
                        className={`h-9 px-3 text-[12px] font-semibold border-b-2 ${workspace === 'DESIGN' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    >
                        {workspace}
                    </button>
                ))}
            </div>
        </div>

        <button
            type="button"
            className="hidden md:flex items-center gap-2 rounded border border-[#cbd1da] bg-white px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:border-blue-300"
            title="Design Shortcuts"
            aria-label="Design Shortcuts"
        >
            <Search size={14} />
            <span>Design Shortcuts</span>
            <span className="text-[10px] text-gray-400">S</span>
        </button>

        <div className="flex gap-2 items-center">
            <div className="flex bg-white rounded border border-[#cbd1da] p-0.5" data-testid="layout-toggle">
                <button
                    onClick={() => setLayoutMode('split')}
                    className={`p-1 rounded text-xs flex items-center gap-1 ${layoutMode === 'split' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}
                    title="Split Layout"
                    aria-label="Split Layout"
                >
                    <Columns3 size={14} />
                </button>
                <button
                    onClick={() => setLayoutMode('viewport')}
                    className={`p-1 rounded text-xs flex items-center gap-1 ${layoutMode === 'viewport' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}
                    title="Viewport Layout"
                    aria-label="Viewport Layout"
                >
                    <Monitor size={14} />
                </button>
                <button
                    onClick={() => setLayoutMode('code')}
                    className={`p-1 rounded text-xs flex items-center gap-1 ${layoutMode === 'code' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}
                    title="Code Layout"
                    aria-label="Code Layout"
                >
                    <Code size={14} />
                </button>
            </div>

            <div className="flex bg-white rounded border border-[#cbd1da] p-0.5" data-testid="view-3d-toggle">
                <button
                    onClick={() => setViewMode3D('shadedWithEdges')}
                    className={`p-1 rounded text-xs flex items-center gap-1 ${viewMode3D === 'shadedWithEdges' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}
                    title="Shaded with Edges"
                    aria-label="Shaded with Edges"
                >
                    <Box size={14} />
                </button>
                <button
                    onClick={() => setViewMode3D('wireframe')}
                    className={`p-1 rounded text-xs flex items-center gap-1 ${viewMode3D === 'wireframe' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}
                    title="Wireframe"
                    aria-label="Wireframe"
                >
                    <GridIcon size={14} />
                </button>
                <button
                    onClick={() => setViewMode3D('shaded')}
                    className={`p-1 rounded text-xs flex items-center gap-1 ${viewMode3D === 'shaded' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}
                    title="Shaded"
                    aria-label="Shaded"
                >
                    <Circle size={14} />
                </button>
            </div>

            <div className="h-6 w-px bg-[#c9ced6] mx-1" />

            <button
                onClick={() => commandManager.undo()}
                disabled={!commandManager.canUndo}
                className={`p-1 rounded transition-colors ${!commandManager.canUndo ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900 hover:bg-white'}`}
                aria-label="Undo"
                title={formatTooltip('Undo', SHORTCUT_HINTS.undo)}
            >
                <Undo2 className="w-4 h-4" />
            </button>
            <button
                onClick={() => commandManager.redo()}
                disabled={!commandManager.canRedo}
                className={`p-1 rounded transition-colors ${!commandManager.canRedo ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900 hover:bg-white'}`}
                aria-label="Redo"
                title={formatTooltip('Redo', SHORTCUT_HINTS.redo)}
            >
                <Redo2 className="w-4 h-4" />
            </button>

            <div className="h-6 w-px bg-[#c9ced6] mx-1" />

            <button
                onClick={() => handleExport('step')}
                disabled={isComputing}
                className="p-1 hover:bg-white rounded text-gray-600 hover:text-gray-900 transition-colors"
                title="Export STEP"
                aria-label="Export STEP"
            >
                <FileDown className="w-4 h-4" />
            </button>
            <button
                onClick={() => handleExport('stl')}
                disabled={isComputing}
                className="p-1 hover:bg-white rounded text-gray-600 hover:text-gray-900 transition-colors"
                title="Export STL"
                aria-label="Export STL"
            >
                <Download className="w-4 h-4" />
            </button>
            <PanelRightOpen size={14} className="hidden text-gray-400 lg:block" />
            {isComputing && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
        </div>
    </div>
);
```

- [ ] **Step 4: Remove unused `viewMode` imports and variables**

After the replacement, remove any unused `viewMode` or `setViewMode` destructuring left in `Header.tsx`.

- [ ] **Step 5: Run the Header test and verify it passes**

Run:

```bash
npm test -- src/components/Layout/Header.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Layout/Header.tsx src/components/Layout/Header.test.tsx
git commit -m "feat(ui): retrofit studio header controls"
```

---

## Task 5: Convert Toolbar To Horizontal Grouped Ribbon

**Files:**
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/components/Toolbar.test.tsx`

- [ ] **Step 1: Update the failing Toolbar tests**

Replace `src/components/Toolbar.test.tsx` with:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Toolbar from './Toolbar';
import { Box } from 'lucide-react';
import { type Feature } from '../features/types';
import * as WorkbenchContext from '../context/WorkbenchContext';
import { CommandManager } from '../commands/CommandManager';

beforeEach(() => {
    vi.spyOn(WorkbenchContext, 'useWorkbench').mockReturnValue({
        code: '',
        showSketches: true,
        toggleSketchVisibility: vi.fn(),
        toggleSidePanel: vi.fn(),
        sidePanelVisible: true,
        selectedFace: null,
        selectedFacePlane: null,
        setSketchMode: vi.fn(),
        openPanel: vi.fn(),
        codeContext: {
            code: '',
            declaredVariables: new Set(),
            returnedVariables: [],
            generateUniqueName: (base: string) => base,
            getVariableAtIndex: () => null,
        },
        commandManager: {} as unknown as CommandManager,
    } as unknown as WorkbenchContext.WorkbenchContextType);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const mockFeatures: Feature[] = [
    {
        id: 'box',
        label: 'Box',
        icon: Box,
        execute: vi.fn(),
        parameters: [{ name: 'w', label: 'W', type: 'number', defaultValue: 10 }]
    },
    {
        id: 'fillet',
        label: 'Fillet',
        icon: Box,
        execute: vi.fn()
    }
];

describe('Toolbar', () => {
    it('renders as horizontal studio ribbon with groups', () => {
        render(<Toolbar features={mockFeatures} onToolClick={vi.fn()} />);

        expect(screen.getByTestId('studio-ribbon')).toBeDefined();
        expect(screen.getByText('Create')).toBeDefined();
        expect(screen.getByText('Sketch')).toBeDefined();
        expect(screen.getByText('Modify')).toBeDefined();
    });

    it('renders feature buttons and calls onToolClick', () => {
        const onToolClick = vi.fn();
        render(<Toolbar features={mockFeatures} onToolClick={onToolClick} />);

        fireEvent.click(screen.getByRole('button', { name: 'Box' }));
        expect(onToolClick).toHaveBeenCalledWith(mockFeatures[0]);
    });

    it('opens plane selector from Sketch button when no face is selected', () => {
        const openPanel = vi.fn();
        vi.spyOn(WorkbenchContext, 'useWorkbench').mockReturnValue({
            selectedFace: null,
            selectedFacePlane: null,
            setSketchMode: vi.fn(),
            showSketches: true,
            toggleSketchVisibility: vi.fn(),
            toggleSidePanel: vi.fn(),
            sidePanelVisible: true,
            openPanel,
            codeContext: {
                code: 'return [];',
                declaredVariables: new Set(),
                returnedVariables: [],
                generateUniqueName: (base: string) => base,
                getVariableAtIndex: () => null,
            },
        } as unknown as WorkbenchContext.WorkbenchContextType);

        render(<Toolbar features={mockFeatures} onToolClick={vi.fn()} />);
        fireEvent.click(screen.getByLabelText('Sketch'));
        expect(openPanel).toHaveBeenCalledWith('planeSelector');
    });
});
```

- [ ] **Step 2: Run the Toolbar test and verify it fails**

Run:

```bash
npm test -- src/components/Toolbar.test.tsx
```

Expected: FAIL because `studio-ribbon` and horizontal groups do not exist.

- [ ] **Step 3: Add `RibbonGroup` helper and update the return layout**

Modify `src/components/Toolbar.tsx`.

Add this helper above `export default function Toolbar`:

```tsx
function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-1 border-r border-[#cbd1da] pr-3 last:border-r-0" data-testid={`ribbon-group-${label.toLowerCase()}`}>
            <div className="mr-1 text-[10px] font-semibold uppercase text-gray-500">{label}</div>
            {children}
        </div>
    );
}

function ribbonButtonClass(active = false) {
    return [
        'h-8 w-8 rounded border flex items-center justify-center transition-colors',
        active ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-[#cbd1da] bg-white text-gray-600 hover:text-gray-950 hover:border-blue-300',
    ].join(' ');
}
```

Replace the component `return` with:

```tsx
return (
    <div
        data-testid="studio-ribbon"
        className="h-11 shrink-0 bg-[#f4f6f8] border-b border-[#cbd1da] flex items-center gap-3 px-3 text-[#252a31] overflow-x-auto select-none"
    >
        <RibbonGroup label="Browser">
            <button
                onClick={toggleSidePanel}
                className={ribbonButtonClass(sidePanelVisible)}
                aria-label="Toggle Scene Browser"
                title={formatTooltip(sidePanelVisible ? 'Hide Scene Browser' : 'Show Scene Browser', undefined)}
            >
                <Layers size={18} />
            </button>
        </RibbonGroup>

        <RibbonGroup label="Sketch">
            <button
                onClick={handleSketchClick}
                data-testid="toolbar-sketch"
                className={ribbonButtonClass(Boolean(selectedFace))}
                aria-label="Sketch"
                title={formatTooltip(selectedFace ? 'Sketch on Face' : 'Sketch', SHORTCUT_HINTS.sketch)}
            >
                <PenTool size={18} />
            </button>
            <button
                onClick={toggleSketchVisibility}
                className={ribbonButtonClass(showSketches)}
                aria-label="Sketch Visibility"
                title={formatTooltip(showSketches ? 'Hide Sketches' : 'Show Sketches', undefined)}
            >
                {showSketches ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            {selectedFacePlane && (
                <button
                    onClick={() => {
                        const feature = features.find(f => f.id === 'extrudeFromFace');
                        if (feature) onToolClick(feature);
                    }}
                    data-testid="toolbar-extrude-face"
                    className={ribbonButtonClass(true)}
                    aria-label="Extrude Face"
                    title="Extrude Face"
                >
                    <ArrowUpFromLine size={18} />
                </button>
            )}
        </RibbonGroup>

        {creationTools.length > 0 && (
            <RibbonGroup label="Create">
                {creationTools.map(feature => (
                    <button
                        key={feature.id}
                        onClick={() => onToolClick(feature)}
                        className={ribbonButtonClass()}
                        aria-label={feature.label}
                        title={formatTooltip(feature.label, FEATURE_SHORTCUTS[feature.id], feature.description)}
                    >
                        <feature.icon size={18} />
                    </button>
                ))}
            </RibbonGroup>
        )}

        {modificationTools.length > 0 && (
            <RibbonGroup label="Modify">
                {modificationTools.map(feature => (
                    <button
                        key={feature.id}
                        onClick={() => onToolClick(feature)}
                        className={ribbonButtonClass()}
                        aria-label={feature.label}
                        title={formatTooltip(feature.label, FEATURE_SHORTCUTS[feature.id], feature.description)}
                    >
                        <feature.icon size={18} />
                    </button>
                ))}
            </RibbonGroup>
        )}

        {constructionTools.length > 0 && (
            <RibbonGroup label="Construct">
                {constructionTools.map(feature => (
                    <button
                        key={feature.id}
                        onClick={() => onToolClick(feature)}
                        className={ribbonButtonClass()}
                        aria-label={feature.label}
                        title={formatTooltip(feature.label, FEATURE_SHORTCUTS[feature.id], feature.description)}
                    >
                        <feature.icon size={18} />
                    </button>
                ))}
            </RibbonGroup>
        )}
    </div>
);
```

- [ ] **Step 4: Run the Toolbar test and verify it passes**

Run:

```bash
npm test -- src/components/Toolbar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Toolbar.tsx src/components/Toolbar.test.tsx
git commit -m "feat(ui): convert toolbar to studio ribbon"
```

---

## Task 6: Replace SidePanel AI Tabs With Browser-Only Panel

**Files:**
- Modify: `src/components/Layout/SidePanel.tsx`
- Modify: `src/components/Layout/SidePanel.test.tsx`

- [ ] **Step 1: Update the SidePanel test**

Replace `src/components/Layout/SidePanel.test.tsx` with:

```tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SidePanel } from './SidePanel';

const mockDeleteHistoryItem = vi.fn();
const mockSetSelectedItemId = vi.fn();
const mockSetHoveredItemId = vi.fn();
const mockSetLayoutMode = vi.fn();
const mockJumpToLine = vi.fn();

vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: () => ({
        code: `
const box = replicad.makeBox(1, 1, 1);
const sketch = new Sketcher('XY').lineTo([1, 1]).done();
`.trim(),
        setLayoutMode: mockSetLayoutMode,
        planes: [],
        togglePlaneVisibility: vi.fn(),
        selectedItemId: 'sketch',
        setSelectedItemId: mockSetSelectedItemId,
        hoveredItemId: 'sketch',
        setHoveredItemId: mockSetHoveredItemId,
        hiddenIds: [],
        toggleVisibility: vi.fn(),
        selectedItemIds: [],
        toggleSelection: vi.fn(),
        renameItem: vi.fn(),
        deleteHistoryItem: mockDeleteHistoryItem
    })
}));

vi.mock('../SceneBrowser', () => ({
    default: ({ items, onDelete, onSelect }: {
        items: Array<{ id: string; name: string; type: string; line: number }>;
        onDelete: (item: { id: string; name: string; type: string; line: number }) => void;
        onSelect: (item: { id: string; name: string; type: string; line: number }) => void;
    }) => (
        <div>
            <button data-testid="trigger-select" onClick={() => onSelect(items[0])}>Select</button>
            <button data-testid="trigger-delete" onClick={() => onDelete(items.find((i) => i.name === 'sketch') ?? items[0])}>Delete</button>
        </div>
    )
}));

describe('SidePanel', () => {
    it('renders browser without AI tabs', () => {
        render(<SidePanel onJumpToLine={mockJumpToLine} />);

        expect(screen.getByText('BROWSER')).toBeDefined();
        expect(screen.queryByText('AI ASSISTANT')).toBeNull();
    });

    it('selects an item and restores split layout for editor line jump', () => {
        const { getByTestId } = render(<SidePanel onJumpToLine={mockJumpToLine} />);
        getByTestId('trigger-select').click();

        expect(mockSetLayoutMode).toHaveBeenCalledWith('split');
        expect(mockJumpToLine).toHaveBeenCalled();
    });

    it('deletes the selected history item and does not clear legacy name-based selection state', () => {
        const { getByTestId } = render(<SidePanel onJumpToLine={mockJumpToLine} />);
        getByTestId('trigger-delete').click();

        expect(mockDeleteHistoryItem).toHaveBeenCalledTimes(1);
        expect(mockSetSelectedItemId).not.toHaveBeenCalled();
        expect(mockSetHoveredItemId).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run the SidePanel test and verify it fails**

Run:

```bash
npm test -- src/components/Layout/SidePanel.test.tsx
```

Expected: FAIL because SidePanel still renders tabs and uses `setViewMode`.

- [ ] **Step 3: Rewrite `SidePanel` as browser-only**

Modify `src/components/Layout/SidePanel.tsx`.

Remove these imports:

```ts
import { useState } from 'react';
import { AIAssistant } from '../../features/ai/AIAssistant';
```

Change the `useWorkbench()` destructuring from `setViewMode` to `setLayoutMode`:

```ts
const {
    code,
    setLayoutMode,
    planes,
    togglePlaneVisibility,
    selectedItemId,
    setSelectedItemId,
    hoveredItemId,
    setHoveredItemId,
    hiddenIds,
    toggleVisibility,
    selectedItemIds,
    toggleSelection,
    renameItem,
    deleteHistoryItem
} = useWorkbench();
```

Remove:

```ts
const [activeTab, setActiveTab] = useState<'scene' | 'ai'>('scene');
```

Replace the component `return` with:

```tsx
return (
    <div className="flex flex-col h-full bg-[#191d24] border-r border-[#2b313c]">
        <div className="h-8 shrink-0 border-b border-[#2b313c] px-3 flex items-center text-[10px] font-bold tracking-wider text-gray-400">
            BROWSER
        </div>

        <div className="flex-1 overflow-hidden relative">
            <SceneBrowser
                items={items}
                planes={planes}
                selectedItemId={selectedHistoryId}
                selectedItemIds={selectedHistoryIds}
                hoveredItemId={hoveredHistoryId}
                hiddenIds={hiddenIds}
                onSelect={(item: HistoryItem) => {
                    setLayoutMode('split');
                    setSelectedItemId(item.id);
                    onJumpToLine(item.line);
                }}
                onToggleSelection={toggleSelection}
                onHover={(id) => {
                    if (!id) {
                        setHoveredItemId(null);
                        return;
                    }
                    setHoveredItemId(id);
                }}
                onToggleVisibility={toggleVisibility}
                onTogglePlane={togglePlaneVisibility}
                onSelectPlane={(id) => setSelectedItemId(id)}
                onRename={renameItem}
                onDelete={(item) => {
                    deleteHistoryItem(item);
                    if (selectedHistoryId === item.id) {
                        setSelectedItemId(null);
                    }
                    if (hoveredHistoryId === item.id) {
                        setHoveredItemId(null);
                    }
                }}
            />
        </div>
    </div>
);
```

- [ ] **Step 4: Run the SidePanel test and verify it passes**

Run:

```bash
npm test -- src/components/Layout/SidePanel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout/SidePanel.tsx src/components/Layout/SidePanel.test.tsx
git commit -m "feat(ui): make side panel browser focused"
```

---

## Task 7: Compose Split Studio Shell

**Files:**
- Modify: `src/components/Layout/WorkbenchLayout.tsx`
- Test: `src/components/Layout/WorkbenchLayout.test.tsx`
- Modify: `tests/smoke.spec.ts`

- [ ] **Step 1: Write the failing WorkbenchLayout shell test**

Create `src/components/Layout/WorkbenchLayout.test.tsx`:

```tsx
/** @vitest-environment happy-dom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
    const editor = { setPosition: vi.fn(), revealLineInCenter: vi.fn(), focus: vi.fn() };
    return {
        editor,
        setEditorInstance: vi.fn(),
        setCode: vi.fn(),
        setLayoutMode: vi.fn(),
        setViewMode: vi.fn(),
        setSidePanelVisible: vi.fn(),
        setSelectedItemId: vi.fn(),
        setHoveredItemId: vi.fn(),
        setSelectedSketchName: vi.fn(),
        setActiveDialog: vi.fn(),
        setContextMenu: vi.fn(),
        openPanel: vi.fn(),
        closePanel: vi.fn(),
        toggleSketchVisibility: vi.fn(),
        commandManager: { undo: vi.fn(), redo: vi.fn(), canUndo: false, canRedo: false },
        workbench: {
            layoutMode: 'split',
            setLayoutMode: vi.fn(),
            viewMode: 'code',
            setViewMode: vi.fn(),
            viewMode3D: 'shadedWithEdges',
            setViewMode3D: vi.fn(),
            code: 'const box = replicad.makeBox(1, 1, 1);\nreturn box;',
            setCode: vi.fn(),
            mutateCode: vi.fn(),
            insertCode: vi.fn(),
            commandManager: { undo: vi.fn(), redo: vi.fn(), canUndo: false, canRedo: false },
            geometries: [],
            previewGeometries: [],
            sketchesGeometries: [],
            showSketches: true,
            error: null,
            isReady: true,
            isComputing: false,
            activeDialog: null,
            setActiveDialog: vi.fn(),
            editorInstance: editor,
            setEditorInstance: vi.fn(),
            sketchMode: { active: false, plane: null, currentSketch: null, tool: 'select' },
            setSketchMode: vi.fn(),
            addSketch: vi.fn(),
            selectedFace: null,
            selectedFacePlane: null,
            setSelectedFace: vi.fn(),
            isFaceSelecting: false,
            startFaceSelection: vi.fn(),
            cancelFaceSelection: vi.fn(),
            codeContext: {
                code: 'const box = replicad.makeBox(1, 1, 1);\nreturn box;',
                declaredVariables: new Set(['box']),
                returnedVariables: ['box'],
                generateUniqueName: (base: string) => base,
                getVariableAtIndex: () => 'box',
            },
            hideItem: vi.fn(),
            showAll: vi.fn(),
            selectedItemId: null,
            selectedItemIds: [],
            deleteItem: vi.fn(),
            deleteHistoryItem: vi.fn(),
            toggleVisibility: vi.fn(),
            openPanel: vi.fn(),
            closePanel: vi.fn(),
            selectedSketchName: null,
            setSelectedSketchName: vi.fn(),
            setSelectedItemId: vi.fn(),
            setHoveredItemId: vi.fn(),
            hoveredItemId: null,
            toggleSketchVisibility: vi.fn(),
            activePanels: [],
            sidePanelVisible: true,
            setSidePanelVisible: vi.fn(),
            clearAll: vi.fn(),
            executionCount: 0,
            currentCodeRevision: 0,
            lastSuccessfulRevision: 0,
            executionHistory: [],
            staleMainResponsesDropped: 0,
            stalePreviewResponsesDropped: 0,
            getMutationDiagnostics: vi.fn(() => ({ failures: 0 })),
            resetMutationDiagnostics: vi.fn(),
            planes: [],
            togglePlaneVisibility: vi.fn(),
            toggleSelection: vi.fn(),
            renameItem: vi.fn(),
            hiddenIds: [],
        },
    };
});

vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: () => mocks.workbench,
}));

vi.mock('../../context/UIContext', () => ({
    useUI: () => ({
        contextMenu: { visible: false, position: null, type: 'FACE' },
        setContextMenu: mocks.setContextMenu,
    }),
}));

vi.mock('../Editor', () => ({
    default: ({ onMount }: { onMount: (editor: unknown) => void }) => {
        onMount({ setPosition: vi.fn(), revealLineInCenter: vi.fn(), focus: vi.fn() });
        return <div data-testid="mock-editor">Editor</div>;
    }
}));

vi.mock('../Viewer', () => ({
    default: () => <div data-testid="mock-viewer">Viewer</div>
}));

vi.mock('../../features/ai/FloatingAgent', () => ({
    FloatingAgent: () => null
}));

vi.mock('../../features/ai/SmartWidget', () => ({
    SmartWidget: () => null
}));

import { WorkbenchLayout } from './WorkbenchLayout';

afterEach(() => {
    cleanup();
    window.localStorage.clear();
});

describe('WorkbenchLayout shell', () => {
    it('renders Split Studio surfaces by default', async () => {
        render(<WorkbenchLayout />);

        expect(await screen.findByTestId('workbench-ready')).toBeDefined();
        expect(screen.getByTestId('studio-ribbon')).toBeDefined();
        expect(screen.getByTestId('browser-region')).toBeDefined();
        expect(screen.getByTestId('viewport-region')).toBeDefined();
        expect(screen.getByTestId('editor-region')).toBeDefined();
        expect(screen.getByTestId('timeline-panel')).toBeDefined();
        expect(screen.getByTestId('status-bar')).toBeDefined();
    });
});
```

- [ ] **Step 2: Run the WorkbenchLayout test and verify it fails**

Run:

```bash
npm test -- src/components/Layout/WorkbenchLayout.test.tsx
```

Expected: FAIL because the shell still uses `NavigationPanel` and has no timeline/status.

- [ ] **Step 3: Update imports in `WorkbenchLayout`**

Modify `src/components/Layout/WorkbenchLayout.tsx`.

Remove the import:

```ts
import { NavigationPanel } from './NavigationPanel';
```

Add:

```ts
import Toolbar from '../Toolbar';
import { TimelinePanel } from './TimelinePanel';
import { StatusBar } from './StatusBar';
```

- [ ] **Step 4: Destructure layout mode and side panel visibility**

In the `useWorkbench()` destructuring inside `WorkbenchLayout`, add:

```ts
layoutMode,
setLayoutMode,
sidePanelVisible,
```

Keep `viewMode` and `setViewMode` for backward-compatible hotkeys during this task.

- [ ] **Step 5: Update error recovery to use Code layout**

Replace the recovery effect body with:

```ts
React.useEffect(() => {
    if (!error) return;
    setLayoutMode('code');
    setViewMode('code');
    setSidePanelVisible(true);
}, [error, setLayoutMode, setViewMode, setSidePanelVisible]);
```

- [ ] **Step 6: Update layout keyboard shortcuts**

In `useKeyboardShortcuts`, replace the `mod+1` and `mod+2` handlers with:

```ts
'mod+1': () => {
    setLayoutMode('split');
    setViewMode('code');
    setSidePanelVisible(true);
},
'mod+2': () => {
    setLayoutMode('viewport');
    setViewMode('gui');
},
'mod+3': () => {
    setLayoutMode('code');
    setViewMode('code');
}
```

- [ ] **Step 7: Replace the main shell JSX**

Inside the final `return`, replace only the block from `<Header />` through the closing `</div>` that currently wraps `NavigationPanel`, `ViewerPanel`, `FloatingAgent`, and `SmartWidget` with:

```tsx
<Header />
<Toolbar
    features={features}
    onToolClick={handleToolClick}
/>

<div
    data-testid="studio-main"
    className={[
        'flex-1 min-h-0 overflow-hidden grid bg-[#111827]',
        layoutMode === 'split' ? 'grid-cols-[minmax(220px,260px)_minmax(360px,1fr)_minmax(360px,40vw)]' : '',
        layoutMode === 'viewport' ? 'grid-cols-[minmax(220px,260px)_1fr]' : '',
        layoutMode === 'code' ? 'grid-cols-1' : '',
    ].join(' ')}
>
    {layoutMode !== 'code' && sidePanelVisible && (
        <aside data-testid="browser-region" className="min-w-0 min-h-0 overflow-hidden">
            <SidePanel onJumpToLine={handleJumpToLine} />
        </aside>
    )}

    {layoutMode !== 'code' && (
        <main data-testid="viewport-region" className="min-w-0 min-h-0 overflow-hidden">
            <ViewerPanel
                geometries={geometries}
                previewGeometries={previewGeometries}
                sketchesGeometries={sketchesGeometries}
                showSketches={showSketches}
                viewMode3D={viewMode3D}
                isFaceSelecting={isFaceSelecting}
                onCancelFaceSelection={cancelFaceSelection}
            />
        </main>
    )}

    {layoutMode !== 'viewport' && (
        <section data-testid="editor-region" className="min-w-0 min-h-0 border-l border-[#2b313c] bg-[#101318]">
            <EditorPanel
                code={code}
                onChange={(v) => setCode(v)}
                onMount={(inst) => setEditorInstance(inst)}
                error={error}
                visible={true}
            />
        </section>
    )}

    <FloatingAgent />
    <SmartWidget />
</div>

<TimelinePanel
    items={historyItems}
    selectedItemId={selectedItemId}
    hiddenIds={hiddenIds}
    onSelect={(item) => {
        setLayoutMode('split');
        setSelectedItemId(item.id);
        handleJumpToLine(item.line);
    }}
    onToggleVisibility={toggleVisibility}
    onDelete={(item) => {
        deleteHistoryItem(item);
        if (selectedItemId === item.id) {
            setSelectedItemId(null);
        }
    }}
/>

<StatusBar
    isComputing={isComputing}
    error={error}
    geometryCount={geometries.length}
    selectedCount={selectedItemIds.length || (selectedItemId ? 1 : 0)}
    viewMode3D={viewMode3D}
    layoutMode={layoutMode}
    activeCommandLabel={activePanels[activePanels.length - 1] ?? activeDialog}
/>
```

- [ ] **Step 8: Ensure `WorkbenchLayout` imports `SidePanel`**

The shell now uses `SidePanel` directly. Add this import if it is not present:

```ts
import { SidePanel } from './SidePanel';
```

- [ ] **Step 9: Run the shell test and fix import/type errors**

Run:

```bash
npm test -- src/components/Layout/WorkbenchLayout.test.tsx
```

Expected after import cleanup: PASS.

- [ ] **Step 10: Update Playwright smoke expectations**

Modify `tests/smoke.spec.ts`.

In `workbench loads`, after the Monaco assertion, add:

```ts
await expect(page.getByTestId('studio-ribbon')).toBeVisible();
await expect(page.getByTestId('browser-region')).toBeVisible();
await expect(page.getByTestId('viewport-region')).toBeVisible();
await expect(page.getByTestId('editor-region')).toBeVisible();
await expect(page.getByTestId('timeline-panel')).toBeVisible();
await expect(page.getByTestId('status-bar')).toBeVisible();
```

- [ ] **Step 11: Run the focused component tests**

Run:

```bash
npm test -- src/components/Layout/WorkbenchLayout.test.tsx src/components/Layout/StatusBar.test.tsx src/components/Layout/TimelinePanel.test.tsx
```

Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add src/components/Layout/WorkbenchLayout.tsx src/components/Layout/WorkbenchLayout.test.tsx tests/smoke.spec.ts
git commit -m "feat(ui): compose split studio shell"
```

---

## Task 8: Anchor Floating Panels To Viewport Top-Right

**Files:**
- Modify: `src/components/Shared/FloatingPanel.tsx`
- Modify: `src/config/panels.tsx`
- Test: `src/components/Shared/FloatingPanel.test.tsx`

- [ ] **Step 1: Write the failing FloatingPanel test**

Create `src/components/Shared/FloatingPanel.test.tsx`:

```tsx
/** @vitest-environment happy-dom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloatingPanel } from './FloatingPanel';

afterEach(() => cleanup());

describe('FloatingPanel', () => {
    it('uses viewport-biased default position when no initial position is provided', () => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });

        render(
            <FloatingPanel id="extrude" title="Extrude" onClose={vi.fn()}>
                <div>Panel content</div>
            </FloatingPanel>
        );

        const dialog = screen.getByRole('dialog', { name: 'Extrude' });
        expect(dialog.getAttribute('style')).toContain('top: 96px');
        expect(dialog.getAttribute('style')).toContain('left: 900px');
    });
});
```

- [ ] **Step 2: Run the FloatingPanel test and verify it fails**

Run:

```bash
npm test -- src/components/Shared/FloatingPanel.test.tsx
```

Expected: FAIL because the component defaults to `{ x: 100, y: 100 }`.

- [ ] **Step 3: Update `FloatingPanel` default position logic**

Modify `src/components/Shared/FloatingPanel.tsx`.

Change the prop type:

```ts
initialPosition?: { x: number; y: number };
```

Add this helper above the component:

```ts
function defaultPanelPosition() {
    if (typeof window === 'undefined') return { x: 900, y: 96 };
    return {
        x: Math.max(320, window.innerWidth - 380),
        y: 96,
    };
}
```

Change the function signature:

```tsx
export function FloatingPanel({ id, title, children, onClose, initialPosition }: FloatingPanelProps) {
```

Add this inside the component before `return`:

```ts
const position = initialPosition ?? defaultPanelPosition();
```

Update the `style` block:

```tsx
style={{
    position: 'fixed',
    top: position.y,
    left: position.x,
    zIndex: 40,
}}
```

- [ ] **Step 4: Normalize panel configs**

Modify `src/config/panels.tsx`: remove all `initialPosition` properties from the `PANELS` entries except `planeSelector`.

Keep `planeSelector` at:

```ts
initialPosition: { x: 300, y: 150 }
```

This preserves plane selection as a centered-ish chooser while feature command panels use the viewport-biased default.

- [ ] **Step 5: Run the FloatingPanel test and verify it passes**

Run:

```bash
npm test -- src/components/Shared/FloatingPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Shared/FloatingPanel.tsx src/components/Shared/FloatingPanel.test.tsx src/config/panels.tsx
git commit -m "feat(ui): anchor command panels near viewport"
```

---

## Task 9: Run Focused UI Quality Checks

**Files:**
- No planned source edits unless checks reveal a regression.

- [ ] **Step 1: Run focused unit/component tests**

Run:

```bash
npm test -- src/context/UIContext.test.tsx src/components/Layout/Header.test.tsx src/components/Toolbar.test.tsx src/components/Layout/SidePanel.test.tsx src/components/Layout/StatusBar.test.tsx src/components/Layout/TimelinePanel.test.tsx src/components/Layout/WorkbenchLayout.test.tsx src/components/Shared/FloatingPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Start the dev server**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL such as `http://127.0.0.1:5173/`.

- [ ] **Step 5: Run the smoke Playwright test**

In a second shell with the dev server still running, run:

```bash
npm run test:e2e -- tests/smoke.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Capture desktop screenshot for visual inspection**

Run:

```bash
npx playwright screenshot http://127.0.0.1:5173/ /tmp/kernelcad-studio-desktop.png --wait-for-selector=canvas
```

Expected: screenshot shows header, ribbon, browser, viewport, Monaco editor, timeline, and status bar with no overlapping text.

- [ ] **Step 7: Capture narrow screenshot for visual inspection**

Run:

```bash
npx playwright screenshot http://127.0.0.1:5173/ /tmp/kernelcad-studio-narrow.png --wait-for-selector=canvas --viewport-size=1200,800
```

Expected: screenshot remains usable; controls are visible and the ribbon does not overlap text.

- [ ] **Step 8: Commit any final test-only fixes**

If a focused check required small fixes, commit them:

```bash
git add src tests
git commit -m "fix(ui): stabilize studio shell tests"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review Checklist

Spec coverage:

- Split Studio default: Task 7.
- Hybrid header/ribbon: Tasks 4 and 5.
- Browser-focused left panel: Task 6.
- Monaco visible by default: Task 7.
- Timeline strip: Task 3 and Task 7.
- Status bar: Task 2 and Task 7.
- Command panel anchoring: Task 8.
- No Zustand migration: Task 1 uses existing Context.
- No core/kernel rewrite: all tasks touch UI/context shell only.
- Tests and screenshots: Task 9.

No planned task depends on unfinished stable naming, rollback editing, dependency reorder, or a new command architecture.
