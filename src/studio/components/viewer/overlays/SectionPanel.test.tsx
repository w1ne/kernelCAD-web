// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { shellStore } from '../../../store/shellStore';
import { SectionPanel } from './SectionPanel';

vi.mock('../../../hooks/useRecomputeResult', () => ({
  useRecomputeResult: () => ({
    geometries: [
      { faces: [], assemblyPartName: 'housing' },
      { faces: [], assemblyPartName: 'servo_left' },
    ],
  }),
}));

vi.mock('../../../context/WorkbenchContext', () => ({
  useWorkbench: () => ({ codeContext: null }),
}));

describe('SectionPanel unified axis rows', () => {
  beforeEach(() => shellStore.reset());
  afterEach(() => cleanup());

  it('default: plane preset active, only the z row enabled', () => {
    render(<SectionPanel visible={true} />);
    expect(screen.getByTestId('section-preset-plane').getAttribute('aria-pressed')).toBe('true');
    expect((screen.getByTestId('section-axis-on-z') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId('section-axis-on-x') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId('section-offset-x') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('section-offset-z') as HTMLInputElement).disabled).toBe(false);
  });

  it('octant preset enables all three axes', () => {
    render(<SectionPanel visible={true} />);
    fireEvent.click(screen.getByTestId('section-preset-octant'));
    expect(shellStore.getSnapshot().sectionAxesEnabled).toEqual({ x: true, y: true, z: true });
    for (const a of ['x', 'y', 'z'] as const) {
      expect((screen.getByTestId(`section-offset-${a}`) as HTMLInputElement).disabled).toBe(false);
      expect((screen.getByTestId(`section-side-${a}`) as HTMLButtonElement).disabled).toBe(false);
    }
  });

  it('quarter preset enables x+y; the z row stays visible but disabled', () => {
    render(<SectionPanel visible={true} />);
    fireEvent.click(screen.getByTestId('section-preset-quarter'));
    expect(shellStore.getSnapshot().sectionAxesEnabled).toEqual({ x: true, y: true, z: false });
    expect((screen.getByTestId('section-offset-z') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('section-side-z') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('section-axis-on-z')).toBeTruthy(); // row still present
  });

  it('axis checkboxes drive any in-between combination (no preset active)', () => {
    render(<SectionPanel visible={true} />);
    fireEvent.click(screen.getByTestId('section-axis-on-x')); // x on (z already on)
    expect(shellStore.getSnapshot().sectionAxesEnabled).toEqual({ x: true, y: false, z: true });
    for (const id of ['plane', 'quarter', 'octant']) {
      expect(screen.getByTestId(`section-preset-${id}`).getAttribute('aria-pressed')).toBe('false');
    }
  });

  it('side toggle flips which side is removed', () => {
    render(<SectionPanel visible={true} />);
    fireEvent.click(screen.getByTestId('section-side-z'));
    expect(shellStore.getSnapshot().sectionSides.z).toBe(false);
  });

  it('disabling every axis shows the nothing-is-cut hint', () => {
    render(<SectionPanel visible={true} />);
    fireEvent.click(screen.getByTestId('section-axis-on-z'));
    expect(shellStore.getSnapshot().sectionAxesEnabled).toEqual({ x: false, y: false, z: false });
    expect(screen.getByText(/No axis enabled/)).toBeTruthy();
  });

  it('keep-whole checkboxes toggle the store set and show the all-excluded hint', () => {
    render(<SectionPanel visible={true} />);
    fireEvent.click(screen.getByTestId('section-keep-whole-housing'));
    expect(shellStore.getSnapshot().sectionKeepWhole.has('housing')).toBe(true);
    fireEvent.click(screen.getByTestId('section-keep-whole-servo_left'));
    expect(screen.getByText(/All parts excluded/)).toBeTruthy();
  });

  it('renders inside a draggable floating panel; close exits section mode', () => {
    shellStore.setSectionMode(true);
    render(<SectionPanel visible={true} />);
    expect(screen.getByTestId('panel-section')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Close panel'));
    expect(shellStore.getSnapshot().sectionMode).toBe(false);
  });
});
