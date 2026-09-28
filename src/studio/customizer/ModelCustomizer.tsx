// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * ModelCustomizer — the public-page parameter panel. One control per declared
 * `param()`, a Reset button, and a download menu that exports the CURRENT
 * configuration. It holds no Studio state of its own: the caller supplies the
 * declarations, how to re-run the model (`execute`) and how to export it
 * (`exportModel`). Nothing here writes to the project.
 */
import { useState, type JSX } from 'react';
import { NumericScrubInput } from '../components/inputs/NumericScrubInput';
import { downloadBlob, type ExportViaServerOptions } from '../exportViaServer';
import { exportProgressText, useExportTask, type ExportedFile } from '../hooks/useExportTask';
import type { ParamValue } from '../../shared/runtime/paramTable';
import {
  CUSTOMIZER_FORMATS,
  checkParamValue,
  downloadFileName,
  type CustomizerFormat,
  type CustomizerParam,
  type CustomizerValues,
} from './customizerParams';
import { useCustomizerValues } from './useCustomizerValues';

export interface ModelCustomizerProps {
  slug: string;
  params: readonly CustomizerParam[];
  /** The model is re-building. */
  busy: boolean;
  /** Last build error from the viewer, if any. */
  error?: string | null;
  execute: (values: CustomizerValues) => Promise<void>;
  /** Exports the configuration. `options` carries the cancel signal and
   *  progress callback of `exportViaServer`. A result with a `warning` shows
   *  it as a notice after the download. */
  exportModel: (
    format: CustomizerFormat,
    values: CustomizerValues,
    options?: ExportViaServerOptions,
  ) => Promise<Blob | Pick<ExportedFile, 'blob' | 'warning'>>;
  /** Hands the exported file to the browser. Defaults to a download link. */
  saveFile?: (blob: Blob, fileName: string) => void;
  defaultCollapsed?: boolean;
  debounceMs?: number;
  className?: string;
}

const MAX_ERROR_LENGTH = 160;

function shortError(message: string): string {
  const firstLine = message.split('\n')[0] ?? message;
  return firstLine.length > MAX_ERROR_LENGTH ? `${firstLine.slice(0, MAX_ERROR_LENGTH - 1)}…` : firstLine;
}

const FORMAT_LABELS: Record<CustomizerFormat, string> = { stl: 'STL', '3mf': '3MF', step: 'STEP' };

function ControlLabel({ param }: { param: CustomizerParam }): JSX.Element {
  return (
    <span className="flex-1 truncate text-gray-300" title={param.description ?? param.name}>
      {param.name}
    </span>
  );
}

function TextControl(props: {
  param: CustomizerParam;
  value: string;
  onChange: (value: ParamValue) => void;
  onCommit: () => void;
}): JSX.Element {
  const { param, value, onChange, onCommit } = props;
  const [draft, setDraft] = useState(value);
  // Follow outside changes (Reset) without dropping an invalid draft mid-typing.
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(value);
  }
  const valid = checkParamValue(param, draft).ok;
  return (
    <input
      type="text"
      value={draft}
      maxLength={param.maxLength}
      onChange={(e) => {
        setDraft(e.target.value);
        if (checkParamValue(param, e.target.value).ok) onChange(e.target.value);
      }}
      onBlur={onCommit}
      onKeyDown={(e) => { if (e.key === 'Enter') onCommit(); }}
      aria-label={`${param.name} value`}
      aria-invalid={!valid || undefined}
      data-testid={`customizer-text-${param.name}`}
      className="w-28 rounded border border-[#333] bg-[#1f1f1f] px-1.5 py-0.5 text-xs text-gray-100"
    />
  );
}

