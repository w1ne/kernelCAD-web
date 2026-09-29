// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import App from '../App';
import { SignInButton } from '../../funnel/components/SignInButton';
import { useOptionalSession } from '../../funnel/hooks/useSession';
import { fetchGeneration, saveProject, type GenerationRow } from '../../funnel/lib/apiClient';
import { PageState, type PageStateAction } from '../components/Shared/PageState';
import { useBoundedLoad, type LoadState } from './-useProjectLiveUpdates';

export const Route = createFileRoute('/g/$genId')({
  component: AnonGenPage,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s: string | undefined): boolean {
  return typeof s === 'string' && UUID_RE.test(s);
}

const NEW_PROMPT: PageStateAction = { label: 'Start a new prompt', href: '/generate', primary: true };
const OPEN_GALLERY: PageStateAction = { label: 'Open gallery', href: '/gallery' };

/** Every state before the model shows: invalid link, loading, slow, not
 *  found, timed out, failed, still running, or a generation that failed. */
function GenerationPageState({ valid, gen, loadState, err, onRetry }: {
  valid: boolean;
  gen: GenerationRow | null;
  loadState: LoadState;
  err: string | null;
  onRetry: () => void;
}) {
  const retry: PageStateAction = { label: 'Try again', onClick: onRetry, primary: true };
  if (!valid) {
    return (
      <PageState
        tone="error"
        title="This generation link is not valid"
        message="The previous run may not have completed. Start again from a new prompt."
        actions={[NEW_PROMPT, OPEN_GALLERY]}
      />
    );
  }
  if (loadState === 'not_found') {
    return (
      <PageState
        tone="error"
        title="This generation does not exist"
        message="Check the link, or start again from a new prompt."
        actions={[NEW_PROMPT, OPEN_GALLERY]}
      />
    );
  }
  if (loadState === 'timeout' || loadState === 'error') {
    return (
      <PageState
        tone="error"
        title="The generation did not load"
        message={loadState === 'timeout'
          ? 'The server did not answer in time. Check your connection and try again.'
          : 'Something went wrong while loading the generation. Try again in a moment.'}
        detail={loadState === 'error' ? err : null}
        actions={[retry, OPEN_GALLERY]}
      />
    );
  }
  if (!gen) {
    return (
      <PageState
        tone="loading"
        title="Loading the generation…"
        message={loadState === 'slow' ? 'This takes longer than usual. You can keep waiting or try again.' : undefined}
        actions={loadState === 'slow' ? [{ label: 'Try again', onClick: onRetry }] : []}
      />
    );
  }
  if (gen.status === 'running') {
    return (
      <PageState
        tone="loading"
        title="The model is still generating"
        message="This usually takes under a minute. Refresh to check again."
        actions={[{ label: 'Refresh', onClick: onRetry, primary: true }]}
      />
    );
  }
  return (
    <PageState
      tone="error"
      title="This generation did not produce a model"
      message={gen.diagnostics?.message ?? 'Try again with a new or more specific prompt.'}
      detail={`status: ${gen.status}`}
      actions={[NEW_PROMPT, OPEN_GALLERY]}
    />
  );
}

function AnonGenPage() {
  const { genId } = Route.useParams();
  const navigate = useNavigate();
  const { session } = useOptionalSession();
  const valid = isUuid(genId);
  const { row: gen, err, loadState, retry } = useBoundedLoad(genId, fetchGeneration, valid);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'error'>('idle');

  if (!valid || !gen || gen.status !== 'done' || !gen.code) {
    return <GenerationPageState valid={valid} gen={gen} loadState={loadState} err={err} onRetry={retry} />;
  }

  async function handleSave() {
    if (!session) {
      void navigate({ to: '/signin', search: { next: window.location.pathname } });
      return;
    }
    if (!gen?.code) return;
    setSavingState('saving');
    try {
      const result = await saveProject({
        generationId: gen.id,
        anonId: gen.anon_id ?? undefined,
        title: gen.prompt.slice(0, 60),
        code: gen.code,
        parameters: [],
        privacy: 'public_unlisted',
      });
      void navigate({ to: '/p/$slug', params: { slug: result.slug } });
    } catch (err) {
      setSavingState('error');
      console.error('save failed', err);
    }
  }

  const headerLeft = (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-2xs uppercase tracking-widest text-fg-3 font-mono shrink-0">
        Prompt
      </span>
      <span className="text-xs text-fg truncate max-w-[420px]" title={gen.prompt}>
        {gen.prompt}
      </span>
    </div>
  );

  const headerRight = (
    <div className="flex items-center gap-2 min-w-0">
      <span className="hidden md:inline text-2xs text-fg-3 font-mono truncate max-w-[190px]">
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
