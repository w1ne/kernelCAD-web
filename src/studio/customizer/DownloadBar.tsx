// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * The customizer's download row: one primary button for the default format
 * and the other formats beside it. While an export runs, the row shows its
 * progress and a Cancel button instead.
 */
import type { JSX } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '../../ui';
import { CUSTOMIZER_FORMATS, type CustomizerFormat } from './customizerParams';

export const FORMAT_LABELS: Record<CustomizerFormat, string> = { stl: 'STL', '3mf': '3MF', step: 'STEP' };

export interface DownloadBarProps {
  defaultFormat: CustomizerFormat;
  onDownload: (format: CustomizerFormat) => void;
  /** Progress text of the running export, or null when idle. */
  progress: string | null;
  onCancel: () => void;
}

export function DownloadBar({ defaultFormat, onDownload, progress, onCancel }: DownloadBarProps): JSX.Element {
  if (progress !== null) {
    return (
      <div className="flex min-h-control-md items-center gap-3">
        <Loader2 className="size-4 shrink-0 animate-spin text-accent motion-reduce:animate-none" strokeWidth={1.75} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-ui text-fg" data-testid="customizer-download-progress">{progress}</span>
        <Button variant="ghost" size="sm" onClick={onCancel} data-testid="customizer-download-cancel">
          Cancel
        </Button>
      </div>
    );
  }
  const others = CUSTOMIZER_FORMATS.filter((format) => format !== defaultFormat);
  return (
    <div className="flex items-center gap-2" data-testid="customizer-download" role="group" aria-label="Download">
      <Button
        variant="primary"
        size="md"
        leadingIcon={<Download className="size-4" strokeWidth={1.75} aria-hidden="true" />}
        onClick={() => onDownload(defaultFormat)}
        data-testid={`customizer-download-${defaultFormat}`}
        className="min-w-0 flex-1 max-sm:h-touch"
      >
        Download {FORMAT_LABELS[defaultFormat]}
      </Button>
      {others.map((format) => (
        <Button
          key={format}
          variant="secondary"
          size="md"
          onClick={() => onDownload(format)}
          aria-label={`Download ${FORMAT_LABELS[format]}`}
          data-testid={`customizer-download-${format}`}
          className="px-3 max-sm:h-touch"
        >
          {FORMAT_LABELS[format]}
        </Button>
      ))}
    </div>
  );
}
