// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmailSignup } from '../../funnel/components/EmailSignup';
import { FunnelHeader } from '../../funnel/components/FunnelHeader';
import { GallerySection } from '../../funnel/components/GallerySection';
import { SignInModal } from '../../funnel/components/SignInModal';
import { useGeneration } from '../../funnel/hooks/useGeneration';
import { useOptionalSession } from '../../funnel/hooks/useSession';
import { createCheckoutSession } from '../../funnel/lib/apiClient';
import { parseGenerateQuery, shouldAutoSubmit, stripGenerateQuery } from '../../funnel/lib/heroHandoff';
import { getTurnstileToken } from '../../funnel/lib/turnstile';
import { inAppAgentEnabled } from '../agentAvailability';
import { stashWordsGeometry, wordsToGeometry } from '../wordsToGeometry';
import GenerateHero from './GenerateHero';

export const Route = createFileRoute('/generate')({
  component: GeneratePage,
});

// Stash the user's prompt across the Google OAuth round-trip so that after
// sign-in we can resume generation without making them retype.
const PENDING_PROMPT_KEY = 'kc:pendingPrompt';

interface Handoff {
  prompt: string;
  /** Build on load: `?auto=1` from the marketing site only. */
  auto: boolean;
  hadParams: boolean;
}

/** Reads `?q=` and `?auto=1` once, with the referrer at that moment. */
function readHandoff(): Handoff {
  if (typeof window === 'undefined') return { prompt: '', auto: false, hadParams: false };
  const q = parseGenerateQuery(window.location.search);
  return {
    prompt: q.prompt,
    auto: q.prompt !== '' && shouldAutoSubmit(q.auto, document.referrer),
    hadParams: q.hadParams,
  };
}

/**
 * Opens a finished run. A complete result opens right away. A partial one
 * waits on the page, so the user reads what was not checked before opening it.
 */
function useOpenResult(phase: ReturnType<typeof useGeneration>['phase']): () => void {
  const navigate = useNavigate();
  const openResult = useCallback(() => {
    if (phase.state === 'done') navigate({ to: '/g/$genId', params: { genId: phase.generationId } });
  }, [phase, navigate]);
  useEffect(() => {
    if (phase.state === 'done' && !phase.partial) openResult();
  }, [phase, openResult]);
  return openResult;
}

/** Builds a plate, bolt, or L-bracket from the prompt and opens it in Studio. */
function useWordsHandoff(): { message: string | null; open: (prompt: string) => void } {
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const open = useCallback(
    (prompt: string) => {
      const made = wordsToGeometry(prompt);
      if (!made.ok) {
        setMessage(made.message);
        return;
      }
      setMessage(null);
      stashWordsGeometry(made);
      void navigate({ to: '/' });
    },
    [navigate],
  );
  return useMemo(() => ({ message, open }), [message, open]);
}

