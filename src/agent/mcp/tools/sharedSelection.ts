// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { z } from 'zod';
import { sharedSelectionItemSchema, sharedSelectionSchema, selectionResultSchema, type SharedSelectionItem } from '../../../shared/selection/sharedSelection';

const targetSchema = z.object({ studio_url: z.string().url(), session: z.string().min(1) });

export async function sharedSelectionTool(method: 'GET' | 'POST', input: Record<string, unknown>) {
  try {
    return await sendSelection(method, input);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function sendSelection(method: 'GET' | 'POST', input: Record<string, unknown>) {
  const target = targetSchema.parse(input);
  const base = localStudioUrl(target.studio_url);
  const selection = method === 'POST' ? sharedSelectionSchema.parse(input.selection) : undefined;
  const selections = method === 'POST'
    ? (input.selections === undefined ? undefined : z.array(sharedSelectionItemSchema.unwrap()).parse(input.selections))
    : undefined;
  const model_generation = method === 'POST' ? z.number().int().nonnegative().parse(input.model_generation) : undefined;
  return postSelection(base, target.session, method, selection, selections, model_generation, null);
}

function localStudioUrl(studioUrl: string): URL {
  const base = new URL(studioUrl);
  const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  if (base.protocol !== 'http:' || !localHost || base.username || base.password) {
    throw new Error('studio_url must be a local HTTP Studio origin');
  }
  return base;
}

function selectionUrl(base: URL, session: string): URL {
  const url = new URL('/__kernelcad/selection', base);
  url.searchParams.set('session', session);
  return url;
}

async function postSelection(
  base: URL, session: string, method: 'GET' | 'POST', selection: ReturnType<typeof sharedSelectionSchema.parse> | undefined,
  selections: SharedSelectionItem[] | undefined,
  model_generation: number | undefined, face_signature: null,
) {
  const url = selectionUrl(base, session);
  const response = await fetch(url, {
    method, redirect: 'error', signal: AbortSignal.timeout(5000),
    ...(method === 'POST' ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ selection, ...(selections !== undefined ? { selections } : {}), model_generation, face_signature }) } : {}),
  });
  const body = await response.json();
  if (!response.ok) {
    const failure = z.object({ error: z.string() }).safeParse(body);
    throw new Error(failure.success ? failure.data.error : `Studio returned HTTP ${response.status}`);
  }
  return selectionResultSchema.parse(body);
}
