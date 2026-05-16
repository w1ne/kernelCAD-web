import { writeFileSync, existsSync } from 'node:fs';
import {
  BufferGeometry,
  BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  Scene as ThreeScene,
} from 'three';
import { GLTFExporter } from 'three-stdlib';
import { evaluateAndBuildScript } from '../../src/agent/cli/commands/evaluate';
import type { OcctBackend } from '../../src/kernel/backends/occt/occtBackend';

export interface ExportGlbOptions {
  scriptPath: string;
  outPath: string;
}

export async function exportGlb(opts: ExportGlbOptions): Promise<void> {
  if (!existsSync(opts.scriptPath)) {
    throw new Error(`script not found: ${opts.scriptPath}`);
  }

  const { evaluation, model } = await evaluateAndBuildScript({ file: opts.scriptPath });
  if (evaluation.exitCode !== 0 || !model || !model.tailShape) {
    throw new Error(
      `evaluation failed (exitCode=${evaluation.exitCode}, has model=${!!model}, has tail=${!!model?.tailShape})`,
    );
  }

  // tailShape is a ShapeBackend; for OCCT (the only backend in this repo)
  // it's an OcctBackend exposing getMesh(). Cast to access.
  const tail = model.tailShape as OcctBackend;
  if (typeof tail.getMesh !== 'function') {
    throw new Error('tailShape does not expose getMesh() — non-OCCT backend?');
  }
  const meshData = tail.getMesh();

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(meshData.positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(meshData.normals, 3));
  geometry.setIndex(new BufferAttribute(meshData.indices, 1));

  const material = new MeshStandardMaterial({
    color: 0xb0b0b0,
    metalness: 0.2,
    roughness: 0.6,
  });
  const threeMesh = new Mesh(geometry, material);
  const scene = new ThreeScene();
  scene.add(threeMesh);

  const exporter = new GLTFExporter();
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) resolve(result);
        else reject(new Error('GLTFExporter returned non-binary result'));
      },
      reject,
      { binary: true },
    );
  });
  writeFileSync(opts.outPath, Buffer.from(buffer));
}
