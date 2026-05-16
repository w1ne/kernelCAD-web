import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { FunnelViewer } from '../funnel/components/FunnelViewer';
import { CodePane } from '../funnel/components/CodePane';
import { SuggestionChips } from '../funnel/components/SuggestionChips';
import { ErrorPanel } from '../funnel/components/ErrorPanel';
import { SignInButton } from '../funnel/components/SignInButton';
import { useGeneration } from '../funnel/hooks/useGeneration';
import { useSession } from '../funnel/hooks/useSession';
import { fetchGeneration, saveProject, type GenerationRow } from '../funnel/lib/apiClient';

export const Route = createFileRoute('/g/$genId')({
  component: AnonGenPage,
});

function AnonGenPage() {
  const { genId } = Route.useParams();
  const navigate = useNavigate();
  const { session } = useSession();
  const [gen, setGen] = useState<GenerationRow | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const { phase, submit } = useGeneration();
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'error'>('idle');

  useEffect(() => {
    fetchGeneration(genId).then(setGen).catch(e => setLoadErr(String(e)));
  }, [genId]);

  useEffect(() => {
    if (phase.state === 'done') {
      void navigate({ to: '/g/$genId', params: { genId: phase.generationId } });
    }
  }, [phase, navigate]);

  if (loadErr) {
    return <main className="p-8 text-red-300">Failed to load: {loadErr}</main>;
  }
  if (!gen) {
    return <main className="p-8 text-neutral-400">Loading…</main>;
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
      });
      void navigate({ to: '/p/$slug', params: { slug: result.slug } });
    } catch (err) {
      setSavingState('error');
      console.error('save failed', err);
    }
  }

  const isBusy = phase.state === 'running';

  return (
    <main className="min-h-screen bg-neutral-950 text-white grid grid-rows-[auto_1fr] grid-cols-1">
      <header className="border-b border-neutral-900 px-6 py-3 flex items-center justify-between">
        <a href="/" className="text-lg font-bold">kernelCAD</a>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isBusy || savingState === 'saving' || gen.status !== 'done' || !gen.code}
            className="rounded-lg bg-white text-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {session ? (savingState === 'saving' ? 'Saving…' : 'Save this') : 'Sign in to save'}
          </button>
          {!session && <SignInButton redirectTo={window.location.href}>Sign in</SignInButton>}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-0">
        <div className="bg-neutral-900 min-h-[60vh] lg:min-h-0">
          {gen.code ? (
            <FunnelViewer code={gen.code} />
          ) : (
            <div className="p-6 text-neutral-500">No geometry — generation failed.</div>
          )}
        </div>

        <aside className="flex flex-col min-h-0 border-l border-neutral-900">
          <div className="px-6 py-4 border-b border-neutral-900">
            <p className="text-xs uppercase text-neutral-500 tracking-wide">Prompt</p>
            <p className="text-sm mt-1">{gen.prompt}</p>
          </div>

          {gen.status === 'done' && gen.code && (
            <>
              <div className="px-6 py-4 border-b border-neutral-900">
                <p className="text-xs uppercase text-neutral-500 tracking-wide mb-2">Refine</p>
                <SuggestionChips
                  suggestions={gen.suggestions}
                  onSelect={s => void submit(`${gen.prompt}\n\nNow: ${s}`)}
                  disabled={isBusy}
                />
              </div>
              <div className="flex-1 min-h-0">
                <CodePane code={gen.code} />
              </div>
            </>
          )}

          {(gen.status === 'llm_failed' ||
            gen.status === 'eval_failed' ||
            gen.status === 'timeout') && (
            <div className="p-6">
              <ErrorPanel
                code={gen.status}
                message={gen.diagnostics?.message ?? 'Unknown failure'}
                originalPrompt={gen.prompt}
                onRefine={p => void submit(p)}
                busy={isBusy}
              />
            </div>
          )}

          {gen.status === 'running' && (
            <div className="p-6 text-neutral-400 text-sm">Still running…</div>
          )}
        </aside>
      </div>
    </main>
  );
}