export function GeneratePage() {
  const agentEnabled = inAppAgentEnabled();
  const { phase, events, liveCode, submit } = useGeneration();
  const { session, loading: sessionLoading } = useOptionalSession();
  const [signInOpen, setSignInOpen] = useState(false);
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [signInDismissed, setSignInDismissed] = useState<unknown>(null);
  const [handoff] = useState(readHandoff);
  const initialPrompt = handoff.prompt;
  const autoPending = useRef(handoff.auto);
  const words = useWordsHandoff();
  // The last prompt sent, for "Try again" after a failure.
  const lastPrompt = useRef('');

  const run = useCallback(
    (prompt: string) => {
      lastPrompt.current = prompt;
      void submit(prompt);
    },
    [submit],
  );

  // Signed-out visitors build without an account. With a Turnstile site key
  // they first pass the check; if that fails the request goes without a token
  // and the server decides.
  const runSignedOut = useCallback(
    async (prompt: string) => {
      lastPrompt.current = prompt;
      let token: string | undefined;
      try {
        token = await getTurnstileToken(import.meta.env.VITE_TURNSTILE_SITE_KEY);
      } catch {
        token = undefined;
      }
      void submit(prompt, undefined, undefined, undefined, undefined, token);
    },
    [submit],
  );

  const handleUpgrade = useCallback(async () => {
    // Unauthenticated rate-limit (e.g. anon path) -> push into sign-in first.
    if (!session) {
      setSignInOpen(true);
      return;
    }
    setUpgradeBusy(true);
    try {
      const { url } = await createCheckoutSession();
      window.location.href = url;
    } catch {
      // Stay on page; the user can retry. Don't swallow silently in the
      // rendered UI - surface via the panel's busy state clearing.
      setUpgradeBusy(false);
    }
  }, [session]);

  const handleSubmit = useCallback(
    (prompt: string) => {
      if (!agentEnabled) {
        words.open(prompt);
        return;
      }
      if (sessionLoading) return;
      if (!session) {
        void runSignedOut(prompt);
        return;
      }
      run(prompt);
    },
    [agentEnabled, words, session, sessionLoading, run, runSignedOut],
  );

  // The URL carried the landing page's prompt; drop it so reload and Back do
  // not build again.
  useEffect(() => {
    if (handoff.hadParams) stripGenerateQuery();
  }, [handoff.hadParams]);

  // `?auto=1` from the marketing site: build once, after the session is known.
  useEffect(() => {
    if (!autoPending.current || sessionLoading) return;
    autoPending.current = false;
    if (agentEnabled) handleSubmit(initialPrompt);
  }, [agentEnabled, sessionLoading, handleSubmit, initialPrompt]);

  // The server has no free build for this visitor: keep the prompt through
  // sign-in, and the effect below resumes it afterwards.
  const needsSignIn = phase.state === 'error' && phase.code === 'anon_limit';
  useEffect(() => {
    if (!needsSignIn) return;
    try {
      window.localStorage.setItem(PENDING_PROMPT_KEY, lastPrompt.current);
    } catch {
      // Storage unavailable (private mode) - proceed without resume.
    }
  }, [needsSignIn, phase]);

  // After OAuth returns with a session, auto-resume the stashed prompt.
  useEffect(() => {
    if (sessionLoading || !session) return;
    if (!agentEnabled) return;
    if (phase.state !== 'idle' && !needsSignIn) return;
    let pending: string | null = null;
    try {
      pending = window.localStorage.getItem(PENDING_PROMPT_KEY);
    } catch {
      return;
    }
    if (pending) {
      window.localStorage.removeItem(PENDING_PROMPT_KEY);
      lastPrompt.current = pending;
      void submit(pending);
    }
  }, [agentEnabled, sessionLoading, session, phase.state, needsSignIn, submit]);

  const openResult = useOpenResult(phase);

  const isBusy = phase.state === 'running';

  return (
    <div className="min-h-screen bg-bg font-sans text-fg">
      <FunnelHeader current="generate" />
      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        <GenerateHero
          agentEnabled={agentEnabled}
          isBusy={isBusy}
          initialPrompt={initialPrompt}
          onSubmit={handleSubmit}
          hasSession={!!session}
          sessionEmail={session?.user.email ?? null}
          sessionLoading={sessionLoading}
          phase={phase}
          events={events} liveCode={liveCode}
          upgradeBusy={upgradeBusy}
          onUpgrade={handleUpgrade}
          onSignIn={() => setSignInOpen(true)}
          onOpenResult={openResult}
          onRetry={() => handleSubmit(lastPrompt.current)}
          notice={words.message}
        />

        <GallerySection />
      </main>
      <footer className="mx-auto max-w-5xl border-t border-border px-4 py-8 sm:px-6">
        <EmailSignup />
      </footer>

      <SignInModal
        open={signInOpen || (needsSignIn && signInDismissed !== phase)}
        onClose={() => {
          setSignInOpen(false);
          setSignInDismissed(phase);
        }}
        title="Sign in to generate"
        description="Your description will be kept."
      />
    </div>
  );
}
