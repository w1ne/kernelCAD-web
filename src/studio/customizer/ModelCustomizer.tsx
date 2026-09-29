// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * ModelCustomizer — the public-page parameter panel. One labelled row per
 * declared `param()` (slider, switch, choice or text), grouped, with the key
 * params first and "Show all" for the rest, a reset per value and for all,
 * and a download row that exports the CURRENT configuration. It holds no
 * Studio state of its own: the caller supplies the declarations, how to
 * re-run the model (`execute`) and how to export it (`exportModel`). Nothing
 * here writes to the project.
 */
import { useState, type JSX } from 'react';
import { ChevronDown, ChevronRight, Loader2, RotateCcw } from 'lucide-react';
import { Button, cx } from '../../ui';
import { downloadBlob, type ExportViaServerOptions } from '../exportViaServer';
import { exportProgressText, useExportTask, type ExportedFile } from '../hooks/useExportTask';
import {
  changedValues,
  downloadFileName,
  FORMAT_LABELS,
  type CustomizerFormat,
  type CustomizerParam,
  type CustomizerValues,
} from './customizerParams';
import { customizerLayout, type CustomizerSection } from './customizerSections';
import { DownloadBar } from './DownloadBar';
import { ParamRow } from './ParamRows';
import { useCustomizerValues, type CustomizerValuesState } from './useCustomizerValues';

/** `overlay`: a floating card over the 3D view (dark, collapsible).
 *  `panel`: fills its container and takes the host's theme (a side panel or sheet). */
export type CustomizerLayoutMode = 'overlay' | 'panel';

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
  /** The primary download button's format. Default STL. */
  defaultFormat?: CustomizerFormat;
  layout?: CustomizerLayoutMode;
  /** Overlay only. Default: collapsed on a phone-width screen. */
  defaultCollapsed?: boolean;
  debounceMs?: number;
  className?: string;
}

const MAX_ERROR_LENGTH = 160;

function shortError(message: string): string {
  const firstLine = message.split('\n')[0] ?? message;
  return firstLine.length > MAX_ERROR_LENGTH ? `${firstLine.slice(0, MAX_ERROR_LENGTH - 1)}…` : firstLine;
}

function isNarrowScreen(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 639px)').matches;
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
    // Only the download error carries a hint; it is also the one shown first.
    downloadHint: error?.hint ?? null,
    downloadNotice: notice,
    download,
  };
}

/** The shipped-with-warning notice, then any ignored link values. */
function noticeText(downloadNotice: string | null, ignoredUrlValues: readonly string[]): string | null {
  const ignored = ignoredUrlValues.length > 0 ? `Ignored link values: ${ignoredUrlValues.join('; ')}` : null;
  return [downloadNotice, ignored].filter(Boolean).join(' ') || null;
}

function StatusLine({ busy, message, hint, notice }: {
  busy: boolean;
  message: string | null;
  hint: string | null;
  notice: string | null;
}) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-1 px-4 pb-2 text-2xs empty:p-0">
      {busy && (
        <span className="flex items-center gap-1.5 text-fg-2" data-testid="customizer-busy">
          <Loader2 className="size-3 animate-spin motion-reduce:animate-none" strokeWidth={2} aria-hidden="true" />
          Updating model…
        </span>
      )}
      {message && <span className="text-danger" data-testid="customizer-error">{shortError(message)}</span>}
      {message && hint && <span className="text-fg-2" data-testid="customizer-error-hint">{hint}</span>}
      {notice && <span className="text-warn" data-testid="customizer-notice">{notice}</span>}
    </div>
  );
}

/** A thin moving bar on the panel's top edge while the model rebuilds. */
function RebuildBar({ active }: { active: boolean }): JSX.Element | null {
  if (!active) return null;
  return (
    <div
      aria-hidden="true"
      data-testid="customizer-progress"
      className="pointer-events-none absolute inset-x-0 top-0 h-0.5 animate-shimmer bg-[length:200%_100%] bg-[linear-gradient(90deg,transparent_0%,var(--kc-accent)_50%,transparent_100%)] motion-reduce:bg-accent"
    />
  );
}

function SectionRows({ section, state, params }: {
  section: CustomizerSection;
  state: CustomizerValuesState;
  params: readonly CustomizerParam[];
}): JSX.Element {
  const total = section.group === undefined ? 0 : params.filter((p) => p.group === section.group).length;
  return (
    <div role="group" aria-label={section.group}>
      {section.group !== undefined && (
        <h3 className="flex items-center gap-2 px-4 pt-3 pb-1 text-2xs font-semibold text-fg-2">
          {section.group}
          <span className="font-normal text-fg-3" aria-label={`${total} parameters`}>{total}</span>
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
        </h3>
      )}
      {section.params.map((param) => (
        <ParamRow
          key={param.name}
          param={param}
          value={state.values[param.name] ?? param.defaultValue}
          onChange={(value) => state.setValue(param.name, value)}
          onCommit={state.flush}
          onReset={() => state.resetValue(param.name)}
        />
      ))}
    </div>
  );
}

