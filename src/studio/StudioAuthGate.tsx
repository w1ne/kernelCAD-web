// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React from 'react';
import { useOptionalSession } from '../funnel/hooks/useSession';
import { isAuthConfigured } from '../funnel/lib/supabaseClient';
import { SignInModal } from '../funnel/components/SignInModal';

/**
 * Gates the authoring Studio (`/`, `/studio`). Anonymous users get the existing
 * sign-in window, forced open, over an inert background — they cannot reach the
 * editor until a Supabase session exists. Read-only viewer routes (`/p`, `/g`)
 * are NOT wrapped in this gate.
 *
 * When Supabase env vars are absent (plain local dev, env-less embed hosts),
 * the gate is bypassed and children render immediately so the CAD viewer works
 * without auth.
 */
export function StudioAuthGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const authConfigured = isAuthConfigured();
  const { session, loading } = useOptionalSession();

  if (!authConfigured) return <>{children}</>;

  if (loading) {
    return (
      <div
        data-testid="studio-auth-splash"
        className="min-h-screen bg-vellum"
        aria-busy="true"
      />
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-vellum">
        <SignInModal
          open
          onClose={() => {}}
          dismissable={false}
          title="Sign in to open kernelCAD Studio"
          description="kernelCAD Studio is where you build and edit models. Sign in to continue."
          footer={false}
        />
      </div>
    );
  }

  return <>{children}</>;
}
