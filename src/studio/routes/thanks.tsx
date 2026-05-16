import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/thanks')({
  component: ThanksPage,
});

function ThanksPage() {
  return (
    <main className="min-h-screen bg-vellum text-ink font-sans">
      <div className="max-w-[1040px] mx-auto px-10 py-7">
        <nav className="flex justify-between items-center pb-24">
          <a href="/" className="flex items-center gap-2.5 font-serif text-lg font-medium no-underline text-ink">
            <svg className="w-5 h-5 text-ink" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
              <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
            </svg>
            <span>kernel<span className="text-blueprint">CAD</span></span>
          </a>
          <div className="flex gap-6 font-mono text-xs text-ink-soft tracking-wider">
            <a href="/" className="text-ink-soft hover:text-blueprint no-underline">home</a>
            <a href="https://github.com/w1ne/kernelCAD-web" className="text-ink-soft hover:text-blueprint no-underline">github</a>
          </div>
        </nav>

        <header className="text-center pb-16">
          <h1 className="font-serif text-7xl font-medium leading-[0.95] tracking-tight mb-7">
            You're <span className="text-blueprint italic">in</span>.
          </h1>
          <p className="text-xl text-ink-soft max-w-xl mx-auto leading-relaxed">
            We'll email you when the next major version ships. That's it. No drip campaigns, no spam.
          </p>
          <div className="mt-10">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-blueprint px-5 py-3 text-base font-medium text-white hover:bg-blueprint-hover transition-colors font-sans"
            >
              Try the prompt →
            </a>
          </div>
        </header>
      </div>
    </main>
  );
}
