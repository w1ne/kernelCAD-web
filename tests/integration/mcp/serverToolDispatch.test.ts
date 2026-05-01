// tests/integration/mcp/serverToolDispatch.test.ts
//
// I2 sentinel: assert symmetric set parity between the names in
// `server.ts:TOOLS` (advertised surface) and the call-handler switch's
// case statements (actual dispatch). Drift in either direction breaks
// agent discoverability or routing.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('MCP server: TOOLS array ↔ call-handler switch parity (rc.9 review I2)', () => {
  it('every advertised tool has a switch case and vice versa', () => {
    const src = readFileSync(
      resolve(__dirname, '../../../src/mcp/server.ts'),
      'utf8',
    );

    // Extract names from the TOOLS array. Pattern: `name: 'tool_name',`
    // Bound the search to the TOOLS array region to avoid matching
    // unrelated `name:` properties elsewhere in the file.
    const toolsStart = src.indexOf('const TOOLS');
    if (toolsStart === -1) throw new Error('TOOLS array not found in server.ts');
    // Find the closing `];` that ends the TOOLS array (handle nested arrays
    // by tracking bracket depth from the first `[` after `const TOOLS`).
    let depth = 0, toolsEnd = -1;
    for (let i = toolsStart; i < src.length; i++) {
      if (src[i] === '[') depth++;
      else if (src[i] === ']') {
        depth--;
        if (depth === 0) { toolsEnd = i; break; }
      }
    }
    if (toolsEnd === -1) throw new Error('Could not locate end of TOOLS array');
    const toolsBlock = src.slice(toolsStart, toolsEnd);

    // Tool entries are formatted with `name: 'tool_name',` at exactly 4-space
    // indent (start of a top-level array entry). Match only that — anchoring
    // to the line start avoids false positives from `name:` properties nested
    // inside inputSchema (e.g. `param_name:` at deeper indents) and from
    // `'top'`-style enum values used in face_name schemas.
    const toolNameRe = /^ {4}name:\s*'([a-z_]+)'/gm;
    const toolNames = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = toolNameRe.exec(toolsBlock)) !== null) toolNames.add(m[1]);

    // Extract names from `case 'tool_name':` anywhere in the file (the switch
    // is the only place such cases appear in server.ts).
    const caseRe = /case\s+'([a-z_]+)':/g;
    const caseNames = new Set<string>();
    while ((m = caseRe.exec(src)) !== null) caseNames.add(m[1]);

    const inToolsNotSwitch = [...toolNames].filter(n => !caseNames.has(n)).sort();
    const inSwitchNotTools = [...caseNames].filter(n => !toolNames.has(n)).sort();

    expect(inToolsNotSwitch).toEqual([]);
    expect(inSwitchNotTools).toEqual([]);
    // Sanity: at least 13 tools (rc.9 baseline). If this is below 13, the
    // extraction probably broke and matched nothing.
    expect(toolNames.size).toBeGreaterThanOrEqual(13);
  });
});
