// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { StudioEmptyState } from './StudioEmptyState';
import { globalCommandRegistry } from '../hooks/useCommandRegistry';

const mocks = vi.hoisted(() => ({
  createProject: vi.fn(),
  saveActiveProject: vi.fn(),
  openProject: vi.fn(),
  agent: false,
  projects: [] as { id: string; name: string; lastUpdated: string }[],
}));
vi.mock('../context/ProjectContext', () => ({
  useProject: () => ({ ...mocks, activeProjectId: 'current' }),
}));
vi.mock('../context/WorkbenchContext', () => ({ useWorkbench: () => ({ code: 'return [];' }) }));
vi.mock('../agentAvailability', () => ({ inAppAgentEnabled: () => mocks.agent }));
vi.mock('../../funnel/lib/supabaseClient', () => ({ isAuthConfigured: () => true }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.agent = false;
  mocks.projects = [];
});

it('saves current edits and opens a starter as a new editable project', () => {
  render(<StudioEmptyState enableAgent enableConnect />);
  fireEvent.click(screen.getByTestId('empty-starter-bracket'));
  expect(mocks.saveActiveProject).toHaveBeenCalledWith({ code: 'return [];' });
  expect(mocks.createProject).toHaveBeenCalledWith('Bracket', expect.stringContaining("param('width', 60"));
  expect(mocks.saveActiveProject.mock.invocationCallOrder[0]).toBeLessThan(mocks.createProject.mock.invocationCallOrder[0]);
});

it('shows every starter with its size', () => {
  render(<StudioEmptyState enableAgent enableConnect />);
  const starters = screen.getByRole('region', { name: 'Start from a starter' });
  expect(within(starters).getAllByRole('button')).toHaveLength(3);
  expect(screen.getByTestId('empty-starter-box').textContent).toContain('80 × 55 × 35 mm');
});

it('links to /connect only where the host allows it', () => {
  render(<StudioEmptyState enableAgent enableConnect />);
  expect(screen.getByTestId('empty-connect').getAttribute('href')).toBe('/connect');
  cleanup();
  render(<StudioEmptyState enableAgent enableConnect={false} />);
  expect(screen.queryByTestId('empty-connect')).toBeNull();
});

it('offers the agent only where the hosted agent runs, and opens it through the palette command', () => {
  render(<StudioEmptyState enableAgent enableConnect />);
  expect(screen.queryByTestId('empty-describe')).toBeNull();
  cleanup();

  mocks.agent = true;
  const action = vi.fn();
  const unregister = globalCommandRegistry.register({ id: 'panels.left.agent', label: 'Open the agent', section: 'Panels', action });
  render(<StudioEmptyState enableAgent enableConnect />);
  fireEvent.click(screen.getByTestId('empty-describe'));
  expect(action).toHaveBeenCalledTimes(1);
  unregister();
  cleanup();

  render(<StudioEmptyState enableAgent={false} enableConnect />);
  expect(screen.queryByTestId('empty-describe')).toBeNull();
});

it('lists the three most recent other projects and opens one', () => {
  mocks.projects = [
    { id: 'current', name: 'This one', lastUpdated: '2026-09-29T10:00:00Z' },
    { id: 'a', name: 'Old', lastUpdated: '2026-09-01T10:00:00Z' },
    { id: 'b', name: 'Pipe clamp', lastUpdated: '2026-09-28T10:00:00Z' },
    { id: 'c', name: 'Hinge', lastUpdated: '2026-09-20T10:00:00Z' },
    { id: 'd', name: 'Gear', lastUpdated: '2026-09-25T10:00:00Z' },
  ];
  render(<StudioEmptyState enableAgent enableConnect />);
  const recent = screen.getByRole('region', { name: 'Your recent projects' });
  const buttons = within(recent).getAllByRole('button');
  expect(buttons.map((b) => b.querySelector('.truncate')?.textContent)).toEqual(['Pipe clamp', 'Gear', 'Hinge']);
  fireEvent.click(within(recent).getByRole('button', { name: /Pipe clamp/ }));
  expect(mocks.openProject).toHaveBeenCalledWith('b');
});

it('hides the recent list when there is nothing else to open', () => {
  render(<StudioEmptyState enableAgent enableConnect />);
  expect(screen.queryByRole('region', { name: 'Your recent projects' })).toBeNull();
});
