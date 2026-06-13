// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import {
  MCP_URL,
  CLAUDE_CODE_CMD,
  NPX_LOCAL_CMD,
  cursorDeeplink,
  vscodeDeeplink,
} from '../connect/connectLinks';

export const Route = createFileRoute('/connect')({
  component: ConnectPage,
});

type Host = 'claude-code' | 'claude-desktop' | 'chatgpt' | 'cursor' | 'vscode';

const HOSTS: { id: Host; label: string }[] = [
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'claude-desktop', label: 'Claude Desktop' },
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'vscode', label: 'VS Code' },
];

const SKILLS = [
  'Authoring',
  'Features',
  'NURBS',
  'Assemblies',
  'Kinematics',
  'From-Reference',
  'Fields',
  'Params',
];

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      className="flex items-center gap-1.5 rounded-lg border border-rule bg-vellum px-3 py-1.5 text-xs font-mono text-ink-soft transition-colors hover:border-blueprint hover:text-blueprint"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </button>
  );
}

function CommandBlock({ code, copyLabel }: { code: string; copyLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-rule bg-white px-4 py-3">
      <code className="font-mono text-sm text-ink break-all">{code}</code>
      <CopyButton text={code} label={copyLabel} />
    </div>
  );
}

function HostPanel({ host }: { host: Host }) {
  if (host === 'claude-code') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">
          Run this command in your terminal to add the kernelCAD MCP server:
        </p>
        <CommandBlock code={CLAUDE_CODE_CMD} copyLabel="Copy Claude Code command" />
        <p className="text-sm text-ink-soft">
          Then run <code className="font-mono text-xs bg-vellum border border-rule rounded px-1.5 py-0.5">/mcp</code> inside Claude Code and approve the browser sign-in.
        </p>
      </div>
    );
  }

  if (host === 'claude-desktop') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-soft">
          Requires Claude Pro or Max.
        </p>
        <ol className="space-y-2 text-sm text-ink-soft list-none">
          {[
            <>Open <strong className="text-ink font-medium">Settings</strong> → <strong className="text-ink font-medium">Connectors</strong></>,
            <>Click <strong className="text-ink font-medium">Add custom connector</strong></>,
            <>Paste the MCP URL and save</>,
            <>Sign in when prompted</>,
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-vellum border border-rule text-xs font-mono flex items-center justify-center text-ink-faint">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-2">
          <CommandBlock code={MCP_URL} copyLabel="Copy MCP URL" />
        </div>
      </div>
    );
  }

  if (host === 'chatgpt') {
    return (
      <div className="space-y-3">
        <ol className="space-y-2 text-sm text-ink-soft list-none">
          {[
            <>Open <strong className="text-ink font-medium">Settings</strong> → <strong className="text-ink font-medium">Connectors</strong></>,
            <>Enable <strong className="text-ink font-medium">Developer mode</strong></>,
            <>Click <strong className="text-ink font-medium">Add</strong> and paste the MCP URL</>,
            <>Sign in when prompted</>,
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-vellum border border-rule text-xs font-mono flex items-center justify-center text-ink-faint">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-2">
          <CommandBlock code={MCP_URL} copyLabel="Copy MCP URL" />
        </div>
      </div>
    );
  }

  if (host === 'cursor') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">
          One click to install the kernelCAD MCP server in Cursor.
        </p>
        <a
          href={cursorDeeplink()}
          aria-label="Add kernelCAD to Cursor"
          className="inline-flex items-center gap-2 rounded-xl border border-rule bg-white px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-blueprint hover:text-blueprint"
        >
          Add to Cursor
        </a>
      </div>
    );
  }

  if (host === 'vscode') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">
          One click to install the kernelCAD MCP server in VS Code.
        </p>
        <a
          href={vscodeDeeplink()}
          aria-label="Install kernelCAD in VS Code"
          className="inline-flex items-center gap-2 rounded-xl border border-rule bg-white px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-blueprint hover:text-blueprint"
        >
          Install in VS Code
        </a>
      </div>
    );
  }

  return null;
}

/**
 * Connect surface for the hosted MCP server.
 *
 * Anonymous — no sign-in required. Users point their agent tool at the
 * MCP URL; OAuth happens in-tool. Bring your own Claude = free + unlimited
 * (modeling, introspection, review). The built-in hosted agent (paid) is
 * unlocked for authenticated users automatically.
 */
function ConnectPage() {
  const [selectedHost, setSelectedHost] = useState<Host>('claude-code');

  return (
    <main className="min-h-screen bg-vellum text-ink font-sans">
      <div className="mx-auto max-w-2xl px-6 py-16">
        {/* Logo + wordmark */}
        <div className="flex items-center justify-center gap-2.5 mb-12">
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

        {/* Title + subtitle */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl font-medium text-ink mb-3">
            Connect kernelCAD to your agent
          </h1>
          <p className="text-ink-soft text-sm leading-relaxed max-w-md mx-auto">
            Point your tool at one URL — OAuth happens in-tool, no separate sign-in.
            Bring your own Claude and modeling, introspection, and review are free and
            unlimited. The built-in hosted agent (paid) handles generation for everyone else.
          </p>
        </div>

        {/* MCP URL pill */}
        <div className="rounded-xl border border-rule bg-white px-5 py-4 flex items-center justify-between gap-4 mb-8">
          <code className="font-mono text-sm text-ink truncate">{MCP_URL}</code>
          <CopyButton text={MCP_URL} label="Copy MCP URL" />
        </div>

        {/* Skills showcase */}
        <div className="mb-10">
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            {SKILLS.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-rule bg-white px-3 py-1 text-xs font-medium text-ink-soft"
              >
                {skill}
              </span>
            ))}
          </div>
          <p className="text-center text-xs text-ink-faint mt-2">
            One MCP server — all skills.
          </p>
        </div>

        {/* Host picker */}
        <div className="rounded-xl border border-rule bg-white overflow-hidden">
          {/* Tab row */}
          <div className="flex border-b border-rule overflow-x-auto" role="tablist" aria-label="Select your tool">
            {HOSTS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selectedHost === id}
                aria-controls={`panel-${id}`}
                id={`tab-${id}`}
                onClick={() => setSelectedHost(id)}
                className={[
                  'flex-1 min-w-max px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                  selectedHost === id
                    ? 'border-blueprint text-blueprint'
                    : 'border-transparent text-ink-soft hover:text-ink',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Panel */}
          <div
            id={`panel-${selectedHost}`}
            role="tabpanel"
            aria-labelledby={`tab-${selectedHost}`}
            className="p-6"
          >
            <HostPanel host={selectedHost} />
          </div>
        </div>

        {/* Power-user footnote */}
        <p className="text-center text-ink-faint text-xs mt-8">
          Power user? Run it locally, no account:{' '}
          <code className="font-mono">{NPX_LOCAL_CMD}</code>
        </p>
      </div>
    </main>
  );
}
