// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const { saveProjectMock } = vi.hoisted(() => ({ saveProjectMock: vi.fn() }));
vi.mock('../funnel/lib/apiClient', () => ({ saveProject: saveProjectMock }));
vi.mock('../funnel/hooks/useSession', () => ({
  useOptionalSession: () => ({ session: { access_token: 't' } }),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

import { usePublishAction } from './usePublishAction';
import { clearGenerationAssets, rememberGenerationAssets } from '../funnel/lib/generationAssets';

beforeEach(() => {
  saveProjectMock.mockReset();
  saveProjectMock.mockResolvedValue({ slug: 's1', projectId: 'p1' });
});
afterEach(() => clearGenerationAssets());

describe('usePublishAction', () => {
  it('names the generation holding an imported attached file, so the save copies it', async () => {
    rememberGenerationAssets('gen-1', ['inputs/cccccccccccc.stl']);
    const code = "return await lib.fromSTL('./inputs/cccccccccccc.stl');";
    const { result } = renderHook(() => usePublishAction(code, 'Stand'));
    await act(async () => {
      await result.current.handlePublish();
    });
    expect(saveProjectMock).toHaveBeenCalledWith(expect.objectContaining({ code, assetGenerationIds: ['gen-1'] }));
  });

  it('sends no generation ids for code without generation files', async () => {
    const { result } = renderHook(() => usePublishAction('return box(1,1,1);', 'Box'));
    await act(async () => {
      await result.current.handlePublish();
    });
    expect(saveProjectMock.mock.calls[0]![0]).not.toHaveProperty('assetGenerationIds');
  });
});
