// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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

function numberInput(name: string): HTMLInputElement {
  return within(screen.getByTestId(`customizer-number-${name}`)).getByRole('spinbutton') as HTMLInputElement;
}

function slider(name: string): HTMLInputElement {
  return within(screen.getByTestId(`customizer-slider-${name}`)).getByRole('slider') as HTMLInputElement;
}

function radio(testId: string): HTMLInputElement {
  return screen.getByTestId(testId) as HTMLInputElement;
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
    expect(slider('Width').value).toBe('40');
    expect(numberInput('Width').value).toBe('40');
    expect(screen.getByText('mm')).toBeTruthy();
    expect((screen.getByTestId('customizer-toggle-HasLid') as HTMLInputElement).checked).toBe(true);
    const group = screen.getByTestId('customizer-select-Screw');
    expect(within(group).getAllByRole('radio').map((o) => (o as HTMLInputElement).value)).toEqual(['M3', 'M4', 'M5']);
    expect(radio('customizer-option-Screw-M4').checked).toBe(true);
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

describe('ModelCustomizer v2 layout', () => {
  const many = customizerParamsFrom([
    { name: 'plateW', type: 'number', value: 50, defaultValue: 50 },
    { name: 'plateD', type: 'number', value: 50, defaultValue: 50 },
    { name: 'boreDia', type: 'number', value: 30.2, defaultValue: 30.2 },
    { name: 'ringH', type: 'number', value: 20, defaultValue: 20 },
    { name: 'wallT', type: 'number', value: 3, defaultValue: 3 },
    { name: 'm4HeadDia', type: 'number', value: 7.2, defaultValue: 7.2, meta: { group: 'Fasteners' } },
    { name: 'm4Clear', type: 'number', value: 4.5, defaultValue: 4.5, meta: { group: 'Fasteners', label: 'M4 clearance hole' } },
    { name: 'slotAngle', type: 'number', value: 0, defaultValue: 0 },
    { name: 'finish', type: 'choice', value: 'print', defaultValue: 'print', meta: { choices: ['print', 'cnc', 'cast', 'sheet', 'mold'] } },
  ] satisfies SerializedParamEntry[]);

  it('labels rows in words with units, and shows the key params first', () => {
    setup({ params: many });
    expect(screen.getByText('Plate width')).toBeTruthy();
    expect(screen.getByText('M4 head diameter')).toBeTruthy();
    expect(screen.queryByText('plateW')).toBeNull();
    expect(screen.getByRole('slider', { name: 'Bore diameter' }).getAttribute('aria-valuetext')).toBe('30.2 mm');
    expect(screen.getByRole('group', { name: 'Fasteners' })).toBeTruthy();
    // Six of nine rows; the rest behind "Show all".
    expect(screen.queryByTestId('customizer-row-m4Clear')).toBeNull();
    expect(screen.queryByTestId('customizer-row-finish')).toBeNull();
    fireEvent.click(screen.getByTestId('customizer-show-all'));
    expect(screen.getByText('M4 clearance hole')).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Slot angle' }).getAttribute('aria-valuetext')).toBe('0 °');
    // A long choice list is a menu, not a segmented control.
    expect((screen.getByTestId('customizer-select-finish') as HTMLSelectElement).tagName).toBe('SELECT');
    expect(screen.getByTestId('customizer-show-all').textContent).toBe('Show fewer');
  });

  it('keeps a shared value visible in the short view', () => {
    window.history.replaceState(null, '', '/p/enclosure?p.slotAngle=30');
    setup({ params: many });
    expect(screen.getByRole('slider', { name: 'Slot angle' })).toBeTruthy();
    expect(screen.getByTestId('customizer-show-all').textContent).toBe('Show all 9');
  });

  it('offers the default format as the primary download', () => {
    setup({ defaultFormat: 'step' });
    expect(screen.getByTestId('customizer-download-step').textContent).toBe('Download STEP');
    expect(screen.getByTestId('customizer-download-stl').textContent).toBe('STL');
  });

  it('floats dark over the 3D view, or fills a side panel in the host theme', () => {
    setup();
    const overlay = screen.getByTestId('model-customizer');
    expect(overlay.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByTestId('customizer-toggle-panel')).toBeTruthy();
    cleanup();
    setup({ layout: 'panel', defaultCollapsed: true });
    const panel = screen.getByTestId('model-customizer');
    expect(panel.getAttribute('data-theme')).toBeNull();
    // A panel never collapses: it has no toggle and always shows its rows.
    expect(screen.queryByTestId('customizer-toggle-panel')).toBeNull();
    expect(screen.getByTestId('customizer-row-Width')).toBeTruthy();
  });
});

describe('ModelCustomizer re-execution', () => {
  it('re-runs once, after the debounce, with all current values', () => {
    vi.useFakeTimers();
    const { execute } = setup();
    expect(execute).not.toHaveBeenCalled();
    fireEvent.change(slider('Width'), { target: { value: '50' } });
    fireEvent.change(slider('Width'), { target: { value: '55' } });
    expect(screen.getByTestId('customizer-busy')).toBeTruthy();
    expect(screen.getByTestId('customizer-progress')).toBeTruthy();
    expect(execute).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(300); });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenLastCalledWith({ ...DEFAULTS, Width: 55 });
    expect(window.location.search).toBe('?p.Width=55');
  });

  it('runs a switch or an option at once', () => {
    const { execute } = setup();
    fireEvent.click(screen.getByTestId('customizer-toggle-HasLid'));
    expect(execute).toHaveBeenLastCalledWith({ ...DEFAULTS, HasLid: false });
    fireEvent.click(screen.getByTestId('customizer-option-Screw-M5'));
    expect(execute).toHaveBeenLastCalledWith({ ...DEFAULTS, HasLid: false, Screw: 'M5' });
    expect(window.location.search).toBe('?p.HasLid=false&p.Screw=M5');
  });

  it('runs a typed number at once on Enter', () => {
    const { execute } = setup();
    const input = numberInput('Width');
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
    expect(numberInput('Width').value).toBe('40');
    expect(window.location.search).toBe('');
    expect((screen.getByTestId('customizer-reset') as HTMLButtonElement).disabled).toBe(true);
  });

  it('resets one value and leaves the others', () => {
    window.history.replaceState(null, '', '/p/enclosure?p.Width=60&p.HasLid=false');
    const { execute } = setup();
    expect(screen.queryByTestId('customizer-reset-Screw')).toBeNull();
    fireEvent.click(screen.getByTestId('customizer-reset-Width'));
    expect(execute).toHaveBeenLastCalledWith({ ...DEFAULTS, HasLid: false });
    expect(numberInput('Width').value).toBe('40');
    expect(screen.queryByTestId('customizer-reset-Width')).toBeNull();
    expect(window.location.search).toBe('?p.HasLid=false');
  });

  it('keeps showing a short error from a failed build', async () => {
    const execute = vi.fn<ModelCustomizerProps['execute']>().mockRejectedValue(new Error('boom\nstack line'));
    setup({ execute });
    await act(async () => { fireEvent.click(screen.getByTestId('customizer-toggle-HasLid')); });
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
    expect(numberInput('Width').value).toBe('60');
    expect(radio('customizer-option-Screw-M4').checked).toBe(true);
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
