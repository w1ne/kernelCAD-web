// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * /p/<slug> — the page a shared model link opens (most visitors arrive here
 * from a chat with their agent).
 *
 * Default: the one design, the Studio workbench. Parameters, joints, loads
 * and the code live in that window. `?view=studio` is the same page.
 *
 * `?view=view`: the simplified viewer, for a fast look. Embedding uses
 * `/embed/<slug>`.
 */
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useState, useSyncExternalStore, type JSX, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, PanelsTopLeft } from 'lucide-react';
import App, { LiveCodeApplier } from '../App';
import { AnonProjectBanner, ProjectClaimControl } from './-ProjectClaimControl';
import { useProjectClaim, type ProjectClaimState } from './-useProjectClaim';
import { ProjectViewerActions } from './-ProjectViewerActions';
import { ServerRevisionHistory } from './-ServerRevisionHistory';
import { useOptionalSession } from '../../funnel/hooks/useSession';
import {
  createCheckoutSession,
  type ProjectRow,
} from '../../funnel/lib/apiClient';
import { useProjectLiveUpdates, type LoadState, type ProjectLiveUpdates } from './-useProjectLiveUpdates';
import { StudioCommandPalette } from '../components/CommandPalette';
import { PageState, type PageStateAction } from '../components/Shared/PageState';
import { plainLine } from '../plainLine';
import { WorkbenchProvider } from '../context/WorkbenchContext';
import {
  LiveModelViewport,
  ModelStage,
  ViewerPageShell,
  useLiveViewportState,
  usePreferredTheme,
} from '../ViewerPageShell';
import {
  DownloadButton,
  DownloadStatus,
  ProjectSidePanel,
  ProjectSidePanelSkeleton,
  useModelCheck,
  useProjectDownload,
} from './-ProjectSidePanel';
import { Badge, Button, buttonClass, cx } from '../../ui';
import {
  isFastView,
  isLive,
  modelPageHref,
  posterUrl,
  projectOwnership,
  signInHref,
  studioHref,
} from './-projectPageModel';
import { useShareProject } from './-useShareProject';
import { getStoredBuildError, retryStoredBuild, subscribeMeshNotice } from '../scriptSource';
import { shareHeadingTitle } from './-shareRevision';
import type { Session } from '@supabase/supabase-js';

export const Route = createFileRoute('/p/$slug')({
  component: ProjectPage,
});

function formatPrivacyLabel(privacy: ProjectRow['privacy']): string {
  if (privacy === 'private') return 'private';
  if (privacy === 'public_featured') return 'featured';
  return 'public by link';
}

const BROWSE_ACTIONS: readonly PageStateAction[] = [
  { label: 'Open gallery', href: '/gallery' },
  { label: 'Your projects', href: '/me' },
];

/** The page failed for good: not found, timed out or errored. Each state
 *  says what happened and offers a next step. */
function ProjectLoadPage({ state, err, onRetry }: {
  state: Exclude<LoadState, 'ready'>;
  err: string | null;
  onRetry: () => void;
}) {
  const retry: PageStateAction = { label: 'Try again', onClick: onRetry, primary: true };
  switch (state) {
    case 'not_found':
      return (
        <PageState
          tone="error"
          title="This project does not exist or is private"
          message="Check the link. If the project is yours and private, sign in with the account that owns it."
          actions={[{ ...BROWSE_ACTIONS[0], primary: true }, BROWSE_ACTIONS[1]]}
        />
      );
    case 'timeout':
      return (
        <PageState
          tone="error"
          title="The project did not load"
          message="The server did not answer in time. Check your connection and try again."
          actions={[retry, ...BROWSE_ACTIONS]}
        />
      );
    case 'error':
      return (
        <PageState
          tone="error"
          title="Could not load this project"
          message="Something went wrong while loading the project. Try again in a moment."
          detail={err}
          actions={[retry, ...BROWSE_ACTIONS]}
        />
      );
    case 'slow':
      return (
        <PageState
          tone="loading"
          title="Loading the project…"
          message="This takes longer than usual. You can keep waiting or try again."
          actions={[{ label: 'Try again', onClick: onRetry }]}
        />
      );
    default:
      return <PageState tone="loading" title="Loading the project…" />;
  }
}

