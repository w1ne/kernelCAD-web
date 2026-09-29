// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, type ReactNode } from 'react';
import App from '../App';
import { MadeWithKernelcad } from '../components/MadeWithKernelcad';
import { AnonProjectBanner, ProjectClaimControl } from './-ProjectClaimControl';
import { useProjectClaim } from './-useProjectClaim';
import { ProjectViewerActions } from './-ProjectViewerActions';
import { ServerRevisionHistory } from './-ServerRevisionHistory';
import { useOptionalSession } from '../../funnel/hooks/useSession';
import {
  createCheckoutSession,
  type ProjectRow,
} from '../../funnel/lib/apiClient';
import { useProjectLiveUpdates, type LoadState } from './-useProjectLiveUpdates';
import { StudioModelCustomizer } from '../customizer/StudioModelCustomizer';
import { PageState, type PageStateAction } from '../components/Shared/PageState';

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

/** The not-yet-ready page: loading, slow, not found, timed out or failed.
 *  Each state says what happened and offers a next step. */
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

function ProjectPage() {
  const { slug } = Route.useParams();
  const { session } = useOptionalSession();
  const {
    project,
    err,
    loadState,
    retry,
    liveCode,
    lastLiveUpdate,
    handleRestored,
    privacyBusy,
    upgradeNeeded,
    handleTogglePrivacy,
  } = useProjectLiveUpdates(slug);
  const { claimed, claiming, onClaim, onBannerClaim } = useProjectClaim(slug, session, project);

  const handleUpgrade = useCallback(async () => {
    try {
      const { url } = await createCheckoutSession();
      if (typeof window !== 'undefined') window.location.href = url;
    } catch {
      // Leave the button available to retry.
    }
  }, []);

  if (loadState !== 'ready' || !project) {
    return <ProjectLoadPage state={loadState === 'ready' ? 'loading' : loadState} err={err} onRetry={retry} />;
  }

  const headerLeft = (
    <div className="flex items-center gap-2 min-w-0">
      {/* The Studio header's own project label shows the title on wide
          screens; below `lg` the Header drops that label for this one.
          The header row is shared with the privacy/share buttons, the overflow
          menu and the account slot, so on a phone the title truncates down to
          nothing (`min-w-0`, not a pixel floor) and drops out entirely under
          400px — otherwise it pushes the live badge past the header's clip and
          the badge renders as a sliver of green border. */}
      <span className="hidden min-[400px]:inline lg:hidden text-xs text-gray-200 font-medium truncate min-w-0 max-w-[160px] md:max-w-[280px]" title={project.title}>
        {project.title}
      </span>
      <span className="hidden lg:inline-flex shrink-0 whitespace-nowrap text-[10px] uppercase tracking-widest text-gray-500 font-mono px-1.5 py-0.5 rounded border border-[#333]">
        {formatPrivacyLabel(project.privacy)}
      </span>
      <span
        className="shrink-0 whitespace-nowrap text-[10px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded border border-emerald-700 text-emerald-500"
        aria-label="live"
        title={lastLiveUpdate ? `last update ${lastLiveUpdate.toLocaleTimeString()}` : 'waiting for agent updates'}
      >
        ●<span className="hidden md:inline"> live</span>
      </span>
      {/* In the header, not over the viewport: the viewport's bottom-left
          corner holds the parameter chips. */}
      <MadeWithKernelcad surface="share" className="relative shrink-0 whitespace-nowrap" />
    </div>
  );

  const headerRight: ReactNode = (
    <div className="flex items-center gap-2 min-w-0">
      <ProjectClaimControl
        project={project}
        session={session}
        claimed={claimed}
        claiming={claiming}
        privacyBusy={privacyBusy}
        upgradeNeeded={upgradeNeeded}
        onClaim={onClaim}
        onTogglePrivacy={handleTogglePrivacy}
        onUpgrade={handleUpgrade}
      />
      <ServerRevisionHistory slug={slug} onRestored={handleRestored} />
      <ProjectViewerActions
        slug={slug}
        project={project}
      />
    </div>
  );

  return (
    <>
      <App
        initialCode={project.current_code}
        projectName={project.title}
        liveCode={liveCode}
        viewerMode
        viewportOverlay={<StudioModelCustomizer slug={slug} hints={project.parameters} />}
        headerLeft={headerLeft}
        headerRight={headerRight ?? undefined}
      />
      <AnonProjectBanner
        project={project}
        session={session}
        claimed={claimed}
        claiming={claiming}
        onClaim={onBannerClaim}
      />
    </>
  );
}
