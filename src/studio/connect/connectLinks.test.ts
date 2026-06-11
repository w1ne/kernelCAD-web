// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  MCP_URL,
  CLAUDE_CODE_CMD,
  NPX_LOCAL_CMD,
  cursorDeeplink,
  vscodeDeeplink,
} from './connectLinks';

describe('connectLinks', () => {
  it('MCP_URL is the hosted MCP server URL', () => {
    expect(MCP_URL).toBe('https://mcp.kernelcad.com/mcp');
  });

  it('CLAUDE_CODE_CMD includes the MCP URL', () => {
    expect(CLAUDE_CODE_CMD).toContain('https://mcp.kernelcad.com/mcp');
    expect(CLAUDE_CODE_CMD).toContain('claude mcp add');
    expect(CLAUDE_CODE_CMD).toContain('kernelcad');
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