function isTerminal(state: LoadState): state is 'not_found' | 'timeout' | 'error' {
  return state === 'not_found' || state === 'timeout' || state === 'error';
}

function readView(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('view');
}

function useUpgrade(): () => void {
  return useCallback(async () => {
    try {
      const { url } = await createCheckoutSession();
      if (typeof window !== 'undefined') window.location.href = url;
    } catch {
      // Leave the button available to retry.
    }
  }, []);
}

function ProjectPage() {
  const { slug } = Route.useParams();
  const { session } = useOptionalSession();
  const live = useProjectLiveUpdates(slug);
  const share = useShareProject(slug, live.project, live.liveCode);
  const claim = useProjectClaim(slug, session, live.project);
  const onUpgrade = useUpgrade();
  const { loadState } = live;
  const project = share.project;

  if (isTerminal(loadState)) {
    return <ProjectLoadPage state={loadState} err={live.err} onRetry={live.retry} />;
  }
  if (share.status === 'error') {
    return (
      <ProjectLoadPage
        state="error"
        err={share.error ?? 'This revision could not be loaded.'}
        onRetry={share.retry}
      />
    );
  }
  // The simplified viewer is opt-in. Everything else, including old
  // `?view=studio` links, is the one design.
  if (isFastView(readView())) {
    return (
      <ModelFirstPage
        slug={slug}
        session={session}
        live={live}
        claim={claim}
        onUpgrade={onUpgrade}
        view={project}
        historical={share.historical}
        pinned={share.requested != null}
      />
    );
  }
  // A historical `?version=` must not flash the latest model while its
  // source is still loading.
  if (loadState !== 'ready' || !project) {
    return <ProjectLoadPage state={loadState === 'ready' ? 'loading' : loadState} err={live.err} onRetry={live.retry} />;
  }
  return (
    <StudioProjectView
      slug={slug}
      project={project}
      session={session}
      live={live}
      claim={claim}
      onUpgrade={onUpgrade}
      historical={share.historical}
    />
  );
}

// ---------------------------------------------------------------------------
// Model-first page
// ---------------------------------------------------------------------------

interface PageProps {
  slug: string;
  session: Session | null;
  live: ProjectLiveUpdates;
  claim: ProjectClaimState;
  onUpgrade: () => void;
}

/** Re-render every 30 s, so "2 min ago" and the Live badge stay true. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function apiBase(): string {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
}

function HeaderActions({ slug, session }: { slug: string; session: Session | null }): JSX.Element {
  return (
    <>
      {/* On a phone the action bar carries "Studio". */}
      <span className="hidden md:contents">
        <a href={studioHref(slug)} className={buttonClass('secondary', 'md')} data-testid="open-in-studio">
          <PanelsTopLeft className="size-4" strokeWidth={1.75} aria-hidden="true" />
          Open in Studio
        </a>
      </span>
      {session ? (
        <a href="/me" className={buttonClass('ghost', 'md')} data-testid="your-projects">
          Your projects
        </a>
      ) : (
        <a href={signInHref(slug)} className={buttonClass('ghost', 'md')} data-testid="header-sign-in">
          Sign in
        </a>
      )}
    </>
  );
}

function LiveBadge({ project, lastLiveUpdate, now }: {
  project: ProjectRow | null;
  lastLiveUpdate: Date | null;
  now: number;
}): JSX.Element | null {
  if (!project || !isLive(project.updated_at, lastLiveUpdate, now)) return null;
  const title = lastLiveUpdate ? `Last update ${lastLiveUpdate.toLocaleTimeString()}` : 'Updated in the last 10 minutes';
  return (
    <span title={title} className="shrink-0" data-testid="live-badge">
      <Badge tone="ok" dot>Live</Badge>
    </span>
  );
}

