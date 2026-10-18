// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { CONNECT_CLIENTS, DEFAULT_CLIENT, STARTER_PROMPT, connectClient, emphasisSegments } from './connectClients';
import {
  CLAUDE_PLUGIN_CMD,
  CODEX_LOGIN_CMD,
  CODEX_PLUGIN_INSTALL_CMD,
  CODEX_PLUGIN_MARKETPLACE_CMD,
  claudeNewChatLink,
} from './connectLinks';
import { findNewProject } from './firstModelWatch';

describe('connect clients', () => {
  it('covers every agent with a plugin or a hosted-MCP connection path', () => {
    expect(CONNECT_CLIENTS.map((c) => c.id)).toEqual([
      'chatgpt',
      'claude',
      'claude-code',
      'codex',
      'gemini',
      'grok',
      'cursor',
      'vscode',
    ]);
  });

  it('gives every agent a way to install: the URL, a command or an install link', () => {
    for (const c of CONNECT_CLIENTS) {
      expect(c.steps.length, c.id).toBeGreaterThan(0);
      expect(c.needsUrl || (c.commands?.length ?? 0) > 0 || !!c.link, c.id).toBe(true);
    }
  });

  it('opens the web clients on their connector settings pages', () => {
    expect(connectClient('chatgpt').link?.href).toMatch(/^https:\/\/chatgpt\.com\//);
    expect(connectClient('claude').link?.href).toBe('https://claude.ai/settings/connectors');
  });

  it('installs Claude Code from the plugin marketplace', () => {
    expect(connectClient('claude-code').commands?.map((c) => c.value)).toEqual([CLAUDE_PLUGIN_CMD]);
  });

  it('installs Codex from the plugin marketplace and signs in with OAuth', () => {
    expect(connectClient('codex').commands?.map((c) => c.value)).toEqual([
      CODEX_PLUGIN_MARKETPLACE_CMD,
      CODEX_PLUGIN_INSTALL_CMD,
      CODEX_LOGIN_CMD,
    ]);
  });

  it('installs the Gemini extension and the Grok Build plugin', () => {
    expect(connectClient('gemini').commands?.length).toBe(1);
    expect(connectClient('grok').commands?.map((c) => c.value)).toEqual([
      'grok plugin marketplace add w1ne/kernelCAD-web',
      'grok plugin install kernelcad --trust',
    ]);
  });

  it('falls back to the default agent for unknown ?client= values', () => {
    expect(connectClient('nope').id).toBe(DEFAULT_CLIENT);
    expect(connectClient(undefined).id).toBe(DEFAULT_CLIENT);
    expect(connectClient('codex').id).toBe('codex');
  });

  it('asks the agent to open the starter model in Studio, which saves it', () => {
    expect(STARTER_PROMPT).toMatch(/wall bracket for a 30 mm/i);
    expect(STARTER_PROMPT).toMatch(/open it in kernelCAD Studio/);
    expect(STARTER_PROMPT).toMatch(/saved to my projects/);
  });

  it('prefills a new Claude chat with the prompt', () => {
    const link = claudeNewChatLink('a b&c');
    expect(link).toBe('https://claude.ai/new?q=a%20b%26c');
  });

  it('splits **bold** labels out of step text', () => {
    expect(emphasisSegments('Open **Settings → Connectors** and click **Add**.')).toEqual([
      { text: 'Open ', strong: false },
      { text: 'Settings → Connectors', strong: true },
      { text: ' and click ', strong: false },
      { text: 'Add', strong: true },
      { text: '.', strong: false },
    ]);
  });
});

describe('findNewProject', () => {
  const since = Date.parse('2026-09-29T10:00:00Z');
  const row = (slug: string, updated_at: string) => ({ slug, title: slug, updated_at });

  it('ignores projects saved before the watch started', () => {
    expect(findNewProject([row('old', '2026-09-29T09:59:59Z')], since)).toBeNull();
  });

  it('returns the most recent project saved after the watch started', () => {
    const rows = [row('a', '2026-09-29T10:01:00Z'), row('b', '2026-09-29T10:03:00Z'), row('old', '2026-09-28T10:00:00Z')];
    expect(findNewProject(rows, since)?.slug).toBe('b');
  });

  it('never counts a row with an unreadable timestamp', () => {
    expect(findNewProject([row('bad', 'not a date')], since)).toBeNull();
  });
});
