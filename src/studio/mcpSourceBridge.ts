// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { loadStudioScriptSource } from './scriptSource';

/** Local MCP builds replace the same script session. Keep the existing Code
 * tab synchronized as well as the viewport's existing relower subscription. */
export function subscribeMcpSource(script: string, setCode: (code: string) => void): () => void {
  if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('mcp') !== '1') return () => {};
  let stopped = false;
  let revision = 0;
  const events = new EventSource(`/__kernelcad/events?session=${encodeURIComponent(script)}`);
  events.addEventListener('source-changed', () => {
    const current = ++revision;
    void loadStudioScriptSource(script).then(source => {
      if (!stopped && current === revision) setCode(source);
    }).catch(error => console.error('MCP source refresh failed:', error));
  });
  return () => { stopped = true; events.close(); };
}
