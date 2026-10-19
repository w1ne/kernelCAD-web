// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  MCP_URL,
  CLAUDE_PLUGIN_CMD,
  CODEX_LOGIN_CMD,
  CODEX_PLUGIN_INSTALL_CMD,
  CODEX_PLUGIN_MARKETPLACE_CMD,
  GEMINI_EXTENSION_CMD,
  GROK_PLUGIN_INSTALL_CMD,
  GROK_PLUGIN_MARKETPLACE_CMD,
  NPX_LOCAL_CMD,
  cursorDeeplink,
  vscodeDeeplink,
} from './connectLinks';

describe('connectLinks', () => {
  it('MCP_URL is the hosted MCP server URL', () => {
    expect(MCP_URL).toBe('https://mcp.kernelcad.com/mcp');
  });

  it('CLAUDE_PLUGIN_CMD installs the Claude Code plugin from the kernelCAD marketplace', () => {
    expect(CLAUDE_PLUGIN_CMD).toContain('claude plugin install');
    expect(CLAUDE_PLUGIN_CMD).toContain('kernelcad');
    expect(CLAUDE_PLUGIN_CMD).toContain('w1ne/kernelCAD-web');
  });

  it('points every plugin installer at the kernelCAD marketplace', () => {
    expect(CODEX_PLUGIN_MARKETPLACE_CMD).toBe('codex plugin marketplace add w1ne/kernelCAD-web');
    expect(CODEX_PLUGIN_INSTALL_CMD).toBe('codex plugin add kernelcad@kernelcad');
    expect(CODEX_LOGIN_CMD).toBe('codex mcp login kernelcad');
    expect(GEMINI_EXTENSION_CMD).toContain('gemini extensions install https://github.com/w1ne/kernelCAD-web');
    expect(GROK_PLUGIN_MARKETPLACE_CMD).toBe('grok plugin marketplace add w1ne/kernelCAD-web');
    expect(GROK_PLUGIN_INSTALL_CMD).toBe('grok plugin install kernelcad --trust');
  });

  it('NPX_LOCAL_CMD is the npx command', () => {
    expect(NPX_LOCAL_CMD).toBe('npx kernelcad mcp');
  });

  it('cursorDeeplink starts with correct prefix and encodes MCP URL in base64', () => {
    const link = cursorDeeplink();
    const prefix = 'cursor://anysphere.cursor-deeplink/mcp/install?name=kernelcad&config=';
    expect(link.startsWith(prefix)).toBe(true);
    const b64 = link.slice(prefix.length);
    const decoded = atob(b64);
    expect(decoded).toBe('{"url":"https://mcp.kernelcad.com/mcp"}');
  });

  it('vscodeDeeplink starts with vscode:mcp/install? and encodes correct JSON', () => {
    const link = vscodeDeeplink();
    expect(link.startsWith('vscode:mcp/install?')).toBe(true);
    const qs = link.slice('vscode:mcp/install?'.length);
    const decoded = decodeURIComponent(qs);
    const parsed = JSON.parse(decoded);
    expect(parsed).toEqual({
      name: 'kernelcad',
      type: 'http',
      url: 'https://mcp.kernelcad.com/mcp',
    });
  });
});
