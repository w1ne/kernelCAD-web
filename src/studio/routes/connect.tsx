// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute } from '@tanstack/react-router';
import { useState, type JSX, type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { buttonClass, cx, SkeletonText } from '../../ui';
import { CopyField } from '../../funnel/components/CopyField';
import { FunnelHeader } from '../../funnel/components/FunnelHeader';
import { useOptionalSession } from '../../funnel/hooks/useSession';
import { ClientPanel, ClientPicker } from '../connect/ConnectClientPanel';
import { ConnectCheck, useFirstModelWatch } from '../connect/ConnectCheck';
import { connectClient, STARTER_PROMPT, type ConnectClientId } from '../connect/connectClients';
import { claudeNewChatLink, MCP_URL, NPX_LOCAL_CMD } from '../connect/connectLinks';

export const Route = createFileRoute('/connect')({
  component: ConnectPage,
  // `?client=claude-code` opens the page on that agent (links from the landing,
  // docs and the Studio). Unknown values fall back to the default agent.
  validateSearch: (s: Record<string, unknown>): { client?: ConnectClientId } => {
    const id = connectClient(s.client).id;
    return s.client === id ? { client: id } : {};
  },
});

function Section({ n, title, lead, children }: { n: number; title: string; lead?: ReactNode; children: ReactNode }): JSX.Element {
  return (
    <section aria-labelledby={`connect-step-${n}`} className="mt-10 sm:mt-12">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fg font-mono text-code-lg text-bg"
        >
          {n}
        </span>
        <h2 id={`connect-step-${n}`} className="font-serif text-heading text-fg">
          {title}
        </h2>
      </div>
      {lead && <p className="mt-2 text-body text-fg-2 sm:pl-10">{lead}</p>}
      <div className="mt-4 sm:pl-10">{children}</div>
    </section>
  );
}

/**
 * Connect page for the hosted MCP server: pick your agent, follow its steps,
 * try the starter prompt, and see the first saved model as proof it works.
 *
 * No sign-in is needed to connect: OAuth happens inside the agent. Signing in
 * here only turns on the "did it work" check. Connecting your own agent is
 * free; the built-in hosted agent is the paid part (see /pricing).
 */
function ConnectPage(): JSX.Element {
  const search = Route.useSearch();
  const [clientId, setClientId] = useState<ConnectClientId>(() => connectClient(search.client).id);
  const client = connectClient(clientId);
  const { session, loading } = useOptionalSession();
  const signedIn = !loading && !!session;
  const watch = useFirstModelWatch(signedIn);

  return (
    <div className="min-h-screen bg-bg font-sans text-fg">
      <FunnelHeader current="connect" />
      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
        <h1 lang="en" className="font-serif text-[34px] leading-[40px] font-medium tracking-tight text-fg [hyphens:auto] sm:text-section">
          Connect your agent to kernelCAD
        </h1>
        <p className="mt-3 max-w-2xl text-body text-fg-2">
          Add one URL to ChatGPT, Claude, Claude Code or Codex. Your agent then designs real CAD models, checks that they
          build, and saves them to your projects. It takes about two minutes.
        </p>
        <CopyField className="mt-6" caption="MCP server URL" value={MCP_URL} copyLabel="Copy the MCP URL" />

        <Section n={1} title="Pick your agent">
          <ClientPicker value={clientId} onChange={setClientId} />
          <ClientPanel client={client} />
        </Section>

        <Section n={2} title="Try it" lead={<>Paste this into {client.tryIn}. The agent builds the bracket and saves it.</>}>
          <CopyField value={STARTER_PROMPT} multiline copyLabel="Copy the starter prompt" />
          {client.id === 'claude' && (
            <a
              href={claudeNewChatLink(STARTER_PROMPT)}
              target="_blank"
              rel="noreferrer"
              className={cx(buttonClass('secondary', 'lg'), 'mt-3 no-underline')}
            >
              Open a Claude chat with this prompt
              <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </a>
          )}
        </Section>

        <Section n={3} title="Check it worked">
          {loading ? (
            <div className="rounded-panel border border-border bg-surface-1 p-5">
              <SkeletonText lines={2} label="Checking your sign-in" />
            </div>
          ) : (
            <ConnectCheck
              state={watch.state}
              since={watch.since}
              onRestart={watch.restart}
              signInHref={`/signin?next=${encodeURIComponent('/connect')}`}
            />
          )}
        </Section>

        <footer className="mt-14 border-t border-border pt-6 text-ui text-fg-2">
          <p>
            Connecting your own agent is free. The built-in hosted agent on{' '}
            <a href="/generate" className="text-accent underline-offset-2 hover:underline">
              /generate
            </a>{' '}
            uses a monthly allowance:{' '}
            <a href="/pricing" className="text-accent underline-offset-2 hover:underline">
              see pricing
            </a>
            .
          </p>
          <p className="mt-2">
            Run it on your machine, no account: <code className="font-mono text-code-lg text-fg">{NPX_LOCAL_CMD}</code>
          </p>
        </footer>
      </main>
    </div>
  );
}
