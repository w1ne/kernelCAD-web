// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { MassProperties } from '../../kernel/properties/massProperties';
import type { MassBody, MassTarget } from '../../kinematic/massReadout';
import { MassPropertiesPanel } from './MassPropertiesPanel';

const TENSOR: MassProperties = {
  mass: 2,
  com: [4, -5, 6.5],
  inertia6: [1, 0.1, 0.2, 2, 0.3, 3],
  inertiaMatrix: [
    [1, 0.1, 0.2],
    [0.1, 2, 0.3],
    [0.2, 0.3, 3],
  ],
  principalMoments: [1.5, 2.5, 3.5],
  principalAxes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  hasSymmetryAxis: false,
  hasSymmetryPoint: false,
};

function body(): MassBody {
  return {
    volume: () => 1000,
    massProperties: () => TENSOR,
  };
}

function renderPanel(ids: readonly string[], resolve: (id: string) => MassTarget | undefined): void {
  render(<MassPropertiesPanel selectedIds={ids} resolve={resolve} />);
}

afterEach(cleanup);

describe('MassPropertiesPanel', () => {
  it('shows an empty state with no numbers when nothing is selected', () => {
    renderPanel([], () => undefined);
    expect(screen.getByTestId('mass-properties-empty').textContent).toMatch(/Select one solid or part/);
    expect(screen.queryByTestId('mass-properties-panel')).toBeNull();
    expect(document.body.textContent).not.toMatch(/0 kg|solids/);
  });

  it('shows an empty state for a multi-selection and for a non-solid', () => {
    renderPanel(['a', 'b'], () => ({ kind: 'other' }));
    expect(screen.getByTestId('mass-properties-empty').textContent).toMatch(/single/i);
    cleanup();
    renderPanel(['sketch'], () => ({ kind: 'other' }));
    expect(screen.getByTestId('mass-properties-empty').textContent).toMatch(/one solid or one assembly part/);
    expect(document.body.textContent).not.toMatch(/0 kg/);
  });

  it('shows mass, center of mass, principal moments, and volume for one solid', () => {
    renderPanel(['bracket'], () => ({ kind: 'solid', label: 'bracket', body: body(), density: 7850 }));
    const panel = screen.getByTestId('mass-properties-panel');
    expect(panel.textContent).toContain('bracket');
    expect(panel.textContent).toContain('2 kg');
    expect(panel.textContent).toContain('7850 kg/m³ · raw');
    expect(panel.textContent).toContain('4, -5, 6.5 mm');
    expect(panel.textContent).toContain('1.5, 2.5, 3.5 kg·m²');
    expect(panel.textContent).toContain('1000 mm³');
    expect(screen.queryByTestId('mass-properties-water-default')).toBeNull();
    const tensor = screen.getByTestId('mass-properties-tensor');
    expect(tensor.tagName).toBe('DETAILS');
    expect(tensor.hasAttribute('open')).toBe(false);
    expect(tensor.textContent).toContain('1, 0.1, 0.2, 2, 0.3, 3');
  });

  it('flags a water default so it cannot be read as a chosen density', () => {
    renderPanel(['block'], () => ({ kind: 'solid', label: 'block', body: body() }));
    const flag = screen.getByTestId('mass-properties-water-default');
    expect(flag.textContent).toMatch(/1000/);
    expect(flag.textContent).toMatch(/water/i);
    expect(screen.getByTestId('mass-properties-density').getAttribute('data-flag')).toBe('water-default');
  });

  it('shows one assembly part and keeps a declared mass off the water banner', () => {
    renderPanel(['servo'], () => ({
      kind: 'assemblyPart',
      part: { name: 'servo', massKg: 4 },
      body: body(),
    }));
    expect(screen.getByTestId('mass-properties-panel').textContent).toContain('4 kg (declared)');
    expect(screen.getByTestId('mass-properties-density').getAttribute('data-flag')).toBe('water-default');
    expect(screen.queryByTestId('mass-properties-water-default')).toBeNull();
    expect(screen.getByTestId('mass-properties-panel').textContent).toContain('3, 5, 7 kg·m²');
  });
});
