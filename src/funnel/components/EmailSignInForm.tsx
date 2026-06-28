// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import { getSupabase } from '../lib/supabaseClient';

export function EmailSignInForm({ redirectTo }: { redirectTo?: string }): JSX.Element {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo ?? window.location.href },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <p className="text-sm text-ink-soft mt-2">Check your inbox for a sign-in link.</p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="rounded-lg border border-rule bg-white px-3 py-2 text-sm text-ink"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-ink hover:bg-ink/90 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {busy ? 'Sending…' : 'Send magic link'}
      </button>
      {error && <p className="text-xs text-copper">{error}</p>}
    </form>
  );
}
