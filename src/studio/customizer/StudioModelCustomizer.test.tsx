// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { SerializedParamEntry } from '../../shared/runtime/paramTable';

const state = vi.hoisted(() => ({
  code: '',
  scriptParams: [] as SerializedParamEntry[],
  updateParam: vi.fn(),
  exportViaServer: vi.fn(),
}));

vi.mock('../context/CodeContext', () => ({ useCode: () => ({ code: state.code }) }));
vi.mock('../context/GeometryContext', () => ({
  useGeometry: () => ({
    scriptParams: state.scriptParams,
    isComputing: false,
    error: null,
    updateParam: state.updateParam,
  }),
}));
vi.mock('../exportViaServer', () => ({
  exportViaServer: state.exportViaServer,
  downloadBlob: vi.fn(),
}));

import { StudioModelCustomizer } from './StudioModelCustomizer';
import { defaultDownloadFormat } from './customizerParams';

const CODE = [
  "const w = param('Width', 40, { min: 10, max: 80 });",
  "const lid = param('HasLid', true);",
  "return box(w.value, 10, 10);",
].join('\n');

const DECLARED: SerializedParamEntry[] = [
  { name: 'Width', type: 'number', value: 40, defaultValue: 40, meta: { min: 10, max: 80 } },
  { name: 'HasLid', type: 'boolean', value: true, defaultValue: true },
];

beforeEach(() => {
  window.history.replaceState(null, '', '/p/box');
  state.code = CODE;
  state.scriptParams = DECLARED;
  state.updateParam.mockReset().mockResolvedValue(undefined);
  state.exportViaServer.mockReset().mockResolvedValue({ blob: new Blob(['x']), downloadName: 'ignored.stl' });
});

afterEach(() => cleanup());

describe('StudioModelCustomizer', () => {
  it('shows no panel before the model declares parameters', () => {
    state.scriptParams = [];
    render(<StudioModelCustomizer slug="box" />);
    expect(screen.queryByTestId('model-customizer')).toBeNull();
  });

  it('re-runs through the geometry updater with the values baked into the source', () => {
    render(<StudioModelCustomizer slug="box" />);
    const input = within(screen.getByTestId('customizer-number-Width')).getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '70' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // Only params that left their default are sent; the untouched boolean is not.
    expect(state.updateParam).toHaveBeenLastCalledWith([{ name: 'Width', value: 70 }], { bakeIntoSource: true });

    // Back to default: still sent, to undo the earlier edit.
    fireEvent.click(screen.getByTestId('customizer-reset'));
    expect(state.updateParam).toHaveBeenLastCalledWith([{ name: 'Width', value: 40 }], { bakeIntoSource: true });
  });

  it('keeps the declared defaults when later builds echo the customized values', () => {
    const { rerender } = render(<StudioModelCustomizer slug="box" />);
    state.scriptParams = [{ ...DECLARED[0], value: 70, defaultValue: 70 }, DECLARED[1]];
    rerender(<StudioModelCustomizer slug="box" />);
    fireEvent.click(screen.getByTestId('customizer-reset'));
    expect((within(screen.getByTestId('customizer-number-Width')).getByRole('spinbutton') as HTMLInputElement).value).toBe('40');
  });

  it('exports the configured source and never the untouched params', async () => {
    window.history.replaceState(null, '', '/p/box?p.Width=25');
    render(<StudioModelCustomizer slug="box" />);
    fireEvent.click(screen.getByTestId('customizer-download'));
    await act(async () => { fireEvent.click(screen.getByTestId('customizer-download-step')); });
    expect(state.exportViaServer).toHaveBeenCalledTimes(1);
    const [format, source] = state.exportViaServer.mock.calls[0];
    expect(format).toBe('step');
    expect(source).toBe(CODE.replace("param('Width', 40,", "param('Width', 25,"));
  });
});

describe('defaultDownloadFormat', () => {
  it('is STEP for an assembly of several parts and STL otherwise', () => {
    expect(defaultDownloadFormat([])).toBe('stl');
    expect(defaultDownloadFormat([{}, {}, {}])).toBe('stl');
    expect(defaultDownloadFormat([{ assemblyPartName: 'base' }, { assemblyPartName: 'base' }])).toBe('stl');
    expect(defaultDownloadFormat([{ assemblyPartName: 'base' }, { assemblyPartName: 'arm' }])).toBe('step');
  });
});
