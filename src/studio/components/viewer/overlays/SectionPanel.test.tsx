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

describe('SectionPanel cutaway controls', () => {
  beforeEach(() => shellStore.reset());
  afterEach(() => cleanup());

  it('plane mode keeps the original controls', () => {
    render(<SectionPanel visible={true} />);
    expect(screen.getByTestId('section-axis-x')).toBeTruthy();
    expect(screen.getByTestId('section-flip')).toBeTruthy();
    expect(screen.getByTestId('section-position')).toBeTruthy();
  });

  it('octant shows a side toggle and offset slider per axis', () => {
    render(<SectionPanel visible={true} />);
    fireEvent.click(screen.getByTestId('section-shape-octant'));
    expect(shellStore.getSnapshot().sectionShape).toBe('octant');
    for (const a of ['x', 'y', 'z'] as const) {
      expect(screen.getByTestId(`section-side-${a}`)).toBeTruthy();
      expect(screen.getByTestId(`section-offset-${a}`)).toBeTruthy();
    }
    expect(screen.queryByTestId('section-flip')).toBeNull(); // plane controls gone
  });

  it('quarter hides the uncut axis row and offers the Around selector', () => {
    render(<SectionPanel visible={true} />);
    fireEvent.click(screen.getByTestId('section-shape-quarter'));
    // default quarter axis 'z' → x and y rows only
    expect(screen.getByTestId('section-offset-x')).toBeTruthy();
    expect(screen.getByTestId('section-offset-y')).toBeTruthy();
    expect(screen.queryByTestId('section-offset-z')).toBeNull();
    fireEvent.click(screen.getByTestId('section-around-x'));
    expect(shellStore.getSnapshot().sectionQuarterAxis).toBe('x');
    expect(screen.queryByTestId('section-offset-x')).toBeNull();
    expect(screen.getByTestId('section-offset-z')).toBeTruthy();
  });

  it('side toggle flips which side is removed', () => {
    render(<SectionPanel visible={true} />);
    fireEvent.click(screen.getByTestId('section-shape-octant'));
    fireEvent.click(screen.getByTestId('section-side-y'));
    expect(shellStore.getSnapshot().sectionSides.y).toBe(false);
  });

  it('keep-whole checkboxes toggle the store set and show the all-excluded hint', () => {
    render(<SectionPanel visible={true} />);
    fireEvent.click(screen.getByTestId('section-keep-whole-housing'));
    expect(shellStore.getSnapshot().sectionKeepWhole.has('housing')).toBe(true);
    fireEvent.click(screen.getByTestId('section-keep-whole-servo_left'));
    expect(screen.getByText(/All parts excluded/)).toBeTruthy();
  });
});
