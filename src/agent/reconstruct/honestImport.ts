// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/**
 * A mesh becomes a kernelCAD script only when it is one extruded or revolved
 * profile, with no leftover boolean and no region the features missed.
 * Anything else stays a labeled imported solid. A volume match is not enough.
 */
export function dishonestImportReason(input: {
  unmatched: number;
  bodyBlocks: number;
  booleanRemainders: number;
}): string | null {
  if (input.bodyBlocks !== 1) return 'the solid is not one extruded or revolved profile';
  if (input.booleanRemainders > 0) return 'the solid still needs boolean cuts the feature tree does not name';
  if (input.unmatched > 0) return 'part of the solid has no feature';
  return null;
}

export function importedSolidScript(reason: string): string {
  return [
    '// imported solid',
    `// ${reason}`,
    '// Leave this as lib.fromSTEP or lib.fromSTL. It is not one closed sketch extruded once.',
    '',
  ].join('\n');
}
