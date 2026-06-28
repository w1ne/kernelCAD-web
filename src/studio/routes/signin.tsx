// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { SignInButton } from '../../funnel/components/SignInButton';
import { EmailPasswordForm } from '../../funnel/components/EmailPasswordForm';
import { useSession } from '../../funnel/hooks/useSession';

export const Route = createFileRoute('/signin')({
  component: SignInPage,
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === 'string' ? s.next : '/',
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

  return (
    <main className="min-h-screen bg-vellum text-ink font-sans flex items-center justify-center p-8">
      <div className="max-w-sm w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <svg className="w-5 h-5 text-ink" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
            <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
          </svg>
          <span className="font-serif text-lg font-medium">kernel<span className="text-blueprint">CAD</span></span>
        </div>

        <div className="rounded-xl border border-rule bg-white p-8 text-center">
          <h1 className="font-serif text-2xl font-medium text-ink">Sign in to kernelCAD</h1>
          <p className="text-ink-soft text-sm mt-2">
            Save the model you generated.
          </p>

          <div className="mt-6">
            <EmailPasswordForm
              redirectTo={`${window.location.origin}${next}`}
              onAuthenticated={() => navigate({ to: next as '/' })}
            />
          </div>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-rule" />
            <span className="text-xs text-ink-faint">or</span>
            <span className="h-px flex-1 bg-rule" />
          </div>

          <div className="flex flex-col gap-2">
            <SignInButton
              provider="google"
              redirectTo={`${window.location.origin}${next}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rule bg-white hover:bg-paper text-ink px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors font-sans"
            />
            {import.meta.env.VITE_GITHUB_AUTH_ENABLED === 'true' && (
              <SignInButton
                provider="github"
                redirectTo={`${window.location.origin}${next}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rule bg-white hover:bg-paper text-ink px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors font-sans"
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
