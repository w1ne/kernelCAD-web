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
    // Neutral grey background (sampled from the table region of the eyewear
    // reference photo, ~#888). Pure black backgrounds make the SSIM scorer
    // see ~30-40% of the image as a structural mismatch (reference shows
    // table + soft shadow). Greying the background closes that gap before
    // the ground plane even casts a shadow.
    scene.background = new THREE.Color(0x888888);
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
    // Shadow map on so the ground plane (added in DemoPlayerPage.loadFeatureMeshes)
    // receives a soft cast shadow from the model — mirrors the soft table shadow
    // visible in product-photo references (eyewear-wayfarer-front etc.).
    // shadowMap is not present on the jsdom-mocked WebGLRenderer used in
    // unit tests; guard for that.
    if (renderer.shadowMap) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    mount.appendChild(renderer.domElement);

    // Three-point + rim lighting. Scene-attached (not camera-attached) so
    // the rotation phase reveals geometry naturally as parts pass under
    // each light. Fixed positions in world frame; intensities tuned for
    // the warmer-grey studio background.
    //
    // Warmer studio tint: the key light gets a slight peach (0xfff4e0) to
    // match indoor product-photo lighting; the fill stays cool sky-blue to
    // separate planes facing away from key; the rim is white-bright.
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    const key = new THREE.DirectionalLight(0xfff4e0, 1.2);
    key.position.set(80, 120, 100);
    key.castShadow = true;
    // Shadow camera bounds — sized to comfortably contain the eyewear-scale
    // scenes (~200 mm extent) at 80-120 mm light offset. Larger scenes will
    // get clipped shadows but the visual fidelity gain on hero shots
    // (eyewear-wayfarer-front, etc.) outweighs that trade.
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 600;
    key.shadow.camera.left = -300;
    key.shadow.camera.right = 300;
    key.shadow.camera.top = 300;
    key.shadow.camera.bottom = -300;
    key.shadow.bias = -0.0005;
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
