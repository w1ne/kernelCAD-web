// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// MCP tool: server-side cookbook execution. Resolves a cookbook snippet by id
// or BM25 query (same ranking as lookup_cookbook), evaluates its body via
// evaluate_script, and optionally opens the same script in Studio.
//
// Built to stop ChatGPT industry-demo stalls: agents used to call
// lookup_cookbook, narrate “built the assembly”, and never call
// evaluate_script / open_in_studio. Prefer this tool when you need
// evaluate (+ optional Studio) in one step; empty lookup is not a stop —
// freehand-author instead.

import { randomBytes } from 'node:crypto';
import { search, type Snippet } from '../../cookbook/index';
import { evaluateScriptTool, type EvaluateScriptOutput } from './evaluateScript';
import { getCookbookSnippets } from './lookupCookbook';

export type ExecuteCookbookStage = 'resolve' | 'evaluate' | 'open_in_studio';

export interface ExecuteCookbookInput {
  /** Cookbook snippet id (e.g. gt2-timing-belt-drive). */
  id?: string;
  /** When id is omitted: BM25 pick top hit (same ranking as lookup_cookbook). */
  query?: string;
  /**
   * After a green full evaluate, call open_in_studio on the same script.
   * Default false. Hosted MCP wires this; local stdio returns a concrete
   * open_in_studio-stage error unless a hook is injected (tests).
   */
  openInStudio?: boolean;
  /**
   * Fast capture-only evaluate (same as evaluate_script dryRun).
   * dryRun:true is NOT evidence the cookbook lowers / builds under OCCT,
   * passes DFM, or is safe to publish — finish with dryRun:false (default)
   * before claiming success or opening Studio.
   */
  dryRun?: boolean;
}

export interface ExecuteCookbookOpenInStudioResult {
  ok: boolean;
  error?: string;
  stage?: 'open_in_studio';
  [key: string]: unknown;
}

export interface ExecuteCookbookOutput {
  ok: boolean;
  cookbookId?: string;
  title?: string;
  /** Full evaluate_script result (same shape). */
  evaluate?: EvaluateScriptOutput;
  /** Present when openInStudio was requested. */
  openInStudio?: ExecuteCookbookOpenInStudioResult;
  /** Short id for logs / correlation. */
  executionId: string;
  error?: string;
  stage?: ExecuteCookbookStage;
  /**
   * Snippet body used for evaluate / Studio. Hosted MCP may reuse this for
   * open_in_studio without re-fetching the cookbook.
   */
  code?: string;
  /**
   * Echoed when dryRun:true succeeded at the evaluate stage — reminds agents
   * that dryRun is NOT evidence of a real build.
   */
  dryRunNotEvidence?: true;
}

/** Optional Studio opener (hosted MCP / tests). Unset → open_in_studio stage error. */
export type ExecuteCookbookOpenInStudioFn = (args: {
  code: string;
  title: string;
  cookbookId: string;
}) => Promise<ExecuteCookbookOpenInStudioResult>;

let openInStudioHook: ExecuteCookbookOpenInStudioFn | null = null;

/** Test / hosted-gateway seam: wire open_in_studio without new geometry APIs. */
export function setExecuteCookbookOpenInStudioHook(
  hook: ExecuteCookbookOpenInStudioFn | null,
): void {
  openInStudioHook = hook;
}

function newExecutionId(): string {
  return randomBytes(4).toString('hex');
}

function fail(
  executionId: string,
  stage: ExecuteCookbookStage,
  error: string,
  extra: Partial<ExecuteCookbookOutput> = {},
): ExecuteCookbookOutput {
  return { ok: false, executionId, stage, error, ...extra };
}

function resolveSnippet(input: ExecuteCookbookInput):
  | { ok: true; snippet: Snippet }
  | { ok: false; error: string } {
  const id = typeof input.id === 'string' ? input.id.trim() : '';
  const query = typeof input.query === 'string' ? input.query.trim() : '';

  if (!id && !query) {
    return { ok: false, error: 'provide id or query (non-empty string)' };
  }

  const snippets = getCookbookSnippets();

  if (id) {
    const snippet = snippets.find((s) => s.id === id);
    if (!snippet) {
      return { ok: false, error: `unknown cookbook id: ${id}` };
    }
    return { ok: true, snippet };
  }

  const hits = search(query, snippets, 1);
  if (hits.length === 0) {
    return {
      ok: false,
      error: `no cookbook match for query (empty lookup is not a stop — freehand-author instead): ${query}`,
    };
  }
  return { ok: true, snippet: hits[0].snippet };
}

