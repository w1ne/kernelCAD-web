// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/agentLookup.ts
//
// Text-protocol lookup tools for an AgentClient that has no native tool
// calling. A connected agent normally calls `lookup_api` and
// `lookup_authoring_skill` over MCP before it writes a script; the eval loop
// only sees text, so this decorator lets a model do the same: it replies with
// one `LOOKUP_API: <keywords>` or `LOOKUP_SKILL: <keywords>` line, the
// decorator answers from the same handlers the MCP tools use, and the final
// reply (the one carrying a code fence) is handed back to the runner.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listApiTool } from '../src/agent/mcp/tools/listApi';
import { lookupAuthoringSkill } from '../src/agent/skills/authoringSkillLookup';
import type { AgentClient, AgentMessage, AgentResponse } from './types';

export const LOOKUP_ADDENDUM = [
  '## Lookup tools',
  'You cannot call tools, but you can look things up before you write the script.',
  'To look up the script API (global functions, Shape / Sketch / path methods, selector keys), reply with ONLY one line:',
  'LOOKUP_API: <keywords>',
  'To read authoring guidance (conventions, recipes, how a feature behaves), reply with ONLY one line:',
  'LOOKUP_SKILL: <keywords>',
  'You will receive the result and may look up again. Use at most {max} lookups, then reply with the final script in one ```typescript block.',
  'If you already know the API well enough, skip lookups and reply with the script directly.',
].join('\n');

const LOOKUP_LINE = /^\s*LOOKUP_(API|SKILL):\s*(.+?)\s*$/m;
const RESULT_CHAR_CAP = 14_000;

export type LookupHandler = (kind: 'API' | 'SKILL', query: string) => Promise<string>;

/** Default handlers: the same functions the MCP tools run. */
export function defaultLookupHandler(skillRoot = resolve('src/agent/skills/kernelcad-authoring')): LookupHandler {
  const skillMd = readFileSync(resolve(skillRoot, 'SKILL.md'), 'utf8');
  return async (kind, query) => {
    if (kind === 'API') {
      const out = await listApiTool({ query });
      const lines: string[] = [];
      for (const [group, value] of Object.entries(out)) {
        if (!Array.isArray(value)) continue;
        for (const e of value as Array<{ name: string; signature: string; description: string }>) {
          lines.push(`[${group}] ${e.name} :: ${e.signature}\n    ${e.description}`);
        }
      }
      const extra = Object.entries(out).filter(([, v]) => !Array.isArray(v) && typeof v === 'object' && v !== null && !('acceptingKinds' in (v as object)) && !('tools' in (v as object)));
      for (const [k, v] of extra) lines.push(`[${k}] ${JSON.stringify(v)}`);
      return lines.length ? lines.join('\n') : 'No entries matched.';
    }
    return lookupAuthoringSkill(skillMd, { query }).text;
  };
}

export class LookupAgentClient implements AgentClient {
  lookups = 0;
  constructor(
    private readonly inner: AgentClient,
    private readonly handler: LookupHandler,
    private readonly maxLookups = 4,
  ) {}

  async generate(opts: Parameters<AgentClient['generate']>[0]): Promise<AgentResponse> {
    const addendum = LOOKUP_ADDENDUM.replace('{max}', String(this.maxLookups));
    const system = `${opts.system}\n\n${addendum}`;
    const messages: AgentMessage[] = [...opts.messages];
    let tokensIn = 0;
    let tokensOut = 0;
    for (let i = 0; ; i++) {
      const r = await this.inner.generate({ ...opts, system, messages });
      tokensIn += r.tokens_in;
      tokensOut += r.tokens_out;
      const m = r.text.includes('```') ? null : LOOKUP_LINE.exec(r.text);
      if (!m || i >= this.maxLookups) return { text: r.text, tokens_in: tokensIn, tokens_out: tokensOut };
      this.lookups++;
      const kind = m[1] as 'API' | 'SKILL';
      let result: string;
      try {
        result = await this.handler(kind, m[2]);
      } catch (e) {
        result = `lookup failed: ${e instanceof Error ? e.message : String(e)}`;
      }
      if (result.length > RESULT_CHAR_CAP) result = `${result.slice(0, RESULT_CHAR_CAP)}\n…(truncated)`;
      messages.push({ role: 'assistant', content: r.text });
      messages.push({ role: 'user', content: `RESULT of LOOKUP_${kind}: ${m[2]}\n\n${result}\n\nContinue: look up again or reply with the final script.` });
    }
  }
}
