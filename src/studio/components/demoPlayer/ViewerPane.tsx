import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
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
    // Transmission render target resolution: drop to 0.25× viewport so glass
    // materials (sapphire crystal, clear plastic, etc.) don't tank the frame
    // rate during multi-part assembly capture. The transmission shader
    // samples the opaque backbuffer per-transmissive-fragment; at 1.0× full
    // 1080p the per-frame cost in a 96-part scene exceeds 5 s under SwiftShader
    // (no GPU acceleration in CI / Playwright headless). 0.25× is visually
    // indistinguishable at the kCAD demo's iso/front pose (parts ≥ 1 mm
    // project to many pixels even at the reduced transmission target) and
    // trims per-frame cost dramatically — important for captureDemo, which
    // renders ~1100 frames sequentially for the build + rotate timeline.
    renderer.transmissionResolutionScale = 0.25;
    mount.appendChild(renderer.domElement);

    // PMREM environment map: required for MeshPhysicalMaterial.transmission
    // to render glass-like materials (sapphire crystal, etc.) — the
    // transmission shader samples this env map plus the opaque-scene render
    // target. RoomEnvironment is a procedural neutral-room IBL that ships
    // with three.js, so no HDR asset is required. Set as `scene.environment`
    // (not `scene.background`) so it lights materials without changing the
    // backdrop pixels — the gray background tuned for SSIM stays intact.
    //
    // Guarded with a feature-detect on `renderer.compile`: jsdom's WebGLRenderer
    // stub doesn't implement `.compile`, and PMREMGenerator calls into it. The
    // unit tests run under jsdom; production / capture / Playwright all use
    // real WebGL via SwiftShader so the IBL kicks in. When the env map can't
    // be built we just fall back to the three-point directional lighting below,
    // which is enough for the headless capture's matte CAD materials.
    let envTex: THREE.Texture | undefined;
    let pmrem: THREE.PMREMGenerator | undefined;
    if (typeof (renderer as unknown as { compile?: unknown }).compile === 'function') {
      try {
        pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        const roomEnv = new RoomEnvironment();
        envTex = pmrem.fromScene(roomEnv, 0.04).texture;
        scene.environment = envTex;
        // Knock the IBL contribution down so it complements (not replaces) the
        // three-point directional lighting calibrated for saturated CAD colors.
        // At full intensity the room IBL washes out pink/yellow/teal palettes
        // because it adds bright multi-directional light to materials with low
        // roughness — visible as a pastel cast on the pocket-watch hero. 0.3
        // leaves enough IBL to drive `MeshPhysicalMaterial.transmission` (which
        // samples the env map directly) without bleaching the directional fills.
        scene.environmentIntensity = 0.3;
      } catch {
        // Defensive: if the host's WebGL stub claims to have compile() but
        // PMREM still throws, fall back to scene without env map.
        envTex = undefined;
        pmrem?.dispose();
        pmrem = undefined;
      }
    }

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
      envTex?.dispose();
      pmrem?.dispose();
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
