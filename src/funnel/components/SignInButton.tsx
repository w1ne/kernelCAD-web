// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import { getSupabase } from '../lib/supabaseClient';

export interface SignInButtonProps {
  /** Where to redirect after successful auth. Defaults to current location. */
  redirectTo?: string;
  className?: string;
  children?: React.ReactNode;
}

export function SignInButton({ redirectTo, className, children }: SignInButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = getSupabase();
    const target = redirectTo ?? window.location.href;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: target },
    });
    if (error) {
      setLoading(false);
      alert(`Sign-in failed: ${error.message}`);
    }
    // Successful OAuth redirects to Google; component unmounts.
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={
        className ??
        'inline-flex items-center gap-2 rounded-lg bg-blueprint hover:bg-blueprint-hover text-white px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors font-sans'
      }
    >
      {/* Google G mark — colours retained per Google brand guidelines */}
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.87 2.69-6.61z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.35-1.59-5.06-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.94 10.7a5.4 5.4 0 0 1 0-3.4V4.96H.96a9 9 0 0 0 0 8.08l2.98-2.34z"/>
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.34l2.58-2.58A9 9 0 0 0 .96 4.96l2.98 2.34C4.65 5.17 6.65 3.58 9 3.58z"/>
      </svg>
      {loading ? 'Signing in…' : (children ?? 'Continue with Google')}
    </button>
  );
}
