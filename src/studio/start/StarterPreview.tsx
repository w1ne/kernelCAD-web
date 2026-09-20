// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, Center, OrbitControls } from '@react-three/drei';
import { BufferAttribute, BufferGeometry } from 'three';
import type { FaceGeometry, GeometryResult } from '../../shared/worker/geometryEngine';

function Face({ face }: { face: FaceGeometry }) {
  const geometry = useMemo(() => {
    const mesh = new BufferGeometry();
    mesh.setAttribute('position', new BufferAttribute(face.vertices, 3));
    mesh.setAttribute('normal', new BufferAttribute(face.normals, 3));
    mesh.setIndex(new BufferAttribute(face.indices, 1));
    return mesh;
  }, [face]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial color="#5c91bd" roughness={0.45} metalness={0.12} /></mesh>;
}

export default function StarterPreview({ geometries }: { geometries: GeometryResult[] }) {
  return (
    <Canvas camera={{ position: [140, 110, 160], fov: 38 }} dpr={[1, 2]} aria-label="3D model. Drag to turn. Scroll to zoom.">
      <ambientLight intensity={1.5} />
      <directionalLight position={[80, 140, 100]} intensity={3} />
      <directionalLight position={[-80, 40, -60]} intensity={1.5} />
      <Bounds fit clip observe margin={1.75}>
        <Center>
          <group rotation={[-Math.PI / 2, 0, 0]}>
            {geometries.flatMap((geometry, part) => geometry.faces.map((face, index) => <Face key={`${part}-${index}`} face={face} />))}
          </group>
        </Center>
      </Bounds>
      <OrbitControls makeDefault minPolarAngle={0.1} maxPolarAngle={Math.PI * 0.85} />
    </Canvas>
  );
}
