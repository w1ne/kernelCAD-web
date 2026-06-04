export const MCP_URL = 'https://mcp.kernelcad.com/mcp';

export const CLAUDE_CODE_CMD = `claude mcp add --transport http kernelcad ${MCP_URL}`;

export const NPX_LOCAL_CMD = 'npx kernelcad mcp';

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
