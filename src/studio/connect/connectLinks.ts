// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export const MCP_URL = 'https://mcp.kernelcad.com/mcp';

export const NPX_LOCAL_CMD = 'npx kernelcad mcp';

/**
 * One-line plugin installs. Each plugin carries the hosted MCP server and the
 * four kernelCAD skills, so it replaces a separate `mcp add` command.
 */
export const CLAUDE_PLUGIN_CMD = 'claude plugin install kernelcad --marketplace w1ne/kernelCAD-web';

export const CODEX_PLUGIN_MARKETPLACE_CMD = 'codex plugin marketplace add w1ne/kernelCAD-web';
export const CODEX_PLUGIN_INSTALL_CMD = 'codex plugin add kernelcad@kernelcad';
export const CODEX_LOGIN_CMD = 'codex mcp login kernelcad';

export const GEMINI_EXTENSION_CMD =
  'gemini extensions install https://github.com/w1ne/kernelCAD-web --consent --auto-update';

export const GROK_PLUGIN_MARKETPLACE_CMD = 'grok plugin marketplace add w1ne/kernelCAD-web';
export const GROK_PLUGIN_INSTALL_CMD = 'grok plugin install kernelcad --trust';

/** Settings pages where the web clients add a custom MCP server. */
export const CHATGPT_CONNECTORS_URL = 'https://chatgpt.com/#settings/Connectors';
export const CLAUDE_CONNECTORS_URL = 'https://claude.ai/settings/connectors';

/** A new Claude chat with `prompt` already in the message box. */
export function claudeNewChatLink(prompt: string): string {
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}

/**
 * Cursor deeplink to install the kernelCAD MCP server.
 * Format: cursor://anysphere.cursor-deeplink/mcp/install?name=<n>&config=<base64(JSON)>
 */
export function cursorDeeplink(): string {
  const config = btoa(JSON.stringify({ url: MCP_URL }));
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=kernelcad&config=${config}`;
}

/**
 * VS Code deeplink to install the kernelCAD MCP server.
 * Format: vscode:mcp/install?<urlencoded JSON.stringify({name,type:'http',url})>
 */
export function vscodeDeeplink(): string {
  const payload = JSON.stringify({ name: 'kernelcad', type: 'http', url: MCP_URL });
  return `vscode:mcp/install?${encodeURIComponent(payload)}`;
}
