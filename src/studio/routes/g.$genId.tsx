import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { FunnelViewer } from '../../funnel/components/FunnelViewer';
import { CodePane } from '../../funnel/components/CodePane';
import { SuggestionChips } from '../../funnel/components/SuggestionChips';
import { ErrorPanel } from '../../funnel/components/ErrorPanel';
import { SignInButton } from '../../funnel/components/SignInButton';
import { useGeneration } from '../../funnel/hooks/useGeneration';
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
  const { phase, submit } = useGeneration();
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'error'>('idle');

  useEffect(() => {
    if (!isUuid(genId)) return;
    fetchGeneration(genId).then(setGen).catch(e => setLoadErr(String(e)));
  }, [genId]);

  useEffect(() => {
    if (phase.state === 'done') {
      void navigate({ to: '/g/$genId', params: { genId: phase.generationId } });
    }
  }, [phase, navigate]);

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
      });
      void navigate({ to: '/p/$slug', params: { slug: result.slug } });
    } catch (err) {
      setSavingState('error');
      console.error('save failed', err);
    }
  }

  const isBusy = phase.state === 'running';

  return (
    <main className="min-h-screen bg-vellum text-ink font-sans grid grid-rows-[auto_1fr] grid-cols-1">
      {/* Nav */}
      <header className="border-b border-rule px-6 py-3 flex items-center justify-between bg-vellum">
        <a href="/" className="flex items-center gap-2 font-serif text-base font-medium no-underline text-ink">
          <svg className="w-4 h-4 text-ink" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
            <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
          </svg>
          <span>kernel<span className="text-blueprint">CAD</span></span>
        </a>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isBusy || savingState === 'saving' || gen.status !== 'done' || !gen.code}
            className="rounded-lg bg-blueprint hover:bg-blueprint-hover text-white px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {session ? (savingState === 'saving' ? 'Saving…' : 'Save this') : 'Sign in to save'}
          </button>
          {!session && <SignInButton redirectTo={window.location.href}>Sign in</SignInButton>}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-0">
        {/* 3D Viewer — dark background matches brand code-bg */}
        <div className="bg-code-bg min-h-[60vh] lg:min-h-0">
          {gen.code ? (
            <FunnelViewer code={gen.code} />
          ) : (
            <div className="p-6 text-ink-faint font-mono text-sm">No geometry — generation failed.</div>
          )}
        </div>

        {/* Sidebar — vellum */}
        <aside className="flex flex-col min-h-0 border-l border-rule bg-vellum">
          <div className="px-6 py-4 border-b border-rule">
            <p className="font-mono text-[11px] text-ink-faint tracking-widest uppercase">Prompt</p>
            <p className="text-sm mt-1 text-ink">{gen.prompt}</p>
          </div>

          {gen.status === 'done' && gen.code && (
            <>
              <div className="px-6 py-4 border-b border-rule">
                <p className="font-mono text-[11px] text-ink-faint tracking-widest uppercase mb-2">Refine</p>
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
            <div className="p-6 text-ink-soft font-mono text-sm">Still running…</div>
          )}
        </aside>
      </div>
    </main>
  );
}
