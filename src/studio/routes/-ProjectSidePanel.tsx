// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The /p/<slug> side panel (a bottom sheet on a phone). One story, top to
// bottom: what the model is and whether it passed its checks, change it
// (the customizer), download it, keep it, continue in chat, and the rest
// (share, remix, report or publish, revisions).
//
// Everything here reads the workbench the live model runs in, so it is
// mounted inside that WorkbenchProvider.
import { useCallback, useMemo, type JSX, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AlertTriangle, CheckCircle2, ChevronDown, CircleSlash, Download, Loader2 } from 'lucide-react';
import { Badge, Button, Menu, Skeleton, cx, type BadgeTone, type MenuEntry } from '../../ui';
import type { ProjectRow } from '../../funnel/lib/apiClient';
import { useWorkbench } from '../context/WorkbenchContext';
import { hasNonemptyGeometry } from '../components/viewer/hasNonemptyGeometry';
import { downloadBlob, exportViaServer } from '../exportViaServer';
import { exportProgressText, useExportTask, type ExportTaskState } from '../hooks/useExportTask';
import { jointContactCapMm3 } from '../../modeling/runtime/jointContactCap';
import { StudioModelCustomizer } from '../customizer/StudioModelCustomizer';
import {
  CUSTOMIZER_FORMATS,
  FORMAT_LABELS,
  type CustomizerFormat,
  type DownloadFormat,
  type CustomizerParamHint,
} from '../customizer/customizerParams';
import { KeepThisModel } from './-ProjectClaimControl';
import { ProjectViewerActions } from './-ProjectViewerActions';
import { ServerRevisionList } from './-ServerRevisionHistory';
import { ResumePrompt } from './-ResumePrompt';
import {
  FORMAT_HINTS,
  configuredSource,
  modelCheck,
  modelSizeLabel,
  relativeTime,
  type CheckTone,
  type ModelCheck,
  type ProjectOwnership,
} from './-projectPageModel';

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

export interface ProjectDownload {
  defaultFormat: CustomizerFormat;
  /** A model is built and can be exported. */
  ready: boolean;
  state: ExportTaskState;
  /** "Exporting STL… 3 s", or null when idle. */
  progress: string | null;
  start: (format: DownloadFormat) => void;
  cancel: () => void;
  dismiss: () => void;
}

/**
 * One download for the page: the saved source with the customizer's values
 * baked in, through the same server export (progress, cancel, error hints,
 * shipped-with-warning notice) as the Studio Export tab.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useProjectDownload(slug: string, hints: readonly CustomizerParamHint[] | undefined): ProjectDownload {
  const { code, scriptParams, geometries, error } = useWorkbench();
  const task = useExportTask();
  const { start: startTask } = task;
  const ready = !error && hasNonemptyGeometry(geometries);

  const start = useCallback((format: DownloadFormat) => {
    void startTask(
      FORMAT_LABELS[format],
      async (options) => {
        const search = typeof window === 'undefined' ? '' : window.location.search;
        const source = configuredSource(slug, code, scriptParams ?? [], hints, search, format);
        const out = await exportViaServer(format, source.code, options);
        return { blob: out.blob, downloadName: source.fileName, ...(out.warning ? { warning: out.warning } : {}) };
      },
      downloadBlob,
    );
  }, [startTask, slug, code, scriptParams, hints]);

  return {
    // Share pages export STEP from the primary button, including a single
    // solid that has no assembly part name. The format menu still lists STL.
    defaultFormat: 'step',
    ready,
    state: task.state,
    progress: exportProgressText(task.state),
    start,
    cancel: task.cancel,
    dismiss: task.dismiss,
  };
}

/** The mesh/solid formats, then the drawing sheet. */
const MENU_FORMATS: readonly DownloadFormat[] = [...CUSTOMIZER_FORMATS, 'pdf-drawing'];

function formatMenu(download: ProjectDownload): MenuEntry[] {
  return MENU_FORMATS.map((format) => ({
    id: format,
    label: `${FORMAT_LABELS[format]} · ${FORMAT_HINTS[format]}`,
    onSelect: () => download.start(format),
  }));
}

/** The primary split button: "Download STL" plus a menu of formats. While an
 *  export runs it shows the progress and a Cancel. */
