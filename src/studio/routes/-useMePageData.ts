// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { Session } from '@supabase/supabase-js';
import { useSession } from '../../funnel/hooks/useSession';
import {
  fetchMyPlan,
  listMyProjects,
  type MyPlan,
  type ProjectRow,
} from '../../funnel/lib/apiClient';

export interface MePageData {
  session: Session | null;
  loading: boolean;
  projects: ProjectRow[] | null;
  plan: MyPlan | null;
  planErr: string | null;
  err: string | null;
}

/** Session guard plus project/plan loading for the /me page. */
export function useMePageData(): MePageData {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [plan, setPlan] = useState<MyPlan | null>(null);
  const [planErr, setPlanErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: '/signin', search: { next: '/me' } });
    }
  }, [loading, session, navigate]);

  useEffect(() => {
    if (session) {
      listMyProjects().then(setProjects).catch(e => setErr(String(e)));
      fetchMyPlan().then(setPlan).catch(e => setPlanErr(String(e)));
    }
  }, [session]);

  return { session, loading, projects, plan, planErr, err };
}
