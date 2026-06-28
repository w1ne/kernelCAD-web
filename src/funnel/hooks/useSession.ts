// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, isAuthConfigured } from '../lib/supabaseClient';

export interface SessionState {
  session: Session | null;
  loading: boolean;
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ session: null, loading: true });

  useEffect(() => {
    const supabase = getSupabase();
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setState({ session: data.session, loading: false });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setState({ session, loading: false });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

/**
 * Like `useSession` but safe to call when auth may not be configured.
 * Always calls hooks unconditionally (React hook rules preserved), but
 * no-ops inside the effect when `isAuthConfigured()` is false, returning
 * `{ session: null, loading: false }` immediately. Use this in components
 * that mount regardless of whether Supabase env vars are present (e.g.
 * StudioShell, StudioAuthGate) so plain local dev and env-less embed hosts
 * do not throw.
 */
export function useOptionalSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    session: null,
    loading: isAuthConfigured(),
  });

  useEffect(() => {
    if (!isAuthConfigured()) {
      setState({ session: null, loading: false });
      return;
    }

    const supabase = getSupabase();
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setState({ session: data.session, loading: false });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setState({ session, loading: false });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
