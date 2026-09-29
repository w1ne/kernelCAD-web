// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { SignInButton } from '../../funnel/components/SignInButton';
import { EmailPasswordForm } from '../../funnel/components/EmailPasswordForm';
import { FunnelHeader } from '../../funnel/components/FunnelHeader';
import { OrDivider } from '../../funnel/components/SignInModal';
import { useSession } from '../../funnel/hooks/useSession';

export const Route = createFileRoute('/signin')({
  component: SignInPage,
  // Without `next`, a new sign-in goes to /connect: people who do not connect
  // an agent in their first minutes rarely come back.
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === 'string' && s.next.startsWith('/') && !s.next.startsWith('//') ? s.next : '/connect',
  }),
});

function SignInPage() {
  const { next } = Route.useSearch();
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: next as '/' });
    }
  }, [loading, session, next, navigate]);

  const redirectTo = `${window.location.origin}${next}`;
  const toConnect = next === '/connect';

  return (
    <div className="flex min-h-screen flex-col bg-bg font-sans text-fg">
      <FunnelHeader current="signin" />
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm rounded-sheet border border-border bg-surface-1 p-6 shadow-e1 sm:p-8">
          <h1 className="text-center font-serif text-heading text-fg">Sign in to kernelCAD</h1>
          <p className="mt-2 text-center text-ui text-fg-2">
            {toConnect
              ? 'Next, connect ChatGPT, Claude, Claude Code or Codex. It takes about two minutes.'
              : 'Your models are saved to your projects, and you can open them from any device.'}
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <SignInButton provider="google" redirectTo={redirectTo} />
            <SignInButton provider="github" redirectTo={redirectTo} />
          </div>

          <OrDivider />

          <EmailPasswordForm redirectTo={redirectTo} onAuthenticated={() => navigate({ to: next as '/' })} />
        </div>
      </main>
    </div>
  );
}
