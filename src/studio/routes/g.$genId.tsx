// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import App from '../App';
import { SignInButton } from '../../funnel/components/SignInButton';
import { useSession } from '../../funnel/hooks/useSession';
import { fetchGeneration, saveProject, type GenerationRow } from '../../funnel/lib/apiClient';

export const Route = createFileRoute('/g/$genId')({
  component: AnonGenPage,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s: string | undefined): boolean {
  return typeof s === 'string' && UUID_RE.test(s);
}

function AnonGenPage() {
  const { genId } = Route.useParams();
  const navigate = useNavigate();
  const { session } = useSession();
  const [gen, setGen] = useState<GenerationRow | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(() =>
    isUuid(genId)
      ? null
      : 'Invalid generation link. The previous run may not have completed — try generating again from the home page.',
  );
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'error'>('idle');

  useEffect(() => {
    if (!isUuid(genId)) return;
    fetchGeneration(genId).then(setGen).catch(e => setLoadErr(String(e)));
  }, [genId]);

  if (loadErr) {
    return (
      <main className="min-h-screen bg-vellum font-sans p-8">
        <p className="text-copper font-mono text-sm">Failed to load: {loadErr}</p>
      </main>
    );
  }
  if (!gen) {
    return (
      <main className="min-h-screen bg-vellum font-sans p-8">
        <p className="text-ink-faint font-mono text-sm">Loading…</p>
      </main>
    );
  }

  async function handleSave() {
    if (!session) {
      void navigate({ to: '/signin', search: { next: window.location.pathname } });
      return;
    }
    if (!gen!.code) return;
    setSavingState('saving');
    try {
      const result = await saveProject({
        generationId: gen!.id,
        anonId: gen!.anon_id ?? undefined,
        title: gen!.prompt.slice(0, 60),
        code: gen!.code,
        parameters: [],
        privacy: 'public_unlisted',
      });
      void navigate({ to: '/p/$slug', params: { slug: result.slug } });
    } catch (err) {
      setSavingState('error');
      console.error('save failed', err);
    }
  }

  if (gen.status !== 'done' || !gen.code) {
    return (
      <main className="min-h-screen bg-vellum font-sans p-8">
        <p className="text-ink font-mono text-sm">
          {gen.status === 'running' && 'Generation still running — refresh in a few seconds.'}
          {gen.status !== 'running' && `Generation failed (${gen.status}). Try a new prompt.`}
        </p>
      </main>
    );
  }

  const headerLeft = (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-mono shrink-0">
        Prompt
      </span>
      <span className="text-xs text-gray-300 truncate max-w-[420px]" title={gen.prompt}>
        {gen.prompt}
      </span>
    </div>
  );

  const headerRight = (
    <div className="flex items-center gap-2 min-w-0">
      <span className="hidden md:inline text-[10px] text-gray-500 font-mono truncate max-w-[190px]">
        Free saves are public by link.
      </span>
      {session ? (
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={savingState === 'saving'}
          className="px-3 py-1 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors"
        >
          {savingState === 'saving' ? 'Saving…' : savingState === 'error' ? 'Retry save' : 'Save'}
        </button>
      ) : (
        <SignInButton
          redirectTo={typeof window !== 'undefined' ? window.location.href : undefined}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors"
        >
          Sign in to save
        </SignInButton>
      )}
    </div>
  );

  return <App initialCode={gen.code} headerLeft={headerLeft} headerRight={headerRight} />;
}
