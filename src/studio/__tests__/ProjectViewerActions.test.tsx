// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ProjectRow } from '../../funnel/lib/apiClient';

import { ProjectViewerActions } from '../../studio/routes/-ProjectViewerActions';

function makeProject(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: 'p-1',
    slug: 'demo',
    title: 'Demo',
    privacy: 'public_unlisted',
    current_code: '',
    parameters: {},
    version: 1,
    updated_at: '2026-06-13T00:00:00Z',
    owner_id: null,
    ...overrides,
  } as ProjectRow;
}

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => cleanup());

describe('ProjectViewerActions', () => {
  it('writes the public /p/<slug> URL to the clipboard when Share is clicked', async () => {
    render(<ProjectViewerActions slug="demo" project={makeProject()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/p/demo`);
    await waitFor(() => expect(screen.getByText('Link copied')).toBeTruthy());
  });

  it('disables Share for private projects with a make-public hint', () => {
    render(<ProjectViewerActions slug="demo" project={makeProject({ privacy: 'private' })} />);
    const share = screen.getByRole('button', { name: 'Share' }) as HTMLButtonElement;
    expect(share.disabled).toBe(true);
    expect(share.title).toBe('Make this project public to share a link');
  });
});
