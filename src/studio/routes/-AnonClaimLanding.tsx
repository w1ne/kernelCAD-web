// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { SignInButton } from '../../funnel/components/SignInButton';
import { EmailPasswordForm } from '../../funnel/components/EmailPasswordForm';
import {
  anonClaimErrorKind,
  claimAnonProjects,
  type AnonClaimErrorKind,
  type AnonClaimResult,
} from '../../funnel/lib/apiClient';
import { ANON_CLAIM_ERROR_TEXT } from './-anonClaim';

const OAUTH_CLASS =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rule bg-white hover:bg-paper text-ink px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors font-sans';

export interface AnonClaimLandingProps {
  /** Claim token from the `t` query param. */
  token: string | undefined;
  session: Session | null;
  loading: boolean;
  /** Called once with the number of projects moved. */
  onClaimed: (result: AnonClaimResult) => void;
  /** Injectable for tests. */
  claim?: (token: string) => Promise<AnonClaimResult>;
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-vellum text-ink font-sans flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-sm w-full rounded-xl border border-rule bg-white p-6 sm:p-8 text-center">
        <h1 className="font-serif text-2xl font-medium text-ink">{title}</h1>
        {children}
      </div>
    </main>
  );
}

/** /claim?t=<token>: sign in if needed, then move the anonymous projects. */
export function AnonClaimLanding({
  token,
  session,
  loading,
  onClaimed,
  claim = claimAnonProjects,
}: AnonClaimLandingProps): ReactNode {
  const [error, setError] = useState<AnonClaimErrorKind | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!token || !session || started.current) return;
    started.current = true;
    claim(token).then(onClaimed, (err: unknown) => setError(anonClaimErrorKind(err)));
  }, [token, session, claim, onClaimed]);

  if (!token) {
    return <Card title="Keep your projects"><p className="text-ink-soft text-sm mt-3">{ANON_CLAIM_ERROR_TEXT.invalid}</p></Card>;
  }
  if (loading) {
    return <Card title="Keep your projects"><p className="text-ink-faint font-mono text-sm mt-3">Loading…</p></Card>;
  }
  if (!session) {
    const here = typeof window !== 'undefined' ? window.location.href : '/';
    return (
      <Card title="Keep your projects">
        <p className="text-ink-soft text-sm mt-2">
          Sign in and the projects from your chat move to your account.
        </p>
        <div className="mt-6">
          <EmailPasswordForm redirectTo={here} />
        </div>
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-rule" />
          <span className="text-xs text-ink-faint">or</span>
          <span className="h-px flex-1 bg-rule" />
        </div>
        <div className="flex flex-col gap-2">
          <SignInButton provider="google" redirectTo={here} className={OAUTH_CLASS} />
          <SignInButton provider="github" redirectTo={here} className={OAUTH_CLASS} />
        </div>
      </Card>
    );
  }
  if (error) {
    return (
      <Card title="Could not move your projects">
        <p role="alert" className="text-ink-soft text-sm mt-3">{ANON_CLAIM_ERROR_TEXT[error]}</p>
        <a href="/me" className="mt-5 inline-block text-blueprint underline text-sm">Go to your projects</a>
      </Card>
    );
  }
  return <Card title="Keep your projects"><p className="text-ink-faint font-mono text-sm mt-3">Moving your projects…</p></Card>;
}
