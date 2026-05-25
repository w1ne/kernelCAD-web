import { createFileRoute } from '@tanstack/react-router';
import { useSession } from '../../funnel/hooks/useSession';
import { SignInButton } from '../../funnel/components/SignInButton';
import { ConnectClaudeDesktop } from '../components/Connect/ConnectClaudeDesktop';

export const Route = createFileRoute('/connect')({
  component: ConnectPage,
});

/**
 * Connect surface for hosted MCP onboarding.
 *
 * Reached via `app.kernelcad.com/connect` (the homepage "Use with Claude
 * Desktop →" CTA, Studio toolbar, etc.). Hooks into the existing
 * useSession() pattern: signed-in users see the connect flow, anonymous
 * users see the same sign-in CTA pattern as /me does.
 */
function ConnectPage() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <main className="min-h-screen bg-vellum text-ink font-sans p-8">
        <p className="text-ink-faint font-mono text-sm">Loading…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-vellum text-ink font-sans flex items-center justify-center p-8">
        <div className="max-w-sm w-full">
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <svg
              className="w-5 h-5 text-ink"
              viewBox="0 0 84 84"
              fill="none"
              aria-label="kernelCAD"
            >
              <path
                d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z"
                fill="currentColor"
              />
            </svg>
            <span className="font-serif text-lg font-medium">
              kernel<span className="text-blueprint">CAD</span>
            </span>
          </div>

          <div className="rounded-xl border border-rule bg-white p-8 text-center">
            <h1 className="font-serif text-2xl font-medium text-ink">
              Connect kernelCAD to Claude Desktop
            </h1>
            <p className="text-ink-soft text-sm mt-2">
              Sign in to generate a hosted MCP token. Connect your own Claude
              and generation is unlimited — modeling, introspection, and review
              tools all run free. Paid plans cover only public project hosting
              and kernelCAD's own hosted agents.
            </p>
            <div className="mt-6 flex justify-center">
              <SignInButton redirectTo={`${window.location.origin}/connect`} />
            </div>
            <p className="text-ink-faint text-xs mt-4">
              Power user? Skip the hosted kernel and run it locally — no account,
              no token:{' '}
              <code className="font-mono text-ink-soft">npx kernelcad mcp</code>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return <ConnectClaudeDesktop userEmail={session.user.email ?? ''} />;
}
