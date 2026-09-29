// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { StudioQuickStart } from './StudioQuickStart';
const mocks = vi.hoisted(() => ({ createProject: vi.fn(), saveActiveProject: vi.fn() }));
vi.mock('../context/ProjectContext', () => ({ useProject: () => mocks }));
vi.mock('../context/WorkbenchContext', () => ({ useWorkbench: () => ({ code: 'return box(10, 20, 30);' }) }));
vi.mock('../context/StudioChromeContext', () => ({ useStudioChrome: () => ({ viewerMode: false }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); history.replaceState(null, '', '/'); });
it('saves current edits and opens a separate editable starter project', () => {
  render(<StudioQuickStart />);
  fireEvent.click(screen.getByRole('button', { name: 'Quick start' }));
  fireEvent.click(screen.getByRole('button', { name: 'Bracket', exact: true }));
  expect(mocks.saveActiveProject).toHaveBeenCalledWith({ code: 'return box(10, 20, 30);' });
  expect(mocks.createProject).toHaveBeenCalledWith('Bracket', expect.stringContaining("param('width', 60"));
  expect(mocks.saveActiveProject.mock.invocationCallOrder[0]).toBeLessThan(mocks.createProject.mock.invocationCallOrder[0]);
});
it('does not offer to replace a deep-linked source', () => {
  history.replaceState(null, '', '/?script=example.kcad.ts');
  render(<StudioQuickStart />);
  expect(screen.queryByRole('button', { name: 'Quick start' })).toBeNull();
});
