// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { Session } from '@supabase/supabase-js';
import { useSession } from '../../funnel/hooks/useSession';
import {
  deleteProject,
  fetchMyPlan,
  listMyProjects,
  renameProject,
  setProjectPrivacy,
  type MyPlan,
  type MyProjectRow,
  type ProjectPrivacy,
} from '../../funnel/lib/apiClient';
import { patchProject, removeProject } from './-meProjects';

export type SettablePrivacy = Extract<ProjectPrivacy, 'public_unlisted' | 'private'>;

/** Owner actions on one project. Each updates the list when it succeeds and
 *  rejects with the server's message when it fails. */
export interface ProjectActions {
  rename: (project: MyProjectRow, title: string) => Promise<void>;
  remove: (project: MyProjectRow) => Promise<void>;
  setPrivacy: (project: MyProjectRow, privacy: SettablePrivacy) => Promise<void>;
  /** Id of the project with an action in flight, for the card's busy look. */
  busyId: string | null;
}

export interface MePageData {
  session: Session | null;
  loading: boolean;
  projects: MyProjectRow[] | null;
  plan: MyPlan | null;
  planErr: string | null;
  err: string | null;
  /** Load the project list again (the error state's retry). */
  reload: () => void;
  actions: ProjectActions;
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Session guard plus project/plan loading and project actions for /me. */
export function useMePageData(): MePageData {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<MyProjectRow[] | null>(null);
  const [plan, setPlan] = useState<MyPlan | null>(null);
  const [planErr, setPlanErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: '/signin', search: { next: '/me' } });
    }
  }, [loading, session, navigate]);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    listMyProjects()
      .then(rows => { if (!cancelled) { setProjects(rows); setErr(null); } })
      .catch(e => { if (!cancelled) setErr(errorText(e)); });
    return () => { cancelled = true; };
  }, [userId, attempt]);

  useEffect(() => {
    if (!userId) return;
    fetchMyPlan().then(setPlan).catch(e => setPlanErr(errorText(e)));
  }, [userId]);

  const reload = useCallback(() => {
    setErr(null);
    setProjects(null);
    setAttempt(a => a + 1);
  }, []);

  const run = useCallback(async (id: string, work: () => Promise<void>) => {
    setBusyId(id);
    try {
      await work();
    } finally {
      setBusyId(null);
    }
  }, []);

  const rename = useCallback((p: MyProjectRow, title: string) => run(p.id, async () => {
    const saved = await renameProject(p.id, title);
    setProjects(list => list && patchProject(list, p.id, saved));
  }), [run]);

  const remove = useCallback((p: MyProjectRow) => run(p.id, async () => {
    await deleteProject(p.id);
    setProjects(list => list && removeProject(list, p.id));
  }), [run]);

  const setPrivacy = useCallback((p: MyProjectRow, privacy: SettablePrivacy) => run(p.id, async () => {
    const res = await setProjectPrivacy(p.slug, privacy);
    setProjects(list => list && patchProject(list, p.id, { privacy: res.privacy }));
  }), [run]);

  return {
    session,
    loading,
    projects,
    plan,
    planErr,
    err,
    reload,
    actions: { rename, remove, setPrivacy, busyId },
  };
}
