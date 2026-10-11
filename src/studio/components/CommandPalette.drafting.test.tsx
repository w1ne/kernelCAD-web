// SPDX-License-Identifier: MIT
// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import type { Command } from '../hooks/useCommandRegistry';
import { StudioCommandPalette } from './CommandPalette';
import { exportViaServer } from '../exportViaServer';

const captured = vi.hoisted(() => ({ commands: [] as Command[] }));
vi.mock('../hooks/useCommandRegistry', () => ({ useRegisterCommands: (commands: Command[]) => { captured.commands = commands; }, useCommandRegistry: () => ({ commands: [] }) }));
vi.mock('../context/WorkbenchContext', () => ({ useWorkbench: () => ({ code: 'model', geometries: [{ faces: [] }], viewMode3D: 'shaded', selectedItemIds: [] }) }));
vi.mock('../context/UIContext', () => ({ useUI: () => ({ viewportBackground: 'dark', gridVisible: true }) }));
vi.mock('../context/ProjectContext', async (original) => ({ ...await original<typeof import('../context/ProjectContext')>(), useProject: () => ({ activeProjectId: '__funnel_ephemeral__', activeProject: { name: 'Hosted part', code: 'model' }, projects: [] }) }));
vi.mock('../context/StudioChromeContext', () => ({ useStudioChrome: () => ({ viewerMode: false }) }));
vi.mock('../hooks/useRecomputeResult', () => ({ useRecomputeResult: () => ({ geometries: [{ faces: [] }], features: [] }) }));
vi.mock('../hooks/useKeyboardShortcuts', () => ({ useKeyboardShortcuts: () => {} }));
vi.mock('../hooks/useIsNarrow', () => ({ COMPACT_HEADER_QUERY: '(max-width: 1000px)', useIsNarrow: () => false }));
vi.mock('../../funnel/hooks/useSession', () => ({ useOptionalSession: () => ({ session: null }) }));
vi.mock('../exportViaServer', async (original) => ({ ...await original<typeof import('../exportViaServer')>(), exportViaServer: vi.fn(async () => ({ blob: new Blob(['PDF']), downloadName: 'drawing.pdf' })), downloadBlob: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, 'location', { configurable: true, value: { pathname: '/p/hosted-part', search: '?version=7', hostname: 'localhost' } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('forwards browser-restored hosted drafting preferences through the palette PDF action', async () => {
  localStorage.setItem('kernelcad.drafting.project:hosted-part@7', JSON.stringify({ sourceFingerprint: 'model', draftingProfile: 'machining', dimensioningStyle: 'chain', annotationOverrides: { hole: { offset: 4 } } }));
  render(<StudioCommandPalette />);
  await act(async () => { captured.commands.find((c) => c.id === 'export.pdf-drawing')!.action(); });
  await waitFor(() => expect(exportViaServer).toHaveBeenCalledWith('pdf-drawing', 'model', expect.objectContaining({ drawingOptions: { draftingProfile: 'machining', autoAnnotate: { dimensioningStyle: 'chain' }, annotationOverrides: { hole: { offset: 4 } } } })));
});
