// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// "Your projects" with no projects yet: the two ways to start.
import type { ReactNode } from 'react';
import { ArrowRight, PlugZap, Sparkles } from 'lucide-react';
import { buttonClass, cx } from '../../ui';
import { MCP_URL } from '../connect/connectLinks';
import { CopyField } from '../../funnel/components/CopyField';

function StartPath({ icon, tone, step, title, children }: {
  icon: ReactNode;
  tone: 'accent' | 'agent';
  step: string;
  title: string;
  children: ReactNode;
}): ReactNode {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-panel border border-border bg-surface-1 p-5 md:p-6">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cx(
            'flex size-10 shrink-0 items-center justify-center rounded-full [&>svg]:size-5',
            tone === 'agent' ? 'bg-agent-soft text-agent-fg' : 'bg-accent-soft text-accent',
          )}
        >
          {icon}
        </span>
        <div>
          <p className="text-2xs font-medium uppercase tracking-wide text-fg-3">{step}</p>
          <h3 className="text-title text-fg">{title}</h3>
        </div>
      </div>
      {children}
    </section>
  );
}

export function MeEmptyState(): ReactNode {
  return (
    <div data-testid="me-empty-state" className="mt-8">
      <div className="max-w-2xl">
        <h2 className="font-serif text-heading text-fg">Start your first project</h2>
        <p className="mt-2 text-body text-fg-2">
          Every model you make lands here, with its revisions. Come back any time to open it,
          change it, or continue it in your chat.
        </p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <StartPath icon={<PlugZap strokeWidth={1.75} />} tone="accent" step="Recommended" title="Connect your agent">
          <p className="text-ui text-fg-2">
            Add kernelCAD to the chat agent you already use. Ask it for a part; the project shows up here.
          </p>
          <CopyField value={MCP_URL} copyLabel="Copy MCP server URL" />
          <a href="/connect" className="focus-ring mt-auto inline-flex items-center gap-1 self-start rounded-control text-ui font-medium text-accent no-underline hover:underline max-md:min-h-touch">
            Setup steps for your agent <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </a>
        </StartPath>
        <StartPath icon={<Sparkles strokeWidth={1.75} />} tone="agent" step="No setup" title="Try the hosted agent">
          <p className="text-ui text-fg-2">
            Describe a part in plain words. The agent writes the model, checks it, and saves it to your projects.
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <a href="/generate" className={cx(buttonClass('agent', 'lg'), 'no-underline max-md:h-touch')}>
              Describe a part
            </a>
            <a href="/studio" className="focus-ring rounded-control text-ui text-fg-2 underline decoration-dotted underline-offset-4 hover:text-fg max-md:inline-flex max-md:min-h-touch max-md:items-center">
              Or open an empty Studio
            </a>
          </div>
        </StartPath>
      </div>
    </div>
  );
}
