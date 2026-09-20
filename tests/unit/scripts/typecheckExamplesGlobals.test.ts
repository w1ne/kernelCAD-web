import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  API_SOURCE_PATH,
  SHIM_ONLY_GLOBALS,
  USER_GLOBALS_SOURCE_PATH,
  WORKER_SOURCE_PATH,
  buildWrapperCode,
  buildWrapperPreamble,
  missingWorkerGlobals,
  parseKernelCadApiGlobals,
  parseWorkerShimGlobals,
} from '../../../scripts/typecheckExamples';

// Drift sentinel for the wrapper typechecker (gap #8): every global the
// browser worker injects into a `.kcad.ts` body must be declared by the
// generated wrapper preamble, or the wrapper silently under-checks scripts
// (or dies with "Cannot find name <global>").
describe('typecheckExamples globals drift sentinel', () => {
  const apiNames = parseKernelCadApiGlobals(readFileSync(API_SOURCE_PATH, 'utf8'));
  const workerNames = parseWorkerShimGlobals(
    readFileSync(WORKER_SOURCE_PATH, 'utf8'),
    readFileSync(USER_GLOBALS_SOURCE_PATH, 'utf8'),
  );
  const preamble = buildWrapperPreamble(apiNames, '/tmp/kcad-typecheck-examples-test');

  it('parses the KernelCadApi member names from the interface', () => {
    expect(apiNames).toEqual(expect.arrayContaining(['box', 'cylinder', 'sphere', 'param', 'path', 'assembly']));
    expect(apiNames.length).toBeGreaterThan(30);
  });

  it('parses every global name injected by the worker shim', () => {
    expect(workerNames).toEqual(
      expect.arrayContaining([
        'replicad',
        'startSketch',
        'makeCompound',
        'fillet',
        'chamfer',
        'sketchOnFace',
        'extrude',
        'param',
        'box',
        'cylinder',
        'sphere',
        'Sketcher',
        'sketcher',
      ]),
    );
  });

  it('declares every worker-shim global in the wrapper preamble', () => {
    expect(missingWorkerGlobals(workerNames, apiNames)).toEqual([]);
    for (const name of workerNames) {
      expect(preamble).toContain(`declare const ${name}:`);
    }
  });

  it('documents shim-only globals as any with a TODO list', () => {
    const shimOnly = workerNames.filter((name) => !apiNames.includes(name)).sort();
    expect(shimOnly).toEqual([...SHIM_ONLY_GLOBALS].sort());
    for (const name of SHIM_ONLY_GLOBALS) {
      expect(preamble).toContain(`declare const ${name}: any;`);
    }
    expect(preamble).toMatch(/TODO\(typecheck-examples\)/);
  });

  it('parses multiple new Function shims and createUserGlobals keys', () => {
    const worker = "new Function('alpha', 'beta', code); new Function('alpha', 'gamma', code);";
    const userGlobals = 'function createUserGlobals() { return { Sketcher, sketcher }; }';
    expect(parseWorkerShimGlobals(worker, userGlobals).sort()).toEqual(
      ['Sketcher', 'alpha', 'beta', 'gamma', 'sketcher'],
    );
  });

  it('parses a synthetic KernelCadApi interface without duplicates', () => {
    const source = [
      'export interface Other { z: number }',
      'export interface KernelCadApi {',
      '  box(x: number): void;',
      '  param(name: string): void;',
      '  param(name: string, value: number): void;',
      '}',
    ].join('\n');
    expect(parseKernelCadApiGlobals(source)).toEqual(['box', 'param']);
  });

  it('maps wrapper coordinates back to the embedded source lines', () => {
    const { code, sourceLineOffset } = buildWrapperCode('return 1;\n', preamble);
    const lines = code.split('\n');
    expect(lines[sourceLineOffset - 1]).toBe('void (async function () {');
    expect(lines[sourceLineOffset]).toBe('return 1;');
  });
});
