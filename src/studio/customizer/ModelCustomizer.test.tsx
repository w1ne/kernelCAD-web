// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SerializedParamEntry } from '../../shared/runtime/paramTable';
import { customizerParamsFrom, type CustomizerParam } from './customizerParams';
import { ModelCustomizer, type ModelCustomizerProps } from './ModelCustomizer';
import { ServerExportError } from '../exportViaServer';

const params: CustomizerParam[] = customizerParamsFrom([
  { name: 'Width', type: 'number', value: 40, defaultValue: 40, meta: { min: 10, max: 80 } },
  { name: 'HasLid', type: 'boolean', value: true, defaultValue: true },
  { name: 'Screw', type: 'choice', value: 'M4', defaultValue: 'M4', meta: { choices: ['M3', 'M4', 'M5'] } },
  { name: 'Label', type: 'string', value: 'KCAD', defaultValue: 'KCAD', meta: { maxLength: 8 } },
] satisfies SerializedParamEntry[], [{ name: 'Width', unit: 'mm' }]);

const DEFAULTS = { Width: 40, HasLid: true, Screw: 'M4', Label: 'KCAD' };

function setup(overrides: Partial<ModelCustomizerProps> = {}) {
  const execute = vi.fn<ModelCustomizerProps['execute']>().mockResolvedValue(undefined);
  const exportModel = vi.fn<ModelCustomizerProps['exportModel']>().mockResolvedValue(new Blob(['solid']));
  const saveFile = vi.fn<NonNullable<ModelCustomizerProps['saveFile']>>();
  render(
    <ModelCustomizer
      slug="enclosure"
      params={params}
      busy={false}
      execute={execute}
      exportModel={exportModel}
      saveFile={saveFile}
      debounceMs={300}
      {...overrides}
    />,
  );
  return { execute, exportModel, saveFile };
}

beforeEach(() => {
  window.history.replaceState(null, '', '/p/enclosure');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ModelCustomizer controls', () => {
  it('renders one control per declared type with the saved defaults', () => {
    setup();
    expect(screen.getByTestId('scrub-slider-Width')).toBeTruthy();
    expect((screen.getByTestId('scrub-input-Width') as HTMLInputElement).value).toBe('40');
    expect(screen.getByText('mm')).toBeTruthy();
    expect((screen.getByTestId('customizer-toggle-HasLid') as HTMLInputElement).checked).toBe(true);
    const select = screen.getByTestId('customizer-select-Screw') as HTMLSelectElement;
    expect(select.value).toBe('M4');
    expect([...select.options].map((o) => o.value)).toEqual(['M3', 'M4', 'M5']);
    expect((screen.getByTestId('customizer-text-Label') as HTMLInputElement).value).toBe('KCAD');
  });

  it('renders nothing for a model without parameters', () => {
    const { execute } = setup({ params: [] });
    expect(screen.queryByTestId('model-customizer')).toBeNull();
    expect(execute).not.toHaveBeenCalled();
  });

  it('collapses and expands', () => {
    setup({ defaultCollapsed: true });
    expect(screen.queryByTestId('customizer-toggle-HasLid')).toBeNull();
    fireEvent.click(screen.getByTestId('customizer-toggle-panel'));
    expect(screen.getByTestId('customizer-toggle-HasLid')).toBeTruthy();
  });
});