export function DownloadButton({ download, className }: { download: ProjectDownload; className?: string }): JSX.Element {
  const format = download.defaultFormat;
  if (download.progress !== null) {
    return (
      <div className={cx('flex min-w-0 items-center gap-2', className)}>
        <div
          className="flex h-control-lg min-w-0 flex-1 items-center gap-2 rounded-control bg-accent-soft px-3 text-ui font-medium text-accent max-md:h-touch"
          data-testid="download-progress"
        >
          <Loader2 className="size-4 shrink-0 animate-spin" strokeWidth={1.75} aria-hidden="true" />
          <span className="truncate">{download.progress}</span>
        </div>
        <Button variant="ghost" size="lg" onClick={download.cancel} className="max-md:h-touch" data-testid="download-cancel">
          Cancel
        </Button>
      </div>
    );
  }
  return (
    <div className={cx('flex min-w-0', className)} data-testid="download-button">
      <Button
        variant="primary"
        size="lg"
        disabled={!download.ready}
        onClick={() => download.start(format)}
        leadingIcon={<Download className="size-4" strokeWidth={1.75} aria-hidden="true" />}
        className="min-w-0 flex-1 rounded-r-none max-md:h-touch"
        data-testid="download-primary"
      >
        Download {FORMAT_LABELS[format]}
      </Button>
      <Menu
        align="end"
        label="Download format"
        items={formatMenu(download)}
        trigger={(props) => (
          <Button
            {...props}
            variant="primary"
            size="lg"
            disabled={!download.ready}
            aria-label="Choose a download format"
            className="rounded-l-none border-l border-on-accent/25 px-2.5 max-md:h-touch"
            data-testid="download-formats"
          >
            <ChevronDown className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </Button>
        )}
      />
    </div>
  );
}

