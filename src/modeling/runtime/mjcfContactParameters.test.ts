// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { expect, it } from 'vitest';
import { initOcct } from '../../kernel/backends/occt/occtBackend';
import { createModelingApi } from '../api';
import { CaptureSession } from '../capture/captureSession';
import { assemblyToMjcf } from './mjcfExport';
import { validateContactModel, type ContactModel } from './contactDynamics';

interface CompiledContactModel {
    readonly geom_friction: ArrayLike<number>;
    readonly geom_solref: ArrayLike<number>;
    readonly geom_solimp: ArrayLike<number>;
    delete(): void;
}

it('preserves declared contact parameter precision through MJCF and native compilation', async () => {
    await initOcct();
    const session = new CaptureSession();
    const api = createModelingApi({ session });
    const arm = api.assembly('contact-precision');
    arm.part('body', api.box(10, 10, 10, true), { massKg: 0.001 });
    const contactModel: ContactModel = {
        friction: [0.123456789, 1e-10, 0],
        solref: [0.0001004, 0.987654321],
        solimp: [0.234567891, 0.987654321, 0.0001004],
    };
    const { mjcf } = await assemblyToMjcf(arm, { contactModel });
    const geom = mjcf.match(/<geom\s[^>]+>/)?.[0];
    expect(geom).toBeDefined();
    for (const attribute of ['friction', 'solref', 'solimp'] as const) {
        const values = geom!.match(new RegExp(`${attribute}="([^"]+)"`))?.[1].split(/\s+/).map(Number);
        expect(values).toEqual(contactModel[attribute]);
    }

    const require = createRequire(import.meta.url);
    const packageDir = dirname(require.resolve('@mujoco/mujoco'));
    const wasmBinary = await readFile(join(packageDir, 'mujoco.wasm'));
    const loadMujoco = (await import('@mujoco/mujoco')).default;
    const mujoco = await loadMujoco({
        wasmBinary,
        locateFile: (path: string) => join(packageDir, path),
    }) as { MjModel: { from_xml_string(xml: string): CompiledContactModel } };
    const compiled = mujoco.MjModel.from_xml_string(mjcf);
    try {
        expect(Array.from(compiled.geom_friction)).toEqual(contactModel.friction);
        expect(Array.from(compiled.geom_solref)).toEqual(contactModel.solref);
        expect(Array.from(compiled.geom_solimp).slice(0, 3)).toEqual(contactModel.solimp);
    } finally { compiled.delete(); }
}, 30000);

it('accepts exact impedance bounds and rejects values MuJoCo would clamp', () => {
    const validate = (solimp: ContactModel['solimp']) => validateContactModel({
        friction: [1, 0.005, 0.0001], solref: [0.002, 1], solimp,
    }, 0.0005);
    expect(() => validate([0.0001, 0.9999, 0.001])).not.toThrow();
    expect(() => validate([0.0001, 0.0001, 0.001])).not.toThrow();
    expect(() => validate([0.9999, 0.9999, 0.001])).not.toThrow();
    expect(() => validate([0.00009999, 0.9, 0.001])).toThrow(/solimp/);
    expect(() => validate([0.9, 0.99990001, 0.001])).toThrow(/solimp/);
    expect(() => validate([0.8, 0.7, 0.001])).toThrow(/solimp/);
    expect(() => validate([0.9, 0.95, 0])).toThrow(/solimp/);
});
