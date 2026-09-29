// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// UI state for one server export at a time: which format runs, how long it
// has run, cancel, the error (message + the server's hint) and the
// non-blocking warning notice of a file that shipped with a defect. Shared by
// the Export tab, the header export buttons and the public customizer
// download menu, so all three read the same way.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  exportErrorText,
  isExportAbort,
  type ExportProgress,
  type ExportViaServerOptions,
  type ExportWarning,
} from '../exportViaServer';

/** What an export task hands back: the file and an optional warning. */
export interface ExportedFile {
  blob: Blob;
  downloadName: string;
  warning?: ExportWarning;
}

export interface ExportTaskState {
  /** Label of the running export (e.g. the format), or null when idle. */
  running: string | null;
  /** Whole seconds since the running export started. */
  elapsedSec: number;
  progress: ExportProgress | null;
  error: { message: string; hint?: string } | null;
  /** Warning of the last export that shipped (the file was saved). */
  notice: string | null;
}

export interface ExportTask {
  state: ExportTaskState;
  start: (
    label: string,
    run: (options: ExportViaServerOptions) => Promise<ExportedFile>,
    save: (blob: Blob, downloadName: string) => void,
  ) => Promise<void>;
  cancel: () => void;
  dismiss: () => void;
}

const IDLE: ExportTaskState = { running: null, elapsedSec: 0, progress: null, error: null, notice: null };

export function useExportTask(): ExportTask {
  const [state, setState] = useState<ExportTaskState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);
  const startedAt = useRef(0);

  // Elapsed-time ticker while an export runs.
  useEffect(() => {
    if (state.running === null) return undefined;
    const timer = setInterval(() => {
      setState((s) => ({ ...s, elapsedSec: Math.floor((Date.now() - startedAt.current) / 1000) }));
    }, 1000);
    return () => clearInterval(timer);
  }, [state.running]);

  // Abandon a running export when the owner unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const start = useCallback<ExportTask['start']>(async (label, run, save) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    startedAt.current = Date.now();
    setState({ ...IDLE, running: label });
    try {
      const file = await run({
        signal: controller.signal,
        onProgress: (progress) => {
          if (abortRef.current === controller) setState((s) => ({ ...s, progress }));
        },
      });
      if (controller.signal.aborted) return;
      save(file.blob, file.downloadName);
      setState({ ...IDLE, notice: file.warning?.message ?? null });
    } catch (err) {
      if (abortRef.current !== controller) return;
      setState(isExportAbort(err) || controller.signal.aborted
        ? IDLE
        : { ...IDLE, error: exportErrorText(err) });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(IDLE);
  }, []);

  const dismiss = useCallback(() => setState((s) => ({ ...s, error: null, notice: null })), []);

  return { state, start, cancel, dismiss };
}

/** "Exporting STL… 12 s", or the busy-server wait. */
export function exportProgressText(state: ExportTaskState): string | null {
  if (state.running === null) return null;
  if (state.progress?.phase === 'waiting') {
    return `Server busy. Retrying ${state.running} in ${state.progress.retryInSec ?? 0} s…`;
  }
  if (state.progress?.phase === 'downloading') return `Downloading ${state.running}…`;
  return `Exporting ${state.running}… ${state.elapsedSec} s`;
}