function ModelFirstPage(props: PageProps & {
  /** Revision the link asked for. Null while a historical pin is loading. */
  view: ProjectRow | null;
  /** Live pushes must not replace a link to an older revision. */
  historical: boolean;
  /** `?version=` is set, so the latest render must not stand in for it. */
  pinned: boolean;
}): JSX.Element {
  const { slug, live } = props;
  const theme = usePreferredTheme();
  const now = useNow();
  const poster = posterUrl(apiBase(), slug);
  const project = props.view;
  const shared = {
    theme,
    title: project
      ? shareHeadingTitle(project.title, null, null)
      : <span className="text-fg-3">Loading…</span>,
    titleAside: <LiveBadge project={project} lastLiveUpdate={live.lastLiveUpdate} now={now} />,
    headerActions: <HeaderActions slug={slug} session={props.session} />,
    panelLabel: 'Model details',
  };

  if (!project) {
    // A historical pin's poster is the latest render. Leave the stage empty
    // until that revision's own mesh is the one we can show.
    return (
      <ViewerPageShell
        {...shared}
        stage={
          <ModelStage
            posterSrc={props.pinned ? null : poster}
            posterAlt="Stored render of the model"
            phase="loading"
          />
        }
        panel={<ProjectSidePanelSkeleton slow={live.loadState === 'slow'} onRetry={live.retry} />}
      />
    );
  }
  return (
    <WorkbenchProvider initialCode={project.current_code} projectName={project.title}>
      <LiveCodeApplier liveCode={props.historical ? undefined : live.liveCode} />
      <LiveProjectShell {...props} project={project} shared={shared} now={now} poster={props.pinned ? null : poster} />
    </WorkbenchProvider>
  );
}

function LiveProjectShell(props: PageProps & {
  project: ProjectRow;
  now: number;
  shared: Omit<Parameters<typeof ViewerPageShell>[0], 'stage' | 'panel' | 'actionBar'>;
  /** Stored render shown until the model is on screen; null for a pinned
   *  historical revision (the render is of the latest one). */
  poster: string | null;
}): JSX.Element {
  const { slug, project, live, claim, session } = props;
  const [displayReady, setDisplayReady] = useState(false);
  const onDisplayReady = useCallback(() => setDisplayReady(true), []);
  const stage = useLiveViewportState(displayReady);
  const download = useProjectDownload(slug, project.parameters);
  const { check, size } = useModelCheck();
  const ownership = projectOwnership(project, session, claim.claimed);
  const canvasLabel = [`3D model: ${project.title}`, size, check?.label].filter(Boolean).join('. ');

  return (
    <ViewerPageShell
      {...props.shared}
      stage={
        <ModelStage
          // The stored render stays up while the model builds or downloads:
          // a heavy model must never read as an empty viewport.
          posterSrc={props.poster}
          posterAlt={`Render of ${project.title}`}
          phase={stage.phase}
          busy={stage.busy}
          failure={<BuildFailure slug={slug} error={stage.error} />}
          overlay={
            <AnonProjectBanner
              project={project}
              session={session}
              claimed={claim.claimed}
              claiming={claim.claiming}
              onClaim={claim.onBannerClaim}
              look="page"
            />
          }
        >
          <LiveModelViewport onDisplayReady={onDisplayReady} label={canvasLabel} />
        </ModelStage>
      }
      panel={
        <ProjectSidePanel
          slug={slug}
          project={project}
          session={session}
          ownership={ownership}
          now={props.now}
          download={download}
          claiming={claim.claiming}
          onClaim={claim.onClaim}
          privacyBusy={live.privacyBusy}
          upgradeNeeded={live.upgradeNeeded}
          onTogglePrivacy={live.handleTogglePrivacy}
          onUpgrade={props.onUpgrade}
          onRestored={live.handleRestored}
        />
      }
      actionBar={
        <div className="flex w-full min-w-0 flex-col gap-2">
          <DownloadStatus download={download} />
          <div className="flex w-full min-w-0 items-center gap-2">
            <DownloadButton download={download} className="flex-1" />
            <a href={studioHref(slug)} className={cx(buttonClass('secondary', 'lg'), 'max-md:h-touch')} aria-label="Open in Studio">
              Studio
              <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </a>
          </div>
        </div>
      }
    />
  );
}

/** Over the stage when the model does not build: what happened and where to
 *  go next. A server-side build failure of the stored mesh says so and offers
 *  to build it again; a script error points at Studio. */
