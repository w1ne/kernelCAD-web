import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white p-8">
      <h1 className="text-4xl font-bold">kernelCAD</h1>
      <p className="text-neutral-400 mt-2">
        Phase 2B placeholder. Prompt funnel arrives in Task 3.
      </p>
      <p className="text-neutral-500 text-sm mt-4">
        Existing surfaces: <a href="/studio" className="underline">/studio</a> ·{' '}
        <a href="/demo-player" className="underline">/demo-player</a>
      </p>
    </main>
  );
}
