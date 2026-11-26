// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { createMujocoSession } from './mujocoSessionCore';

describe('MuJoCo session construction ownership', () => {
    it('keeps successful native handles alive until session disposal', () => {
        const model = { delete: vi.fn(), nq: 1 };
        const data = { delete: vi.fn() };
        const module = {
            MjModel: { from_xml_string: () => model },
            MjData: class { constructor() { return data; } },
        };
        const session = createMujocoSession(module, '<mujoco/>', [], []);
        expect(session.nq).toBe(1);
        expect(model.delete).not.toHaveBeenCalled();
        expect(data.delete).not.toHaveBeenCalled();
        session.dispose();
        session.dispose();
        expect(model.delete).toHaveBeenCalledTimes(1);
        expect(data.delete).toHaveBeenCalledTimes(1);
    });

    it('releases the compiled model when data construction fails', () => {
        const model = { delete: vi.fn() };
        const failure = new Error('Native data allocation failed');
        const module = {
            MjModel: { from_xml_string: () => model },
            MjData: class { constructor() { throw failure; } },
        };
        expect(() => createMujocoSession(module, '<mujoco/>', [], [])).toThrow(failure);
        expect(model.delete).toHaveBeenCalledTimes(1);
    });

    it('preserves the allocation error if cleanup also fails', () => {
        const failure = new Error('Native data allocation failed');
        const model = { delete: vi.fn(() => { throw new Error('Cleanup failed'); }) };
        const module = {
            MjModel: { from_xml_string: () => model },
            MjData: class { constructor() { throw failure; } },
        };
        expect(() => createMujocoSession(module, '<mujoco/>', [], [])).toThrow(failure);
        expect(model.delete).toHaveBeenCalledTimes(1);
    });

    it('does not construct data after model compilation fails', () => {
        const failure = new Error('Invalid XML');
        const dataConstructor = vi.fn();
        const module = {
            MjModel: { from_xml_string: () => { throw failure; } },
            MjData: dataConstructor,
        };
        expect(() => createMujocoSession(module, '<mujoco/>', [], [])).toThrow(failure);
        expect(dataConstructor).not.toHaveBeenCalled();
    });
});

describe('native MuJoCo construction cleanup', () => {
    // The generated native API is intentionally shared with the loosely typed session adapter.
    let mujoco: any;
    const xml = '<mujoco><worldbody><body><joint type="hinge"/><geom type="sphere" size="0.1"/></body></worldbody></mujoco>';

    beforeAll(async () => {
        const require = createRequire(import.meta.url);
        const directory = dirname(require.resolve('@mujoco/mujoco'));
        const specifier = '@mujoco/mujoco';
        const native = await import(specifier);
        mujoco = await native.default({
            wasmBinary: await readFile(join(directory, 'mujoco.wasm')),
            print: () => undefined,
            printErr: () => undefined,
        });
    });

    it('releases an actual compiled model after an injected data allocation failure', () => {
        const model = mujoco.MjModel.from_xml_string(xml);
        const failure = new Error('Injected MjData allocation failure');
        try {
            expect(() => createMujocoSession({
                MjModel: { from_xml_string: () => model },
                MjData: class { constructor() { throw failure; } },
            }, xml, [], [])).toThrow(failure);
            expect(model.isDeleted()).toBe(true);
        } finally {
            if (!model.isDeleted()) model.delete();
        }
    });

    it('retains native dynamics and idempotent disposal after successful creation', () => {
        const session = createMujocoSession(mujoco, xml, [], []);
        try {
            session.setPose([0.1]);
            expect(session.inverseDynamics().allFinite).toBe(true);
        } finally {
            session.dispose();
            session.dispose();
        }
        expect(() => session.forward()).toThrow('MujocoSession used after dispose().');
    });
});