function BuildFailure({ slug, error }: { slug: string; error: string | null }): ReactNode {
  const storedError = useSyncExternalStore(subscribeMeshNotice, getStoredBuildError, getStoredBuildError);
  const [retrying, setRetrying] = useState(false);
  const onRetry = useCallback(async () => {
    setRetrying(true);
    try {
      await retryStoredBuild();
    } finally {
      window.location.reload();
    }
  }, []);
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/40 p-4">
      <div role="alert" className="w-full max-w-sm rounded-panel border border-border bg-surface-1 p-5 text-fg shadow-e2" data-testid="build-failure">
        <h2 className="text-title text-fg">The model did not build</h2>
        <p className="mt-1 text-ui text-fg-2">
          {storedError
            ? 'The server could not build the 3D model for this link. You can ask it to try again, or open the code in Studio.'
            : 'The saved source has an error, so there is nothing to show yet. Open it in Studio to see the code and the error.'}
        </p>
        {(storedError ?? error) && (
          <p className="mt-3 break-words text-ui text-danger" data-testid="build-failure-error">
            {plainLine(storedError ?? error ?? '')}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {storedError ? (
            <Button variant="primary" size="md" disabled={retrying} onClick={() => void onRetry()} data-testid="retry-stored-build">
              {retrying ? 'Retrying…' : 'Try again'}
            </Button>
          ) : null}
          <a href={studioHref(slug)} className={buttonClass(storedError ? 'secondary' : 'primary', 'md')}>Open in Studio</a>
          {!storedError && (
            <Button variant="secondary" size="md" onClick={() => window.location.reload()}>Reload</Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full Studio (?view=studio)
// ---------------------------------------------------------------------------

function StudioProjectView({ slug, project, session, live, claim, onUpgrade, historical }: PageProps & {
  project: ProjectRow;
  historical: boolean;
}): JSX.Element {
  const headerLeft = (
    <div className="flex items-center gap-2 min-w-0">
      <a
        href={modelPageHref(slug)}
        className="inline-flex shrink-0 items-center justify-center gap-1 rounded px-1.5 py-0.5 text-xs text-gray-300 hover:bg-[#333] hover:text-white max-md:size-touch max-md:p-0"
        title="Simplified view, for a fast look or an embed-style page"
        data-testid="open-fast-view"
      >
        <ArrowLeft className="size-3 max-md:size-4" aria-hidden="true" />
        <span className="max-md:sr-only">View</span>
      </a>
      {/* The Studio header's own project label shows the title on wide
          screens; below `lg` the Header drops that label for this one. On a
          phone the route's other controls live in the header's ⋯ menu, so the
          title takes the free width and truncates. */}
      <span className="lg:hidden text-xs text-gray-200 font-medium truncate min-w-0 max-w-[160px] max-md:max-w-none md:max-w-[280px]" title={project.title}>
        {project.title}
      </span>
      <span className="hidden lg:inline-flex shrink-0 whitespace-nowrap text-2xs uppercase tracking-widest text-gray-500 font-mono px-1.5 py-0.5 rounded border border-[#333]">
        {formatPrivacyLabel(project.privacy)}
      </span>
      <span
        className="shrink-0 whitespace-nowrap text-2xs uppercase tracking-widest font-mono px-1.5 py-0.5 rounded border border-emerald-700 text-emerald-500"
        aria-label="live"
        title={live.lastLiveUpdate ? `last update ${live.lastLiveUpdate.toLocaleTimeString()}` : 'waiting for agent updates'}
      >
        ●<span className="hidden md:inline"> live</span>
      </span>
    </div>
  );

  const headerRight: ReactNode = (
    <div className="flex items-center gap-2 min-w-0">
      <StudioCommandPalette />
      <ProjectClaimControl
        project={project}
        session={session}
        claimed={claim.claimed}
        claiming={claim.claiming}
        privacyBusy={live.privacyBusy}
        upgradeNeeded={live.upgradeNeeded}
        onClaim={claim.onClaim}
        onTogglePrivacy={live.handleTogglePrivacy}
        onUpgrade={onUpgrade}
      />
      <ServerRevisionHistory slug={slug} onRestored={live.handleRestored} />
      <ProjectViewerActions slug={slug} project={project} />
    </div>
  );

  return (
    <>
      <App
        initialCode={project.current_code}
        projectName={project.title}
        liveCode={historical ? undefined : live.liveCode}
        viewerMode
        headerLeft={headerLeft}
        headerRight={headerRight}
      />
      <AnonProjectBanner
        project={project}
        session={session}
        claimed={claim.claimed}
        claiming={claim.claiming}
        onClaim={claim.onBannerClaim}
      />
    </>
  );
}
