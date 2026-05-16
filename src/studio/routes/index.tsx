import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect } from 'react';
import { PromptBox } from '../../funnel/components/PromptBox';
import { EmailSignup } from '../../funnel/components/EmailSignup';
import { useGeneration } from '../../funnel/hooks/useGeneration';
import { useSession } from '../../funnel/hooks/useSession';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

// Stash the user's prompt across the Google OAuth round-trip so that after
// sign-in we can resume generation without making them retype.
const PENDING_PROMPT_KEY = 'kc:pendingPrompt';

function LandingPage() {
  const { phase, events, submit } = useGeneration();
  const { session, loading: sessionLoading } = useSession();
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    (prompt: string) => {
      if (!session) {
        try {
          window.localStorage.setItem(PENDING_PROMPT_KEY, prompt);
        } catch {
          // Storage unavailable (private mode) — proceed without resume.
        }
        void navigate({ to: '/signin', search: { next: '/' } });
        return;
      }
      void submit(prompt);
    },
    [session, navigate, submit],
  );

  // After OAuth returns with a session, auto-resume the stashed prompt.
  useEffect(() => {
    if (sessionLoading || !session) return;
    if (phase.state !== 'idle') return;
    let pending: string | null = null;
    try {
      pending = window.localStorage.getItem(PENDING_PROMPT_KEY);
    } catch {
      return;
    }
    if (pending) {
      window.localStorage.removeItem(PENDING_PROMPT_KEY);
      void submit(pending);
    }
  }, [sessionLoading, session, phase.state, submit]);

  useEffect(() => {
    if (phase.state === 'done') {
      navigate({ to: '/g/$genId', params: { genId: phase.generationId } });
    }
  }, [phase, navigate]);

  const isBusy = phase.state === 'running';

  return (
    <main className="min-h-screen bg-vellum text-ink font-sans">
      <div className="max-w-[1040px] mx-auto px-10 py-7">
        {/* Nav — matches marketing site structure */}
        <nav className="flex justify-between items-center pb-24">
          <a href="/" className="flex items-center gap-2.5 font-serif text-lg font-medium no-underline text-ink">
            <svg className="w-5 h-5 text-ink" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
              <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
            </svg>
            <span>kernel<span className="text-blueprint">CAD</span></span>
          </a>
          <div className="flex gap-6 font-mono text-xs text-ink-soft tracking-wider">
            <a href="/me" className="text-ink-soft hover:text-blueprint no-underline transition-colors">your projects</a>
            <a href="https://github.com/w1ne/kernelCAD-web" className="text-ink-soft hover:text-blueprint no-underline transition-colors">github</a>
          </div>
        </nav>

        {/* Hero */}
        <header className="text-center pb-18 pt-0">
          <h1 className="font-serif text-8xl font-medium leading-[0.95] tracking-tight mb-7">
            Words to <span className="text-blueprint italic">geometry</span>.
          </h1>
          <p className="text-xl text-ink-soft max-w-xl mx-auto mb-4 leading-relaxed">
            Describe a part in plain English. Get a parametric, STEP-grade 3D model.
          </p>

          <div className="font-mono text-xs text-ink-faint tracking-widest inline-flex gap-3.5 mb-10">
            <span className="text-ink-soft">prompt</span>
            <span className="opacity-50">·</span>
            <span className="text-ink-soft">code</span>
            <span className="opacity-50">·</span>
            <span className="text-ink-soft">geometry</span>
            <span className="opacity-50">·</span>
            <span className="text-ink-soft">STEP/STL</span>
          </div>

          {/* Prompt box */}
          <div className="mt-2 max-w-2xl mx-auto">
            <PromptBox onSubmit={handleSubmit} disabled={isBusy} />
            {!session && !sessionLoading && (
              <p className="mt-3 text-xs text-ink-faint font-mono tracking-wide">
                Sign in is required — Generate will prompt you to continue with Google.
              </p>
            )}
          </div>

          {/* Running status */}
          {phase.state === 'running' && (
            <div className="mt-6 text-sm text-ink-soft font-mono">
              <p>working — {events.length} events</p>
              <p className="text-xs mt-2 truncate opacity-70">
                {phase.lastEvent.kind === 'tool_call' && `→ ${phase.lastEvent.name}`}
                {phase.lastEvent.kind === 'tool_result' && `← ${phase.lastEvent.name} ok=${phase.lastEvent.ok}`}
                {phase.lastEvent.kind === 'status' && `… ${phase.lastEvent.phase}`}
              </p>
            </div>
          )}

          {/* Error */}
          {phase.state === 'error' && (
            <div className="mt-6 mx-auto max-w-2xl rounded-lg border border-copper bg-vellum-soft p-4 text-ink text-left">
              <p className="font-serif font-medium text-lg">Generation didn't finish</p>
              <p className="font-mono text-xs text-copper mt-1 tracking-widest uppercase">{phase.code}</p>
              <p className="text-sm text-ink-soft mt-2">{phase.message}</p>
            </div>
          )}
        </header>

        {/* Email opt-in — fallback signal collection until the prompt funnel
            reaches "fully working slice" status. Remove when generation
            success-rate + retention metrics make this redundant. */}
        <EmailSignup />
      </div>
    </main>
  );
}
