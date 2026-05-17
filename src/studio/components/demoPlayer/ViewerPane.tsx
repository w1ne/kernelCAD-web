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
    // Background luma 144 (#909090). Chosen to match the eval reference photos'
    // typical studio-gray backdrop so SSIM doesn't get dominated by background
    // pixel mismatch. Flat gray (no ground plane) keeps all 4 corners at the
    // same luma so silhouetteMask's corner-bg sample stays consistent — see
    // memory/kernelcad_silhouette_iou_bg_pitfall.md.
    scene.background = new THREE.Color(0x909090);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(120, 80, 120);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1); // capture deterministic
    // PBR-friendly output: linear-light pipeline with ACES filmic tone mapping
    // mapping HDR linear → display sRGB. Pairs with MeshStandardMaterial in
    // DemoPlayerPage to match the look agents see in modern CAD tools.
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);

    // Three-point + rim lighting. Scene-attached (not camera-attached) so
    // the rotation phase reveals geometry naturally as parts pass under
    // each light. Fixed positions in world frame; intensities tuned for
    // the current dark-charcoal background.
    const ambient = new THREE.AmbientLight(0xffffff, 0.25);
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(80, 120, 100);
    const fill = new THREE.DirectionalLight(0xa9c0e0, 0.5);
    fill.position.set(-100, 50, -40);
    const rim = new THREE.DirectionalLight(0xffffff, 0.7);
    rim.position.set(0, -80, -120);
    scene.add(ambient, key, fill, rim);

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
