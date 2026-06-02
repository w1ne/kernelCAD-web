/**
 * Smoke test for @mujoco/mujoco loading in Node + vitest.
 *
 * Task 0 of the P6 (MuJoCo-WASM physics gate) plan. If this fails, the
 * whole approach is moot — report and STOP before writing more code.
 *
 * The test:
 *   - Loads the package's WASM module from disk (Node FS, not fetch).
 *   - Parses a 1-DoF horizontal pendulum (length L, mass m, gravity g).
 *   - Asserts mj_inverse reports the gravitational torque m·g·L at qpos=0.
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);

// 1-DoF horizontal pendulum: a single box body attached to world by a hinge
// at the origin, axis along +Y. Mass m=1 kg, length L=1 m along +X.
// Gravity is -Z. With the bar lying along +X at qpos=0, gravity tries to rotate
// the bar around the hinge (about Y axis). The required holding torque is m·g·L/2
// (because the center of mass is L/2 from the hinge), about the Y axis.
//
// mj_inverse with qpos=0, qvel=0, qacc=0 returns qfrc_inverse[0] = -m·g·L/2
// (negative because the joint must apply torque OPPOSITE to gravity-induced).
//
// Numbers: m=1, g=9.81, L/2 = 0.5 → expected |qfrc| ≈ 4.905 N·m.
const PENDULUM_MJCF = `<?xml version="1.0" ?>
<mujoco model="pendulum">
  <option gravity="0 0 -9.81"/>
  <worldbody>
    <body name="arm" pos="0 0 0">
      <joint name="hinge" type="hinge" axis="0 1 0" pos="0 0 0"/>
      <geom type="box" pos="0.5 0 0" size="0.5 0.05 0.05" mass="1"/>
    </body>
  </worldbody>
</mujoco>
`;

describe('@mujoco/mujoco WASM smoke', () => {
    it('loads in Node and computes gravitational torque on a 1-DoF pendulum', async () => {
        // Resolve the WASM file path from the installed package to feed into
        // Emscripten's locateFile (it defaults to fetch-from-URL, which doesn't
        // work in Node).
        const pkgEntry = require_.resolve('@mujoco/mujoco');
        const pkgDir = dirname(pkgEntry);
        const wasmPath = join(pkgDir, 'mujoco.wasm');
        const wasmBinary = await readFile(wasmPath);

        const loadMujoco = (await import('@mujoco/mujoco')).default;
        const mujoco = await loadMujoco({
            wasmBinary,
            locateFile: (path: string) => join(pkgDir, path),
        });

        const model = mujoco.MjModel.from_xml_string(PENDULUM_MJCF);
        const data = new mujoco.MjData(model);

        try {
            // qpos[0] starts at 0 (horizontal). qvel/qacc = 0.
            // Set qacc explicitly to 0 (mj_inverse needs it).
            const qacc = data.qacc;
            for (let i = 0; i < qacc.length; i++) qacc[i] = 0;
            const qvel = data.qvel;
            for (let i = 0; i < qvel.length; i++) qvel[i] = 0;
            const qpos = data.qpos;
            for (let i = 0; i < qpos.length; i++) qpos[i] = 0;

            mujoco.mj_inverse(model, data);

            const qfrc = data.qfrc_inverse;
            expect(qfrc.length).toBe(1);
            const tau = qfrc[0];
            // Center of mass is at L/2 = 0.5 m from hinge, m=1, g=9.81.
            // |required torque| = m·g·L/2 = 4.905 N·m.
            expect(Math.abs(Math.abs(tau) - 4.905)).toBeLessThan(0.05);
        } finally {
            data.delete();
            model.delete();
        }
    });
});
