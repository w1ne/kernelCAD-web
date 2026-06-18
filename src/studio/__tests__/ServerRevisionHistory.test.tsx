// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const listProjectRevisions = vi.fn();
const restoreProjectRevision = vi.fn();
const fetchProjectBySlug = vi.fn();

vi.mock('../../funnel/lib/apiClient', () => ({
  listProjectRevisions: (...args: unknown[]) => listProjectRevisions(...args),
  restoreProjectRevision: (...args: unknown[]) => restoreProjectRevision(...args),
  fetchProjectBySlug: (...args: unknown[]) => fetchProjectBySlug(...args),
}));

import { ServerRevisionHistory } from '../../studio/routes/-ServerRevisionHistory';

const TWO_REVS = [
  { version: 3, created_at: '2026-06-15T12:00:00Z' },
  { version: 2, created_at: '2026-06-14T12:00:00Z' },
];

beforeEach(() => {
  listProjectRevisions.mockReset();
  restoreProjectRevision.mockReset();
  fetchProjectBySlug.mockReset();
});

afterEach(() => cleanup());

describe('ServerRevisionHistory', () => {
  it('renders the history button and lists revisions newest-first when opened', async () => {
    listProjectRevisions.mockResolvedValue(TWO_REVS);

    render(<ServerRevisionHistory slug="demo" onRestored={vi.fn()} />);

    const button = await screen.findByTestId('server-history-button');
    fireEvent.click(button);

    await waitFor(() => expect(screen.getByTestId('server-history-dropdown')).toBeTruthy());
    expect(screen.getByText('v3')).toBeTruthy();
    expect(screen.getByText('v2')).toBeTruthy();
    // Newest-first: v3 appears before v2 in the DOM.
    const dropdown = screen.getByTestId('server-history-dropdown');
    expect(dropdown.textContent!.indexOf('v3')).toBeLessThan(dropdown.textContent!.indexOf('v2'));
  });

  it('hides the whole control when fewer than two revisions exist', async () => {
    listProjectRevisions.mockResolvedValue([{ version: 1, created_at: '2026-06-14T12:00:00Z' }]);

    const { container } = render(<ServerRevisionHistory slug="demo" onRestored={vi.fn()} />);

    await waitFor(() => expect(listProjectRevisions).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector('[data-testid="server-history-button"]')).toBeNull());
  });

  it('restores a revision: calls the API, refreshes, and pushes restored code to onRestored', async () => {
    listProjectRevisions.mockResolvedValue(TWO_REVS);
    restoreProjectRevision.mockResolvedValue({ version: 2 });
    fetchProjectBySlug.mockResolvedValue({ current_code: 'cube(2)' });
    const onRestored = vi.fn();

    render(<ServerRevisionHistory slug="demo" onRestored={onRestored} />);

    fireEvent.click(await screen.findByTestId('server-history-button'));
    await screen.findByTestId('server-history-dropdown');

    fireEvent.click(screen.getByRole('button', { name: 'Restore revision v2' }));

    await waitFor(() => expect(restoreProjectRevision).toHaveBeenCalledWith('demo', 2));
    await waitFor(() => expect(fetchProjectBySlug).toHaveBeenCalledWith('demo'));
    await waitFor(() => expect(onRestored).toHaveBeenCalledWith('cube(2)'));
  });
});
