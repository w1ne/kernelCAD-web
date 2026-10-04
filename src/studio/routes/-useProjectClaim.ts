// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { claimProject, type ProjectRow } from '../../funnel/lib/apiClient';
import { CLAIM_AFTER_SIGN_IN_PARAM } from './-anonClaim';

export interface ProjectClaimState {
  claimed: boolean;
  claiming: boolean;
  /** Header "Save to my projects": claim and stay on the page. */
  onClaim: () => void;
  /** Banner: claim, then land on /me with the moved-projects notice. */
  onBannerClaim: () => void;
}

/** Claim state for /p/:slug. Also runs the banner claim once when the page
 *  returns from the banner's sign-in with `?claim=1`. */
export function useProjectClaim(
  slug: string,
  session: Session | null,
  project: ProjectRow | null | undefined,
): ProjectClaimState {
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const navigate = useNavigate();

  const claim = useCallback(async (): Promise<boolean> => {
    setClaiming(true);
    try {
      const { claimed: ok } = await claimProject(slug);
      setClaimed(true);
      return ok;
    } catch {
      // Leave the button available to retry.
      return false;
    } finally {
      setClaiming(false);
    }
  }, [slug]);

  const bannerClaim = useCallback(async () => {
    if (await claim()) void navigate({ to: '/me', search: { moved: 1 } });
  }, [claim, navigate]);

  const autoClaimStarted = useRef(false);
  useEffect(() => {
    if (autoClaimStarted.current || !session || !project || project.owner_id != null) return;
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get(CLAIM_AFTER_SIGN_IN_PARAM) !== '1') return;
    autoClaimStarted.current = true;
    url.searchParams.delete(CLAIM_AFTER_SIGN_IN_PARAM);
    window.history.replaceState(window.history.state, '', url.toString());
    void bannerClaim();
  }, [session, project, bannerClaim]);

  return {
    claimed,
    claiming,
    onClaim: () => { void claim(); },
    onBannerClaim: () => { void bannerClaim(); },
  };
}