function buildEvaluateBase(args: {
  executionId: string;
  snippet: Snippet;
  code: string;
  evaluate: EvaluateScriptOutput;
  dryRun: boolean;
}): ExecuteCookbookOutput {
  const { executionId, snippet, code, evaluate, dryRun } = args;
  return {
    ok: evaluate.ok,
    cookbookId: snippet.id,
    title: snippet.title,
    evaluate,
    executionId,
    code,
    ...(dryRun ? { dryRunNotEvidence: true as const } : {}),
    ...(!evaluate.ok
      ? {
          stage: 'evaluate' as const,
          error: dryRun
            ? 'cookbook dryRun evaluate failed (dryRun:true is NOT evidence of a real OCCT build)'
            : 'cookbook evaluate failed',
        }
      : {}),
  };
}

function studioFail(
  base: ExecuteCookbookOutput,
  error: string,
): ExecuteCookbookOutput {
  return {
    ...base,
    ok: false,
    stage: 'open_in_studio',
    error,
    openInStudio: { ok: false, stage: 'open_in_studio', error },
  };
}

async function attachOpenInStudio(
  base: ExecuteCookbookOutput,
  snippet: Snippet,
  code: string,
  dryRun: boolean,
  evaluateOk: boolean,
): Promise<ExecuteCookbookOutput> {
  // dryRun success is NOT evidence — refuse Studio on dry runs.
  if (dryRun) {
    return studioFail(
      base,
      'openInStudio requires a full (non-dryRun) green evaluate; dryRun:true is NOT evidence the cookbook builds under OCCT',
    );
  }

  if (!evaluateOk) {
    return {
      ...base,
      openInStudio: {
        ok: false,
        stage: 'open_in_studio',
        error: 'skipped open_in_studio because evaluate was not green',
      },
    };
  }

  if (openInStudioHook) {
    try {
      const openInStudio = await openInStudioHook({
        code,
        title: snippet.title,
        cookbookId: snippet.id,
      });
      if (!openInStudio.ok) {
        return studioFail(base, openInStudio.error ?? 'open_in_studio failed');
      }
      return { ...base, openInStudio };
    } catch (err) {
      return studioFail(base, err instanceof Error ? err.message : String(err));
    }
  }

  // Local stdio / vendor child: no Studio persistence here. Keep overall ok
  // from evaluate so a vendor-only pin still closes the ChatGPT "never
  // evaluate" stall; hosted MCP intercepts openInStudio:true and replaces
  // this deferred marker via openInStudioTool.
  return {
    ...base,
    openInStudio: {
      ok: false,
      stage: 'open_in_studio',
      deferred: true,
      error:
        'open_in_studio not wired in this process (hosted MCP gateway fulfills openInStudio:true after evaluate)',
    },
  };
}

/**
 * Resolve a cookbook snippet, evaluate its body, optionally open in Studio.
 * Reuses lookupCookbook inventory + evaluateScriptTool; does not invent geometry APIs.
 */
export async function executeCookbookTool(
  input: ExecuteCookbookInput,
): Promise<ExecuteCookbookOutput> {
  const executionId = newExecutionId();
  const wantStudio = input.openInStudio === true;
  const dryRun = input.dryRun === true;

  const resolved = resolveSnippet(input);
  if (!resolved.ok) {
    return fail(executionId, 'resolve', resolved.error);
  }

  const { snippet } = resolved;
  const code = snippet.body;

  let evaluate: EvaluateScriptOutput;
  try {
    evaluate = await evaluateScriptTool({ code, dryRun: dryRun || undefined });
  } catch (err) {
    return fail(executionId, 'evaluate', err instanceof Error ? err.message : String(err), {
      cookbookId: snippet.id,
      title: snippet.title,
      code,
    });
  }

  const base = buildEvaluateBase({ executionId, snippet, code, evaluate, dryRun });
  if (!wantStudio) return base;
  return attachOpenInStudio(base, snippet, code, dryRun, evaluate.ok);
}
