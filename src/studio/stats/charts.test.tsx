// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ColumnChart, LineChart } from './charts';
import { niceMax } from './derive';

afterEach(() => cleanup());

const days = ['2026-09-27', '2026-09-28', '2026-09-29'];

describe('niceMax', () => {
  it('rounds up to 1 / 2 / 2.5 / 5 × 10^n', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(21)).toBe(25);
    expect(niceMax(334)).toBe(500);
  });
});

describe('ColumnChart', () => {
  it('shows every series for the hovered day, a legend for two series, and a table', () => {
    render(<ColumnChart days={days} label="Runs" series={[
      { key: 'a', label: 'Done', color: 'red', values: [1, 2, 3] },
      { key: 'b', label: 'Failed', color: 'blue', values: [0, 1, 0] },
    ]} />);
    expect(screen.getByLabelText('Legend')).toBeDefined();
    fireEvent.mouseEnter(screen.getAllByTestId('column-hit')[1]!);
    const tip = screen.getByRole('status');
    expect(tip.textContent).toContain('2026-09-28');
    expect(tip.textContent).toContain('2Done');
    expect(tip.textContent).toContain('1Failed');
    expect(screen.getByText('Table')).toBeDefined();
  });

  it('has no legend for one series and moves the readout with arrow keys', () => {
    render(<ColumnChart days={days} label="Sign-ups" series={[{ key: 'a', label: 'Sign-ups', color: 'red', values: [4, 5, 6] }]} />);
    expect(screen.queryByLabelText('Legend')).toBeNull();
    const svg = screen.getByRole('img', { name: 'Sign-ups' });
    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    expect(screen.getByRole('status').textContent).toContain('2026-09-27');
    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    expect(screen.getByRole('status').textContent).toContain('5');
  });

  it('renders an empty state for an all-zero window', () => {
    render(<ColumnChart days={days} label="x" series={[{ key: 'a', label: 'A', color: 'red', values: [0, 0, 0] }]} />);
    expect(screen.getByTestId('chart-empty')).toBeDefined();
  });
});

describe('LineChart', () => {
  it('labels the last value of each series and empties on zeros', () => {
    render(<LineChart days={days} label="Calls" series={[{ key: 'c', label: 'Calls', color: 'red', values: [10, 20, 17] }]} />);
    expect(screen.getByRole('img', { name: 'Calls' }).textContent).toContain('17');
    cleanup();
    render(<LineChart days={days} label="Calls" series={[{ key: 'c', label: 'Calls', color: 'red', values: [0, 0, 0] }]} />);
    expect(screen.getByTestId('chart-empty')).toBeDefined();
  });
});
