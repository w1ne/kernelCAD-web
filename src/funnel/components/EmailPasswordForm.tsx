// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import { buttonClass } from '../../ui';
import { getSupabase } from '../lib/supabaseClient';

export interface EmailPasswordFormProps {
  /** Where to land after a successful sign-in. */
  redirectTo: string;
  /** Called after a session is established. Defaults to navigating to
   * `redirectTo` so the app reloads with the persisted session (mirrors the
   * OAuth redirect UX). Injectable for tests. */
  onAuthenticated?: () => void;
}

type Mode = 'signin' | 'signup';

/**
 * Email + password authentication, an alternative to the OAuth buttons. Sign-in
 * resolves a session immediately (no email round-trip) which is what makes a
 * pre-seeded demo account usable by reviewers. Sign-up creates an account; if
 * the project requires email confirmation the user is told to check their inbox.
 */
export function EmailPasswordForm({ redirectTo, onAuthenticated }: EmailPasswordFormProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const navigate = onAuthenticated ?? (() => window.location.assign(redirectTo));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    const supabase = getSupabase();

    if (mode === 'signin') {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (err) { setError(err.message); return; }
      if (data?.session) { navigate(); return; }
      setError('Sign-in did not return a session. Please try again.');
      return;
    }

    const { data, error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (data?.session) { navigate(); return; }
    // No session => email confirmation required.
    setNotice('Account created. Check your email to confirm, then sign in.');
    setMode('signin');
  }

  return (
    <form onSubmit={handleSubmit} className="text-left space-y-3" noValidate>
      <div>
        <label htmlFor="kc-auth-email" className="mb-1 block text-ui font-medium text-fg-2">
          Email
        </label>
        <input
          id="kc-auth-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="focus-ring h-control-lg w-full rounded-control border border-border-strong bg-surface-1 px-3 text-body text-fg"
        />
      </div>
      <div>
        <label htmlFor="kc-auth-password" className="mb-1 block text-ui font-medium text-fg-2">
          Password
        </label>
        <input
          id="kc-auth-password"
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="focus-ring h-control-lg w-full rounded-control border border-border-strong bg-surface-1 px-3 text-body text-fg"
        />
      </div>

      {error && (
        <p role="alert" className="text-ui text-danger">{error}</p>
      )}
      {notice && (
        <p role="status" className="text-ui text-ok">{notice}</p>
      )}

      <button type="submit" disabled={loading} className={`${buttonClass('primary', 'lg')} w-full`}>
        {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>

      <p className="text-center text-ui text-fg-2">
        {mode === 'signin' ? (
          <>
            No account?{' '}
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setNotice(null); }}
              className="focus-ring rounded-control font-medium text-accent hover:underline"
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have one?{' '}
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setNotice(null); }}
              className="focus-ring rounded-control font-medium text-accent hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </form>
  );
}
