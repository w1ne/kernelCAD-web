import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { PromptBox } from '../../funnel/components/PromptBox';
import { useGeneration } from '../../funnel/hooks/useGeneration';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  const { phase, events, submit } = useGeneration();
  const navigate = useNavigate();

  useEffect(() => {
    if (phase.state === 'done') {
      navigate({ to: '/g/$genId', params: { genId: phase.generationId } });
    }
  }, [phase, navigate]);

  const isBusy = phase.state === 'running';

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-900 px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-lg font-bold tracking-tight">kernelCAD</a>
        <nav className="text-sm text-neutral-400 flex gap-4">
          <a href="/studio" className="hover:text-white">Studio</a>
          <a href="/me" className="hover:text-white">Your projects</a>
        </nav>
      </header>
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Tell AI what to build. Get a CAD model.
        </h1>
        <p className="text-neutral-400 mt-3 text-lg">
          Type a sentence. We generate a STEP-grade parametric 3D model in seconds.
        </p>
        <div className="mt-8">
          <PromptBox onSubmit={submit} disabled={isBusy} />
        </div>
        {phase.state === 'running' && (
          <div className="mt-6 text-sm text-neutral-400">
            <p>Working… {events.length} events received</p>
            <p className="font-mono text-xs mt-2 line-clamp-1">
              {phase.lastEvent.kind === 'tool_call' && `→ ${phase.lastEvent.name}`}
              {phase.lastEvent.kind === 'tool_result' && `← ${phase.lastEvent.name} ok=${phase.lastEvent.ok}`}
              {phase.lastEvent.kind === 'status' && `… ${phase.lastEvent.phase}`}
            </p>
          </div>
        )}
        {phase.state === 'error' && (
          <div className="mt-6 rounded-lg border border-red-700 bg-red-950 p-4 text-red-200">
            <p className="font-medium">Generation failed: {phase.code}</p>
            <p className="text-sm mt-1">{phase.message}</p>
          </div>
        )}
      </section>
    </main>
  );
}
