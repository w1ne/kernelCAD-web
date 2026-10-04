// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { parseArgs } from './run';

describe('parseArgs', () => {
  it('samples per type, defaults to Anthropic, and never agrees to publish by default', () => {
    const o = parseArgs(['--generation', '3', '--editing', '2', '--run-dir', '/tmp/r'], { USER: 'me' });
    expect(o.selection).toEqual({ generation: 3, editing: 2 });
    expect(o.runDir).toBe('/tmp/r');
    expect(o.apiKeyEnv).toBe('ANTHROPIC_API_KEY');
    expect(o.meta).toMatchObject({ submitter: 'me', agree: false });
    expect(o.editFallback).toBe('none');
    expect(o.prices).toBeUndefined();
  });

  it('explicit task ids override sampling; an OpenAI-compatible base URL switches the key env', () => {
    const o = parseArgs(['--tasks', '101, 201', '--generation', '5', '--base-url', 'https://x/v1'], {});
    expect(o.selection).toEqual({ ids: ['101', '201'] });
    expect(o.apiKeyEnv).toBe('OPENAI_API_KEY');
  });

  it('validates flag values', () => {
    expect(() => parseArgs(['--workers', '0'], {})).toThrow(/--workers/);
    expect(() => parseArgs(['--edit-fallback', 'copy'], {})).toThrow(/--edit-fallback/);
    expect(() => parseArgs(['--price-in', '3'], {})).toThrow(/go together/);
    expect(parseArgs(['--price-in', '3', '--price-out', '15'], {}).prices).toEqual({ inPerMTok: 3, outPerMTok: 15 });
    expect(() => parseArgs(['--notes', 'x'.repeat(501)], {})).toThrow(/500/);
  });

  it('reads the official-gate Python from the environment', () => {
    expect(parseArgs(['--official-check'], { CADGENBENCH_PYTHON: '/venv/bin/python' }).python).toBe('/venv/bin/python');
  });
});
