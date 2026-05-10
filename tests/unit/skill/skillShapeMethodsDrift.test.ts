import { describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SHAPE_METHODS,
  SCENE_METHODS,
  SCENE_PART_PROPERTIES,
} from '../../../src/mcp/tools/listApi';
import { assertEveryNameInSKILL } from './_helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_MD = readFileSync(
  resolvePath(__dirname, '../../../src/skill/SKILL.md'),
  'utf8',
);

describe('SKILL.md Shape methods drift sentinel', () => {
  it('every SHAPE_METHODS entry name appears in SKILL.md (word-boundary match)', () => {
    const names = SHAPE_METHODS.map((m) => m.name);
    assertEveryNameInSKILL(SKILL_MD, names, 'Shape methods');
  });

  it('every SCENE_METHODS entry name appears in SKILL.md (Scene API block)', () => {
    const names = SCENE_METHODS.map((m) => m.name);
    assertEveryNameInSKILL(SKILL_MD, names, 'Scene methods');
  });

  it('every SCENE_PART_PROPERTIES entry name appears in SKILL.md (Scene API block)', () => {
    // ScenePart properties — `name` is too common a word for a useful
    // word-boundary check; the surrounding Scene block has its own
    // structural review. Filter it out before the sentinel runs.
    const names = SCENE_PART_PROPERTIES.map((p) => p.name).filter(
      (n) => n !== 'name',
    );
    assertEveryNameInSKILL(SKILL_MD, names, 'ScenePart properties');
  });
});
