// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  camelToSnake,
  foldMcpInputAliases,
  inputSchemaPropertyPaths,
  snakeToCamel,
} from './snakeCaseArgs';

const NESTED = {
  type: 'object',
  properties: {
    dry_run: { type: 'boolean' },
    attempts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          visual_review: {
            type: 'object',
            properties: {
              screenshot_path: { type: 'string' },
            },
          },
        },
      },
    },
    changes: { type: 'object', additionalProperties: { type: 'number' } },
  },
  required: ['dry_run'],
};

describe('snake_case MCP argument names', () => {
  it('converts a camelCase identifier without touching snake_case', () => {
    expect(camelToSnake('baseFile')).toBe('base_file');
    expect(camelToSnake('minSafetyFactor')).toBe('min_safety_factor');
    expect(camelToSnake('featureID')).toBe('feature_id');
    expect(camelToSnake('minIoU')).toBe('min_iou');
    expect(camelToSnake('output_dir')).toBe('output_dir');
    expect(snakeToCamel('base_file')).toBe('baseFile');
    expect(snakeToCamel('screenshot_path')).toBe('screenshotPath');
  });

  it('lists nested property paths and ignores JSON Schema keywords', () => {
    expect(inputSchemaPropertyPaths(NESTED)).toEqual([
      'dry_run',
      'attempts',
      'attempts[].visual_review',
      'attempts[].visual_review.screenshot_path',
      'changes',
    ]);
    expect(inputSchemaPropertyPaths({
      type: 'object',
      properties: { kind: { type: 'string' } },
      allOf: [{ if: { properties: { kind: { const: 'trim' } } }, then: { properties: { feature_id: { type: 'string' } } } }],
    })).toEqual(['kind', 'kind', 'feature_id']);
  });

  it('folds a camelCase alias onto the canonical snake_case key', () => {
    const folded = foldMcpInputAliases(NESTED, {
      dryRun: true,
      attempts: [{ visualReview: { screenshotPath: '/tmp/iso.png' } }],
    }) as {
      dry_run: boolean;
      dryRun: boolean;
      attempts: Array<{ visual_review: { screenshot_path: string }; visualReview: { screenshot_path: string } }>;
    };
    expect(folded.dry_run).toBe(true);
    expect(folded.dryRun).toBe(true);
    expect(folded.attempts[0].visual_review.screenshot_path).toBe('/tmp/iso.png');
    expect(folded.attempts[0].visualReview.screenshot_path).toBe('/tmp/iso.png');
  });

  it('lets snake_case win when both names are present', () => {
    const folded = foldMcpInputAliases(NESTED, { dry_run: false, dryRun: true }) as { dry_run: boolean; dryRun: boolean };
    expect(folded.dry_run).toBe(false);
    expect(folded.dryRun).toBe(false);
  });

  it('does not rename keys inside a free-form object', () => {
    const folded = foldMcpInputAliases(NESTED, { changes: { wallThickness: 2 } }) as { changes: Record<string, number> };
    expect(folded.changes).toEqual({ wallThickness: 2 });
  });

  it('accepts the historical minIoU spelling for min_iou', () => {
    const schema = { type: 'object', properties: { min_iou: { type: 'number' } } };
    const folded = foldMcpInputAliases(schema, { minIoU: 0.95 }) as { min_iou: number; minIoU: number };
    expect(folded.min_iou).toBe(0.95);
    expect(folded.minIoU).toBe(0.95);
  });

  it('does not mutate the caller input', () => {
    const input = { dryRun: true };
    foldMcpInputAliases(NESTED, input);
    expect(input).toEqual({ dryRun: true });
  });
});
