// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tail-appended family: 1D tolerance stack. New families go at the END of
// TOOL_REGISTRY so kernelCAD-server's index-based public contract stays stable.
import { analyzeToleranceStackTool } from '../tools/analyzeToleranceStack';
import type { ToolRegistryEntry } from './types';

export const toleranceStackToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'analyze_tolerance_stack',
      description:
        'Use this when you need a labelled 1D tolerance stack to decide whether a gap, clearance, or length still holds at the tolerance limits. ' +
        'Pass contributors: [{ id, nominalMm, upperMm, lowerMm, sense: "+" | "-" }], or { file | code, chain } where chain names dimension ids or labels from shape.dimension. ' +
        'A chain entry is an id string (sense "+") or { id, sense?, tol? }. tol on the chain overrides a declared dimension tolerance. ' +
        'A number tol is bilateral ±mm. { upper, lower } are signed deviations. { plus, minus } are drawing magnitudes. ' +
        'A missing upper/lower is refused (cli.invalid-args); ISO 2768 is not applied. ' +
        'Returns nominalMm, worst-case min/max, an independent RSS band labelled ±3σ (each half-width (upper−lower)/2 is the ±3σ proxy), variance share per contributor, and pass/fail when requirement { kind: "gap" | "clearance" | "length", minMm?, maxMm? } is set. ' +
        'requirement.pass follows the worst case. This is a 1D arithmetic stack, not a full GD&T capability study. shape.tolerance frames and require() clearances are not consumed; measure those with verify({ check: "requirements" }).',
      inputSchema: {
        type: 'object',
        properties: {
          contributors: {
            type: 'array',
            description: 'Explicit 1D chain. Do not combine with file, code, or chain.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                nominalMm: { type: 'number' },
                upperMm: { type: 'number', description: 'Signed deviation from nominal, millimetres.' },
                lowerMm: { type: 'number', description: 'Signed deviation from nominal, millimetres.' },
                sense: { type: 'string', enum: ['+', '-'] },
              },
              required: ['id', 'nominalMm', 'upperMm', 'lowerMm', 'sense'],
            },
          },
          chain: {
            type: 'array',
            description: 'Dimension ids or labels on the returned shape, in stack order.',
            items: {
              anyOf: [
                { type: 'string' },
                {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    sense: { type: 'string', enum: ['+', '-'] },
                    tol: {
                      description: 'Overrides a declared dimension tolerance.',
                      anyOf: [
                        { type: 'number' },
                        {
                          type: 'object',
                          properties: {
                            upper: { type: 'number' },
                            lower: { type: 'number' },
                          },
                          required: ['upper', 'lower'],
                        },
                        {
                          type: 'object',
                          properties: {
                            plus: { type: 'number' },
                            minus: { type: 'number' },
                          },
                          required: ['plus', 'minus'],
                        },
                      ],
                    },
                  },
                  required: ['id'],
                },
              ],
            },
          },
          file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
          code: { type: 'string', description: 'Inline kernelCAD script source.' },
          requirement: {
            type: 'object',
            description: 'Optional fit window. pass follows the worst-case band.',
            properties: {
              kind: { type: 'string', enum: ['gap', 'clearance', 'length'] },
              minMm: { type: 'number' },
              maxMm: { type: 'number' },
            },
            required: ['kind'],
          },
        },
      },
    },
    handler: input => analyzeToleranceStackTool(input as unknown as Parameters<typeof analyzeToleranceStackTool>[0]),
  },
];
