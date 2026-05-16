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

  // Full Studio shell with the generated code preloaded. Floating overlay
  // gives one-click save + prompt context without taking real estate from
  // the workbench. The shell's own Header handles export / view modes /
  // local project management.
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <App initialCode={gen.code} />

      <div className="pointer-events-none absolute top-3 right-3 z-50 flex items-start gap-3">
        <div className="pointer-events-auto rounded-lg border border-rule bg-vellum/95 backdrop-blur px-3 py-2 shadow-sm max-w-md">
          <p className="font-mono text-[10px] text-ink-faint tracking-widest uppercase">Prompt</p>
          <p className="text-xs text-ink mt-0.5 line-clamp-2">{gen.prompt}</p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={savingState === 'saving'}
            className="rounded-lg bg-blueprint hover:bg-blueprint-hover text-white px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors font-sans shadow-sm"
          >
            {session
              ? savingState === 'saving'
                ? 'Saving…'
                : savingState === 'error'
                  ? 'Retry save'
                  : 'Save this'
              : 'Sign in to save'}
          </button>
          {!session && <SignInButton redirectTo={window.location.href}>Sign in</SignInButton>}
        </div>
      </div>
    </div>
  );
}
