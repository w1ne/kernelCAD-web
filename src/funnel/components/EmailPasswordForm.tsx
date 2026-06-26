// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
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
        <label htmlFor="kc-auth-email" className="block text-xs font-medium text-ink-soft mb-1">
          Email
        </label>
        <input
          id="kc-auth-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-lg border border-rule bg-white px-3 py-2 text-sm text-ink focus:border-blueprint focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="kc-auth-password" className="block text-xs font-medium text-ink-soft mb-1">
          Password
        </label>
        <input
          id="kc-auth-password"
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded-lg border border-rule bg-white px-3 py-2 text-sm text-ink focus:border-blueprint focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-600">{error}</p>
      )}
      {notice && (
        <p role="status" className="text-xs text-green-700">{notice}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-lg bg-blueprint hover:bg-blueprint-hover text-white px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors font-sans"
      >
        {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>

      <p className="text-xs text-ink-faint text-center">
        {mode === 'signin' ? (
          <>
            No account?{' '}
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setNotice(null); }}
              className="text-blueprint hover:underline font-medium"
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
              className="text-blueprint hover:underline font-medium"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </form>
  );
}