describe('ModelCustomizer re-execution', () => {
  it('re-runs once, after the debounce, with all current values', () => {
    vi.useFakeTimers();
    const { execute } = setup();
    expect(execute).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('customizer-toggle-HasLid'));
    fireEvent.change(screen.getByTestId('customizer-select-Screw'), { target: { value: 'M5' } });
    expect(screen.getByTestId('customizer-busy')).toBeTruthy();
    expect(execute).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(300); });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenLastCalledWith({ ...DEFAULTS, HasLid: false, Screw: 'M5' });
    expect(window.location.search).toBe('?p.HasLid=false&p.Screw=M5');
  });

  it('runs a typed number at once on Enter', () => {
    const { execute } = setup();
    const input = screen.getByTestId('scrub-input-Width');
    fireEvent.change(input, { target: { value: '55' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(execute).toHaveBeenLastCalledWith({ ...DEFAULTS, Width: 55 });
  });

  it('does not send text that breaks its declaration', () => {
    vi.useFakeTimers();
    const { execute } = setup();
    fireEvent.change(screen.getByTestId('customizer-text-Label'), { target: { value: 'WAY TOO LONG' } });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(execute).not.toHaveBeenCalled();
  });

  it('Reset returns to the saved defaults and clears the URL', () => {
    window.history.replaceState(null, '', '/p/enclosure?p.Width=60');
    const { execute } = setup();
    fireEvent.click(screen.getByTestId('customizer-reset'));
    expect(execute).toHaveBeenLastCalledWith(DEFAULTS);
    expect((screen.getByTestId('scrub-input-Width') as HTMLInputElement).value).toBe('40');
    expect(window.location.search).toBe('');
  });

  it('keeps showing a short error from a failed build', async () => {
    const execute = vi.fn<ModelCustomizerProps['execute']>().mockRejectedValue(new Error('boom\nstack line'));
    setup({ execute });
    await act(async () => { fireEvent.click(screen.getByTestId('customizer-reset')); });
    expect(screen.getByTestId('customizer-error').textContent).toBe('boom');
  });

  it('shows the viewer build error', () => {
    setup({ error: 'Build failed: fillet too large' });
    expect(screen.getByTestId('customizer-error').textContent).toBe('Build failed: fillet too large');
  });
});

describe('ModelCustomizer shared links', () => {
  it('applies valid link values on load, runs them, and reports ignored ones', () => {
    window.history.replaceState(null, '', '/p/enclosure?version=2&p.Width=60&p.Screw=M9&p.Ghost=1');
    const { execute } = setup();
    expect((screen.getByTestId('scrub-input-Width') as HTMLInputElement).value).toBe('60');
    expect((screen.getByTestId('customizer-select-Screw') as HTMLSelectElement).value).toBe('M4');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({ ...DEFAULTS, Width: 60 });
    expect(screen.getByTestId('customizer-notice').textContent)
      .toBe('Ignored link values: Screw=M9: not one of the options; Ghost: no such parameter');
    // The URL keeps other keys and drops the ignored values.
    expect(window.location.search).toBe('?version=2&p.Width=60');
  });

  it('does not re-run on load for a link without values', () => {
    const { execute } = setup();
    expect(execute).not.toHaveBeenCalled();
  });
});

describe('ModelCustomizer downloads', () => {
  it('exports the current values in the chosen format and names the file after them', async () => {
    window.history.replaceState(null, '', '/p/enclosure?p.Width=60&p.HasLid=false');
    const { exportModel, saveFile } = setup();
    for (const format of ['stl', '3mf', 'step'] as const) {
      fireEvent.click(screen.getByTestId('customizer-download'));
      await act(async () => { fireEvent.click(screen.getByTestId(`customizer-download-${format}`)); });
      expect(exportModel).toHaveBeenLastCalledWith(
        format, { ...DEFAULTS, Width: 60, HasLid: false }, expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(saveFile).toHaveBeenLastCalledWith(expect.any(Blob), `enclosure-Width60_HasLidfalse.${format}`);
    }
  });

  it('reports a failed export', async () => {
    const exportModel = vi.fn<ModelCustomizerProps['exportModel']>().mockRejectedValue(new Error('server down'));
    const { saveFile } = setup({ exportModel });
    fireEvent.click(screen.getByTestId('customizer-download'));
    await act(async () => { fireEvent.click(screen.getByTestId('customizer-download-step')); });
    expect(saveFile).not.toHaveBeenCalled();
    expect(screen.getByTestId('customizer-error').textContent).toBe('Export failed: server down');
  });

  it('shows the server hint under a failed export', async () => {
    const exportModel = vi.fn<ModelCustomizerProps['exportModel']>().mockRejectedValue(
      new ServerExportError('The STL mesh has too many open edges to print reliably.', {
        status: 422, code: 'export.mesh.not-watertight', hint: 'Export STEP.',
      }),
    );
    setup({ exportModel });
    fireEvent.click(screen.getByTestId('customizer-download'));
    await act(async () => { fireEvent.click(screen.getByTestId('customizer-download-stl')); });
    expect(screen.getByTestId('customizer-error').textContent)
      .toBe('Export failed: The STL mesh has too many open edges to print reliably.');
    expect(screen.getByTestId('customizer-error-hint').textContent).toBe('Export STEP.');
  });

  it('saves a file that shipped with a warning and shows the warning as a notice', async () => {
    const exportModel = vi.fn<ModelCustomizerProps['exportModel']>().mockResolvedValue({
      blob: new Blob(['solid']),
      warning: { code: 'export.3mf.not-watertight', message: 'The 3MF has a small mesh gap.' },
    });
    const { saveFile } = setup({ exportModel });
    fireEvent.click(screen.getByTestId('customizer-download'));
    await act(async () => { fireEvent.click(screen.getByTestId('customizer-download-3mf')); });
    expect(saveFile).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('customizer-notice').textContent).toBe('The 3MF has a small mesh gap.');
  });

  it('shows export progress and cancels it', async () => {
    let signal: AbortSignal | undefined;
    const exportModel = vi.fn<ModelCustomizerProps['exportModel']>((_f, _v, options) => {
      signal = options?.signal;
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    });
    const { saveFile } = setup({ exportModel });
    fireEvent.click(screen.getByTestId('customizer-download'));
    await act(async () => { fireEvent.click(screen.getByTestId('customizer-download-step')); });
    expect(screen.getByTestId('customizer-download-progress').textContent).toBe('Exporting STEP… 0 s');
    await act(async () => { fireEvent.click(screen.getByTestId('customizer-download-cancel')); });
    expect(signal?.aborted).toBe(true);
    expect(saveFile).not.toHaveBeenCalled();
    expect(screen.getByTestId('customizer-download')).toBeDefined();
    expect(screen.queryByTestId('customizer-error')).toBeNull();
  });
});