function ParamList({ params, state }: { params: readonly CustomizerParam[]; state: CustomizerValuesState }) {
  const [showAll, setShowAll] = useState(false);
  const { sections, hiddenCount } = customizerLayout(params, state.values, showAll);
  const canCollapse = showAll && customizerLayout(params, state.values, false).hiddenCount > 0;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
      {sections.map((section) => (
        <SectionRows key={section.group ?? ''} section={section} state={state} params={params} />
      ))}
      {(hiddenCount > 0 || canCollapse) && (
        <div className="px-4 pt-1 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            data-testid="customizer-show-all"
            trailingIcon={<ChevronDown className={cx('size-3.5 transition-transform duration-80', showAll && 'rotate-180')} strokeWidth={1.75} aria-hidden="true" />}
            className="-ml-2 text-accent max-sm:h-touch"
          >
            {showAll ? 'Show fewer' : `Show all ${params.length}`}
          </Button>
        </div>
      )}
    </div>
  );
}

function PanelHeader({ layout, collapsed, onToggle, paramCount, changedCount, busy, onResetAll }: {
  layout: CustomizerLayoutMode;
  collapsed: boolean;
  paramCount: number;
  onToggle: () => void;
  changedCount: number;
  busy: boolean;
  onResetAll: () => void;
}): JSX.Element {
  const Chevron = collapsed ? ChevronRight : ChevronDown;
  const title = layout === 'overlay' ? (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      data-testid="customizer-toggle-panel"
      className="focus-ring -ml-1 flex min-h-control-sm items-center gap-1 rounded-control px-1 text-ui font-semibold text-fg max-sm:min-h-touch"
    >
      <Chevron className="size-4 text-fg-2" strokeWidth={1.75} aria-hidden="true" />
      Customize
      {collapsed && <span className="font-normal text-fg-3">· {paramCount}</span>}
    </button>
  ) : (
    <h2 className="text-ui font-semibold text-fg">Customize</h2>
  );
  return (
    <header className={cx('flex items-center justify-between gap-2 px-4', collapsed ? 'py-2' : 'pt-3 pb-2')}>
      <div className="flex min-w-0 items-center gap-2">
        {title}
        {busy && collapsed && (
          <Loader2 className="size-3.5 animate-spin text-fg-2 motion-reduce:animate-none" strokeWidth={2} aria-label="Updating model" />
        )}
      </div>
      {!collapsed && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetAll}
          disabled={changedCount === 0}
          leadingIcon={<RotateCcw className="size-3.5" strokeWidth={1.75} aria-hidden="true" />}
          aria-label={changedCount > 0 ? `Reset all ${changedCount} changed values` : 'Reset all (nothing changed)'}
          data-testid="customizer-reset"
          className="-mr-2 max-sm:h-touch"
        >
          Reset all
        </Button>
      )}
    </header>
  );
}

const SHELL: Record<CustomizerLayoutMode, string> = {
  // The bottom 13rem stays clear for the view cube and home button.
  overlay: 'pointer-events-auto max-h-[calc(100%-13rem)] max-w-[calc(100vw-2rem)] rounded-panel border border-border bg-surface-1/95 shadow-e2 backdrop-blur-sm',
  panel: 'h-full w-full bg-surface-1',
};

export function ModelCustomizer(props: ModelCustomizerProps): JSX.Element | null {
  const { params, busy, error, execute, debounceMs = 150, layout = 'overlay' } = props;
  const [collapsed, setCollapsed] = useState(() => layout === 'overlay' && (props.defaultCollapsed ?? isNarrowScreen()));
  const state = useCustomizerValues({ params, execute, debounceMs });
  const { progress, cancel, downloadError, downloadHint, downloadNotice, download } = useDownload(props, state.values);
  if (params.length === 0) return null;

  const notice = noticeText(downloadNotice, state.ignoredUrlValues);
  const message = downloadError ?? state.runError ?? error ?? null;
  const rebuilding = busy || state.pending;

  return (
    <section
      aria-label="Customize model"
      aria-busy={rebuilding || undefined}
      data-testid="model-customizer"
      data-layout={layout}
      data-theme={layout === 'overlay' ? 'dark' : undefined}
      className={cx(
        'relative flex min-h-0 flex-col overflow-hidden text-ui text-fg',
        SHELL[layout],
        layout === 'overlay' && (collapsed ? 'w-auto' : 'w-80'),
        props.className,
      )}
    >
      <RebuildBar active={rebuilding} />
      <PanelHeader
        layout={layout}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        paramCount={params.length}
        changedCount={Object.keys(changedValues(params, state.values)).length}
        busy={rebuilding}
        onResetAll={state.reset}
      />
      {!collapsed && (
        <>
          <ParamList params={params} state={state} />
          <StatusLine busy={rebuilding} message={message} hint={downloadHint} notice={notice} />
          <footer className="border-t border-border px-4 py-3">
            <DownloadBar
              defaultFormat={props.defaultFormat ?? 'stl'}
              onDownload={download}
              progress={progress}
              onCancel={cancel}
            />
          </footer>
        </>
      )}
    </section>
  );
}