/** The last export's error (with the server's hint) or warning notice. */
export function DownloadStatus({ download }: { download: ProjectDownload }): JSX.Element | null {
  const { error, notice } = download.state;
  if (!error && !notice) return null;
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={cx(
        'flex items-start gap-2 rounded-control px-3 py-2 text-ui',
        error ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn',
      )}
      data-testid="download-status"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="break-words font-medium">{error ? `Download failed: ${error.message}` : notice}</p>
        {error?.hint && <p className="mt-0.5 break-words text-fg-2">{error.hint}</p>}
      </div>
      <button
        type="button"
        onClick={download.dismiss}
        className="focus-ring shrink-0 rounded-control px-1 text-2xs font-medium underline-offset-2 hover:underline"
      >
        Dismiss
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const CHECK_TONE: Record<CheckTone, BadgeTone> = { ok: 'ok', warn: 'warn', danger: 'danger', neutral: 'neutral' };

function checkIcon(tone: CheckTone): ReactNode {
  if (tone === 'ok') return <CheckCircle2 />;
  if (tone === 'neutral') return <CircleSlash />;
  return <AlertTriangle />;
}

/** The check verdict of the model on screen, from the review the viewer
 *  already holds. */
// eslint-disable-next-line react-refresh/only-export-components
export function useModelCheck(): { check: ModelCheck | null; size: string | null } {
  const { geometries, featureRecords, scriptReview, error } = useWorkbench();
  return useMemo(() => {
    const hasGeometry = hasNonemptyGeometry(geometries);
    const interferences = scriptReview?.interferenceSummary?.actionableCount
      ?? (scriptReview?.rawInterferencePairs ?? []).filter((pair) => pair.volumeMm3 > jointContactCapMm3()).length;
    return {
      check: modelCheck({ error: error ?? null, hasGeometry, review: scriptReview ?? null, interferences }),
      size: hasGeometry ? modelSizeLabel(geometries, featureRecords ?? []) : null,
    };
  }, [geometries, featureRecords, scriptReview, error]);
}

function ownerLabel(ownership: ProjectOwnership): string {
  if (ownership === 'owner' || ownership === 'claimed') return 'Yours';
  if (ownership === 'anonymous') return 'Not saved to an account';
  return 'Shared with you';
}

function Summary({ project, ownership, now }: {
  project: ProjectRow;
  ownership: ProjectOwnership;
  now: number;
}): JSX.Element {
  const { check, size } = useModelCheck();
  const updated = relativeTime(project.updated_at, now);
  const meta = [ownerLabel(ownership), updated, `r${project.version}`].filter(Boolean).join(' · ');
  return (
    <section className="flex flex-col gap-2" aria-label="About this model">
      <h2 className="font-serif text-heading text-fg break-words" data-testid="panel-title">{project.title}</h2>
      <p className="text-2xs text-fg-3">{meta}</p>
      <div className="mt-1 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1" aria-live="polite" data-testid="model-check">
        {check ? (
          <>
            <Badge tone={CHECK_TONE[check.tone]} icon={checkIcon(check.tone)}>{check.label}</Badge>
            <span className="min-w-0 text-ui text-fg-2">{check.detail}</span>
          </>
        ) : (
          <>
            <Skeleton className="h-5 w-20 rounded-full" />
            <span className="text-ui text-fg-3">Checking the model…</span>
          </>
        )}
      </div>
      {size && <p className="font-mono text-code text-fg-2" data-testid="model-size">{size}</p>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export interface ProjectSidePanelProps {
  slug: string;
  project: ProjectRow;
  session: Session | null;
  ownership: ProjectOwnership;
  now: number;
  download: ProjectDownload;
  claiming: boolean;
  onClaim: () => void;
  privacyBusy: boolean;
  upgradeNeeded: boolean;
  onTogglePrivacy: () => void;
  onUpgrade: () => void;
  onRestored: (code: string) => void;
}

function Section({ title, children, className, testId }: {
  title?: string;
  children: ReactNode;
  className?: string;
  testId?: string;
}): JSX.Element {
  return (
    <section className={cx('flex flex-col gap-3 border-t border-border px-4 py-5', className)} data-testid={testId}>
      {title && <h3 className="text-ui font-semibold text-fg">{title}</h3>}
      {children}
    </section>
  );
}

export function ProjectSidePanel(props: ProjectSidePanelProps): JSX.Element {
  const { slug, project } = props;
  return (
    <div className="group/panel flex flex-col pb-4" data-testid="project-side-panel">
      <div className="px-4 pb-5 pt-2 md:pt-5">
        <Summary project={project} ownership={props.ownership} now={props.now} />
      </div>
      {/* The customizer renders nothing for a model without parameters. With
          parameters, its own Download (the configured model) is the page's
          Download on desktop; the panel's Download below stands in for a
          model without parameters. On a phone the action bar holds the one
          Download, so the customizer's is hidden there. */}
      <div className="border-t border-border empty:hidden max-md:[&_[data-testid=customizer-download]]:hidden">
        <StudioModelCustomizer slug={slug} hints={project.parameters} layout="panel" />
      </div>
      <div className="hidden md:block md:group-has-[[data-testid=model-customizer]]/panel:hidden">
        <Section testId="panel-download">
          <DownloadButton download={props.download} />
          <DownloadStatus download={props.download} />
        </Section>
      </div>
      <KeepSection {...props} />
      <Section title="Continue in chat">
        <p className="text-ui text-fg-2">
          Paste this into Claude, ChatGPT or any agent with kernelCAD connected to keep working on this model.
        </p>
        <ResumePrompt slug={slug} title={project.title} />
      </Section>
      <Section title="More">
        <ProjectViewerActions slug={slug} project={project} look="panel" />
        <ServerRevisionList slug={slug} onRestored={props.onRestored} />
      </Section>
    </div>
  );
}

function KeepSection(props: ProjectSidePanelProps): JSX.Element | null {
  if (props.ownership === 'other') return null;
  return (
    <Section testId="panel-keep">
      <KeepThisModel
        slug={props.slug}
        project={props.project}
        session={props.session}
        ownership={props.ownership}
        claiming={props.claiming}
        privacyBusy={props.privacyBusy}
        upgradeNeeded={props.upgradeNeeded}
        onClaim={props.onClaim}
        onTogglePrivacy={props.onTogglePrivacy}
        onUpgrade={props.onUpgrade}
      />
    </Section>
  );
}

/** Placeholder panel while the project row loads. */
export function ProjectSidePanelSkeleton({ slow, onRetry }: { slow: boolean; onRetry: () => void }): JSX.Element {
  return (
    <div className="flex flex-col gap-4 px-4 pb-5 pt-2 md:pt-5" data-testid="project-side-panel-skeleton">
      <div role="status" aria-label="Loading the project" className="flex flex-col gap-3">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-40 rounded-full" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      {slow && (
        <div className="flex flex-col gap-2 rounded-panel border border-border bg-surface-2 p-3" role="status">
          <p className="text-ui text-fg-2">Loading takes longer than usual.</p>
          <Button variant="secondary" size="sm" onClick={onRetry} className="self-start">Try again</Button>
        </div>
      )}
    </div>
  );
}
