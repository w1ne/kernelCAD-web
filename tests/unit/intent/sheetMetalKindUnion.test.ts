import { describe, it, expectTypeOf } from 'vitest';
import type { FeatureKind } from '../../../src/intent/types';

describe('FeatureKind includes the sheet-metal slice-1 names', () => {
  it('sheetMetal is in FeatureKind', () => {
    expectTypeOf<'sheetMetal'>().toMatchTypeOf<FeatureKind>();
  });
  it('sheetMetalBend is in FeatureKind', () => {
    expectTypeOf<'sheetMetalBend'>().toMatchTypeOf<FeatureKind>();
  });
});
