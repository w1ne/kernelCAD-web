// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { z } from 'zod';
import { sharedSelectionSchema, selectionResultSchema } from '../../../shared/selection/sharedSelection';

const targetSchema = z.object({ studio_url: z.string().url(), session: z.string().min(1) });

export async function sharedSelectionTool(method: 'GET' | 'POST', input: Record<string, unknown>) {
  try {
    const target = targetSchema.parse(input);
    const base = new URL(target.studio_url);
    if (base.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
      || base.username || base.password) throw new Error('studio_url must be a local HTTP Studio origin');
    const selection = method === 'POST' ? sharedSelectionSchema.parse(input.selection) : undefined;
    const model_generation = method === 'POST' ? z.number().int().nonnegative().parse(input.model_generation) : undefined;
    const url = new URL('/__kernelcad/selection', base);
    url.searchParams.set('session', target.session);
    const response = await fetch(url, {
      method, redirect: 'error', signal: AbortSignal.timeout(5000),
      ...(method === 'POST' ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ selection, model_generation }) } : {}),
    });
    const body = await response.json();
    if (!response.ok) {
      const failure = z.object({ error: z.string() }).safeParse(body);
      throw new Error(failure.success ? failure.data.error : `Studio returned HTTP ${response.status}`);
    }
    return selectionResultSchema.parse(body);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
