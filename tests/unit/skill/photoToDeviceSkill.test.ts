import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = resolvePath(__dirname, '../../../src/agent/skills/kernelcad-from-reference');
const PARENT_SKILL = resolvePath(SKILLS_ROOT, 'SKILL.md');
const PHOTO_TO_DEVICE_SKILL = resolvePath(SKILLS_ROOT, 'photo-to-device/SKILL.md');

function readSkill(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

describe('photo-to-device skill operating contract', () => {
  it('routes a known-scale front-on e-reader through the active Studio/server device path', () => {
    const parent = readSkill(PARENT_SKILL);
    const child = readSkill(PHOTO_TO_DEVICE_SKILL);

    expect(existsSync(PHOTO_TO_DEVICE_SKILL), 'simple-device child skill must exist').toBe(true);
    expect(parent).toContain('photo-to-device/SKILL.md');
    expect(parent).toMatch(/simple.*front-on.*(?:consumer.*electronics|passive.*enclosures)|(?:consumer.*electronics|passive.*enclosures).*simple.*front-on/i);

    expect(child).toMatch(/simple.*front-on/i);
    expect(child).toContain('known dimension');
    expect(child).toMatch(/photo reference.*provenance|provenance.*photo reference/i);
    expect(child).toMatch(/current active Studio.*server|Studio.*hosted server/i);
    expect(child).toMatch(/observed facts/i);
    expect(child).toMatch(/inferred facts/i);
    expect(child).toMatch(/real (?:assemblies|parts)|static named assembly/i);
    expect(child).toContain('kernelcad evaluate');
    expect(child).toContain('kernelcad interference');
  });

  it('keeps photo-only device work out of trace, mesh, and robot shortcuts', () => {
    const child = readSkill(PHOTO_TO_DEVICE_SKILL);

    expect(child).toMatch(/photo-only.*(?:limit|cannot|does not)|(?:cannot|does not).*photo-only/i);
    expect(child).toMatch(/organic silhouettes?.*(?:optional|only)|(?:optional|only).*organic silhouettes?/i);
    expect(child).toMatch(/robots?.*(?:escalat|mechanism)|mechanism.*(?:escalat|not use)/i);
    expect(child).toContain('visual_mesh_reference');
    expect(child).toMatch(/Meshy.*Tripo.*(?:not CAD|not.*authoritative CAD)|Tripo.*Meshy.*(?:not CAD|not.*authoritative CAD)/i);
    expect(child).toMatch(/proto\.cat/i);
    expect(child).toMatch(/handoff.*(?:managed reference|provenance|known dimension)|(?:managed reference|provenance|known dimension).*handoff/i);
  });
});
