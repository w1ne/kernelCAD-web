#!/usr/bin/env python3
"""Run the exact public MCP calls used by the manufacturing-evidence demo."""
from __future__ import annotations
import argparse, json, urllib.request, sys
from pathlib import Path

URL = 'https://mcp.kernelcad.com/mcp'
HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'User-Agent': 'kernelcad-manufacturing-evidence-demo/1.0',
}

def post(payload: dict, session: str | None = None, allow_empty: bool = False) -> tuple[str | None, dict]:
    headers = dict(HEADERS)
    if session:
        headers['mcp-session-id'] = session
    req = urllib.request.Request(URL, data=json.dumps(payload).encode(), headers=headers)
    with urllib.request.urlopen(req, timeout=180) as response:
        text = response.read().decode('utf-8', 'replace')
        session = response.headers.get('mcp-session-id') or session
    events = [json.loads(line[6:]) for line in text.splitlines() if line.startswith('data: ')]
    if not events:
        if allow_empty:
            return session, {}
        raise RuntimeError(f'No SSE JSON event returned: {text[:500]}')
    return session, events[-1]

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('tool')
    ap.add_argument('args_json')
    ap.add_argument('out')
    ns = ap.parse_args()
    session, init = post({
        'jsonrpc':'2.0','id':1,'method':'initialize',
        'params':{'protocolVersion':'2025-06-18','capabilities':{},'clientInfo':{'name':'manufacturing-evidence-demo','version':'1.0'}},
    })
    post({'jsonrpc':'2.0','method':'notifications/initialized','params':{}}, session, allow_empty=True)
    _, event = post({'jsonrpc':'2.0','id':2,'method':'tools/call','params':{'name':ns.tool,'arguments':json.loads(ns.args_json)}}, session)
    Path(ns.out).write_text(json.dumps(event, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps(event, indent=2, ensure_ascii=False))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
