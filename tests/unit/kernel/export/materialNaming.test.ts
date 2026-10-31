import { describe, expect, it } from 'vitest';
import {
  createMaterialNameRegistry,
  resolveMaterialName,
} from '../../../../src/kernel/export/materialNaming';

describe('resolveMaterialName', () => {
  it('uses explicit PBR name, then finish, colour parameter, part, and fallback', () => {
    const pbr = { baseColor: '#c8a24a', name: 'explicit' };
    expect(resolveMaterialName({ pbr, finishName: 'brass', colorParamName: 'hull', partName: 'body' })).toBe('explicit');
    expect(resolveMaterialName({ pbr: { baseColor: '#c8a24a' }, finishName: 'brass', colorParamName: 'hull', partName: 'body' })).toBe('brass');
    expect(resolveMaterialName({ pbr: { baseColor: '#c8a24a' }, colorParamName: 'hull', partName: 'body' })).toBe('hull');
    expect(resolveMaterialName({ pbr: { baseColor: '#c8a24a' }, partName: 'body' })).toBe('body');
    expect(resolveMaterialName({ pbr: { baseColor: '#c8a24a' }, materialIndex: 3 })).toBe('material_3');
    expect(resolveMaterialName({ pbr: { baseColor: '#c8a24a' }, partName: '  ' })).toBe('material_0');
  });

  it('reuses a name for identical named PBR and suffixes same-name PBR collisions', () => {
    const registry = createMaterialNameRegistry();
    const brass = { baseColor: '#c8a24a', metalness: 1, roughness: 0.35, name: 'brass' };
    const first = registry.resolve({ pbr: brass, partName: 'bolt' });
    const same = registry.resolve({
      pbr: { roughness: 0.35, name: 'brass', baseColor: '#c8a24a', metalness: 1 },
      partName: 'other-part',
    });
    const different = registry.resolve({ pbr: { ...brass, roughness: 0.5 }, partName: 'cap' });

    expect(same).toEqual(first);
    expect(different.name).toBe('brass-2');
    expect(new Set([first.name, same.name, different.name]).size).toBe(2);
  });
});
