// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX, KeyboardEvent } from 'react';
import { ExternalLink } from 'lucide-react';
import { buttonClass, cx } from '../../ui';
import { CopyField } from '../../funnel/components/CopyField';
import { CONNECT_CLIENTS, emphasisSegments, type ConnectClient, type ConnectClientId } from './connectClients';
import { MCP_URL } from './connectLinks';

const TABS_ID = 'connect-client';

export interface ClientPickerProps {
  readonly value: ConnectClientId;
  readonly onChange: (id: ConnectClientId) => void;
}

/**
 * The agent picker: a grid of tabs (2 columns on a phone, 3 on wider screens).
 * Arrow keys, Home and End move between agents.
 */
export function ClientPicker({ value, onChange }: ClientPickerProps): JSX.Element {
  const move = (e: KeyboardEvent<HTMLDivElement>): void => {
    const at = CONNECT_CLIENTS.findIndex((c) => c.id === value);
    const last = CONNECT_CLIENTS.length - 1;
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (at + 1) % CONNECT_CLIENTS.length
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (at - 1 + CONNECT_CLIENTS.length) % CONNECT_CLIENTS.length
          : e.key === 'Home' ? 0
            : e.key === 'End' ? last
              : -1;
    if (next < 0) return;
    e.preventDefault();
    const id = CONNECT_CLIENTS[next].id;
    onChange(id);
    document.getElementById(`${TABS_ID}-tab-${id}`)?.focus();
  };

  return (
    <div role="tablist" aria-label="Your agent" onKeyDown={move} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {CONNECT_CLIENTS.map((c) => {
        const selected = c.id === value;
        return (
          <button
            key={c.id}
            id={`${TABS_ID}-tab-${c.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${TABS_ID}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(c.id)}
            className={cx(
              'focus-ring flex min-h-touch flex-col items-start justify-center rounded-panel border px-3 py-2 text-left transition-colors duration-80',
              selected
                ? 'border-accent bg-accent-soft text-fg shadow-[inset_0_0_0_1px_var(--kc-accent)]'
                : 'border-border bg-surface-1 text-fg hover:border-border-strong hover:bg-surface-2',
            )}
          >
            <span className="text-ui font-semibold">{c.label}</span>
            <span className={cx('text-2xs', selected ? 'text-fg-2' : 'text-fg-3')}>{c.where}</span>
          </button>
        );
      })}
    </div>
  );
}

function StepText({ text }: { readonly text: string }): JSX.Element {
  return (
    <>
      {emphasisSegments(text).map((s, i) =>
        s.strong ? (
          <strong key={i} className="font-semibold text-fg">
            {s.text}
          </strong>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

/** Steps for one agent: the link or commands first, then the numbered steps. */
export function ClientPanel({ client }: { readonly client: ConnectClient }): JSX.Element {
  return (
    <div
      id={`${TABS_ID}-panel`}
      role="tabpanel"
      aria-labelledby={`${TABS_ID}-tab-${client.id}`}
      className="mt-3 rounded-panel border border-border bg-surface-1 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3">
        {client.needsUrl && <CopyField caption="MCP server URL" value={MCP_URL} copyLabel="Copy the MCP URL" />}
        {client.commands?.map((cmd) => (
          <CopyField key={cmd.value} caption={cmd.label} value={cmd.value} copyLabel={`Copy: ${cmd.label}`} />
        ))}
        {client.link && (
          <a
            href={client.link.href}
            target={client.link.href.startsWith('http') ? '_blank' : undefined}
            rel="noreferrer"
            className={cx(buttonClass(client.needsUrl ? 'secondary' : 'primary', 'lg'), 'self-start no-underline')}
          >
            {client.link.label}
            {client.link.href.startsWith('http') && <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden="true" />}
          </a>
        )}
      </div>
      <ol className="mt-4 flex flex-col gap-2.5">
        {client.steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-body text-fg-2">
            <span
              aria-hidden="true"
              className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-code text-fg-2"
            >
              {i + 1}
            </span>
            <span>
              <StepText text={step} />
            </span>
          </li>
        ))}
      </ol>
      {client.note && <p className="mt-3 text-ui text-fg-3">{client.note}</p>}
    </div>
  );
}
