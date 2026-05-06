import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Watermark } from './Watermark';

export interface ViewerPaneProps {
  version: string;
  onSceneReady: (ctx: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer }) => void;
  width: number;
  height: number;
}

export function ViewerPane({ version, onSceneReady, width, height }: ViewerPaneProps): React.JSX.Element {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(120, 80, 120);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1); // capture deterministic
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(50, 100, 50);
    scene.add(ambient, dir);

    let raf = 0;
    const tick = () => {
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    onSceneReady({ scene, camera, renderer });

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [onSceneReady, width, height]);

  return (
    <div style={{ position: 'relative', width, height }}>
      <div ref={mountRef} />
      <Watermark version={version} />
    </div>
  );
}