function ParamControl(props: {
  param: CustomizerParam;
  value: ParamValue;
  onChange: (value: ParamValue) => void;
  onCommit: () => void;
}): JSX.Element {
  const { param, value, onChange, onCommit } = props;
  if (param.type === 'number') {
    return (
      <div data-testid={`customizer-row-${param.name}`} title={param.description}>
        <NumericScrubInput
          name={param.name}
          value={value as number}
          min={param.min}
          max={param.max}
          step={param.step}
          unit={param.unit}
          onChange={onChange}
          onCommit={onCommit}
        />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 px-3 py-1.5" data-testid={`customizer-row-${param.name}`}>
      <ControlLabel param={param} />
      {param.type === 'boolean' && (
        <input
          type="checkbox"
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={`${param.name} value`}
          data-testid={`customizer-toggle-${param.name}`}
        />
      )}
      {param.type === 'choice' && (
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${param.name} value`}
          data-testid={`customizer-select-${param.name}`}
          className="rounded border border-[#333] bg-[#1f1f1f] px-1 py-0.5 text-xs text-gray-100"
        >
          {(param.choices ?? []).map((choice) => <option key={choice} value={choice}>{choice}</option>)}
        </select>
      )}
      {param.type === 'string' && (
        <TextControl param={param} value={value as string} onChange={onChange} onCommit={onCommit} />
      )}
    </div>
  );
}

function DownloadMenu(props: {
  onDownload: (format: CustomizerFormat) => void;
  /** Progress text of the running export, or null when idle. */
  progress: string | null;
  onCancel: () => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  if (props.progress !== null) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-300" data-testid="customizer-download-progress">{props.progress}</span>
        <button
          type="button"
          onClick={props.onCancel}
          data-testid="customizer-download-cancel"
          className="text-xs text-gray-400 underline hover:text-gray-200"
        >
          Cancel
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        data-testid="customizer-download"
        className="rounded border border-[#444] bg-[#2a2a2a] px-2 py-1 text-xs text-gray-100 hover:bg-[#333] disabled:opacity-60"
      >
        Download ▾
      </button>
      {open && (
        <ul role="menu" className="absolute bottom-full right-0 z-10 mb-1 min-w-24 rounded border border-[#333] bg-[#1b1b1b] py-1 shadow-lg">
          {CUSTOMIZER_FORMATS.map((format) => (
            <li key={format} role="none">
              <button
                type="button"
                role="menuitem"
                data-testid={`customizer-download-${format}`}
                onClick={() => { setOpen(false); props.onDownload(format); }}
                className="block w-full px-3 py-1 text-left text-xs text-gray-200 hover:bg-[#2a2a2a]"
              >
                {FORMAT_LABELS[format]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function useDownload(props: ModelCustomizerProps, values: CustomizerValues) {
  const task = useExportTask();
  const download = (format: CustomizerFormat) => {
    const fileName = downloadFileName(props.slug, props.params, values, format);
    void task.start(
      FORMAT_LABELS[format],
      async (options) => {
        const out = await props.exportModel(format, values, options);
        return out instanceof Blob
          ? { blob: out, downloadName: fileName }
          : { blob: out.blob, downloadName: fileName, ...(out.warning ? { warning: out.warning } : {}) };
      },
      props.saveFile ?? downloadBlob,
    );
  };
  const { error, notice } = task.state;
  return {
    progress: exportProgressText(task.state),
    cancel: task.cancel,
    downloadError: error ? `Export failed: ${error.message}` : null,
    downloadHint: error?.hint ?? null,
    downloadNotice: notice,
    download,
  };
}

function StatusLine({ busy, message, hint, notice }: {
  busy: boolean;
  message: string | null;
  hint: string | null;
  notice: string | null;
}) {
  if (!busy && !message && !notice) return null;
  return (
    <div className="flex flex-col gap-1 px-3 py-1.5 text-[11px]" role="status" aria-live="polite">
      {busy && (
        <span className="flex items-center gap-1.5 text-gray-400" data-testid="customizer-busy">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" aria-hidden="true" />
          Updating model…
        </span>
      )}
      {message && <span className="text-red-300" data-testid="customizer-error">{shortError(message)}</span>}
      {message && hint && <span className="text-red-300/80" data-testid="customizer-error-hint">{hint}</span>}
      {notice && <span className="text-amber-300" data-testid="customizer-notice">{notice}</span>}
    </div>
  );
}

export function ModelCustomizer(props: ModelCustomizerProps): JSX.Element | null {
  const { params, busy, error, execute, debounceMs = 400 } = props;
  const [collapsed, setCollapsed] = useState(props.defaultCollapsed ?? false);
  const state = useCustomizerValues({ params, execute, debounceMs });
  const { progress, cancel, downloadError, downloadHint, downloadNotice, download } = useDownload(props, state.values);
  if (params.length === 0) return null;

  const notice = [
    downloadNotice,
    state.ignoredUrlValues.length > 0 ? `Ignored link values: ${state.ignoredUrlValues.join('; ')}` : null,
  ].filter(Boolean).join(' ') || null;
  const message = downloadError ?? state.runError ?? error ?? null;

  return (
    <section
      aria-label="Customize model"
      data-testid="model-customizer"
      className={`pointer-events-auto flex max-h-full w-72 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-md border border-[#333] bg-[#181818]/95 text-xs text-gray-200 shadow-lg ${props.className ?? ''}`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-[#2a2a2a] px-3 py-2">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          data-testid="customizer-toggle-panel"
          className="flex items-center gap-1.5 font-medium text-gray-100"
        >
          <span aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
          Customize
        </button>
        {(busy || state.pending) && collapsed && (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" aria-label="Updating model" />
        )}
      </header>
      {!collapsed && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[#222]">
            {params.map((param) => (
              <ParamControl
                key={param.name}
                param={param}
                value={state.values[param.name] ?? param.defaultValue}
                onChange={(value) => state.setValue(param.name, value)}
                onCommit={state.flush}
              />
            ))}
          </div>
          <StatusLine busy={busy || state.pending} message={message} hint={downloadError ? downloadHint : null} notice={notice} />
          <footer className="flex items-center justify-between gap-2 border-t border-[#2a2a2a] px-3 py-2">
            <button
              type="button"
              onClick={state.reset}
              data-testid="customizer-reset"
              className="text-xs text-gray-400 underline hover:text-gray-200"
            >
              Reset
            </button>
            <DownloadMenu onDownload={download} progress={progress} onCancel={cancel} />
          </footer>
        </>
      )}
    </section>
  );
}
