// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { drawingAnnotationsForSheet } from './exportDrawing';

describe('drawingAnnotationsForSheet', () => {
  it('keeps declared dimensions when nothing was authored, and appends placed ones', () => {
    expect(drawingAnnotationsForSheet({ authored: undefined, declared: ['pitch'], placed: ['edge'] })).toEqual(['pitch', 'edge']);
  });

  it('lets authored dimensions replace declared ones, then appends placed ones', () => {
    expect(drawingAnnotationsForSheet({ authored: ['AUTHORED'], declared: ['pitch'], placed: ['edge'] })).toEqual(['AUTHORED', 'edge']);
  });

  it('returns nothing when the sheet has no dimensions', () => {
    expect(drawingAnnotationsForSheet({ authored: undefined, declared: [], placed: undefined })).toBeUndefined();
    expect(drawingAnnotationsForSheet({ authored: [], declared: ['pitch'], placed: [] })).toEqual(['pitch']);
  });
});
