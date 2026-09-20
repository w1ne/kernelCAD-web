// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState, type ReactNode } from 'react';
import App from '../App';
import { ProjectClaimControl } from './-ProjectClaimControl';
import { ProjectViewerActions } from './-ProjectViewerActions';
import { ServerRevisionHistory } from './-ServerRevisionHistory';
import { useOptionalSession } from '../../funnel/hooks/useSession';
import {
  claimProject,
  createCheckoutSession,
  type ProjectRow,
} from '../../funnel/lib/apiClient';
import { useProjectLiveUpdates } from './-useProjectLiveUpdates';

export const Route = createFileRoute('/p/$slug')({
  component: ProjectPage,
});

function formatPrivacyLabel(privacy: ProjectRow['privacy']): string {
  if (privacy === 'private') return 'private';
  if (privacy === 'public_featured') return 'featured';
  return 'public by link';
}

function ProjectPage() {
  const { slug } = Route.useParams();
  const { session } = useOptionalSession();
  const {
    project,
    err,
    liveCode,
    lastLiveUpdate,
    handleRestored,
    privacyBusy,
    upgradeNeeded,
    handleTogglePrivacy,
  } = useProjectLiveUpdates(slug);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const handleClaim = useCallback(async () => {
    setClaiming(true);
    try {
      await claimProject(slug);
      setClaimed(true);
    } catch {
      // Leave the button available to retry.
    } finally {
      setClaiming(false);
    }
  }, [slug]);

  const handleUpgrade = useCallback(async () => {
    try {
      const { url } = await createCheckoutSession();
      if (typeof window !== 'undefined') window.location.href = url;
    } catch {
      // Leave the button available to retry.
    }
  }, []);

  if (err) {
    return (
      <main className="min-h-screen bg-vellum font-sans p-8">
        <p className="text-copper font-mono text-sm">Failed to load: {err}</p>
      </main>
    );
  }
  if (!project) {
    return (
      <main className="min-h-screen bg-vellum font-sans p-8">
        <p className="text-ink-faint font-mono text-sm">Loading…</p>
      </main>
    );
  }

  const headerLeft = (
    <div className="flex items-center gap-2 min-w-0">
      {/* The header row is shared with the privacy/share buttons, the overflow
          menu and the account slot, so on a phone the title truncates down to
          nothing (`min-w-0`, not a pixel floor) and drops out entirely under
          400px — otherwise it pushes the live badge past the header's clip and
          the badge renders as a sliver of green border. */}
      <span className="hidden min-[400px]:inline text-xs text-gray-200 font-medium truncate min-w-0 max-w-[160px] md:max-w-[280px]" title={project.title}>
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
        onClaim={handleClaim}
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
    <App
      initialCode={project.current_code}
      liveCode={liveCode}
      viewerMode
      headerLeft={headerLeft}
      headerRight={headerRight ?? undefined}
    />
  );
}
