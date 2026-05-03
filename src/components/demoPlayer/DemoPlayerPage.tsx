import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ViewerPane } from './ViewerPane';
import { TerminalPane } from './TerminalPane';
import { TitleCard } from './TitleCard';
import { AnimationEngine } from './AnimationEngine';
import { CameraController } from './CameraController';
import { geometryEngine } from '../../lib/geometryEngine';
import type { FeatureEvent } from '../../compute/featureEvents';
import type { TerminalLine } from './TerminalPane';
import type { FaceGeometry } from '../../lib/workerTypes';

export interface DemoPlayerWindow {
  isFrameReady(): boolean;
  onEvent(event: FeatureEvent): void;
  setRotatePhase(durationMs: number): void;
  setTerminalLines(lines: readonly TerminalLine[]): void;
  startTerminalClock(originMs: number): void;
  setTitleCard(spec: { title: string; tagline: string; durationMs: number } | null): void;
  advance(dtMs: number): void;
  /** Set kernelCAD module version string for watermark, e.g. "v0.21". */
  setVersion(v: string): void;
  /** Load + render a script's final geometry into the scene. Faces start invisible; revealed via revealFaces(). */
  loadScript(source: string): Promise<{ faceCount: number; bounds: { min: [number, number, number]; max: [number, number, number] } }>;
  /** Fade in the next `count` invisible face meshes over `durationMs`. Returns the number actually started. */
  revealFaces(count: number, durationMs: number): number;
  /** Debug: dump scene state. */
  dumpScene(): {
    childCount: number;
    meshCount: number;
    cameraPos: [number, number, number];
    cameraLookingAt: [number, number, number];
    sampleOpacities: number[];
  };
}

interface RevealAnim {
  mesh: THREE.Mesh;
  mat: THREE.MeshPhongMaterial;
  startMs: number;
  durationMs: number;
}

declare global {
  interface Window {
    __demoPlayer?: DemoPlayerWindow;
  }
}

const VIEWER_W = 1280;
const VIEWER_H = 1080;
const TERMINAL_W = 640;
const TERMINAL_H = 1080;

function buildMeshFromFace(face: FaceGeometry, name: string): THREE.Mesh {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(face.vertices, 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(face.normals, 3));
  geom.setIndex(new THREE.BufferAttribute(face.indices, 1));
  geom.computeBoundingSphere();
  // MeshPhongMaterial — light-reactive shading for visible CAD geometry (existing scene has ambient + directional lights).
  const mat = new THREE.MeshPhongMaterial({
    color: 0xc8d2e0,
    specular: 0x222233,
    shininess: 30,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    flatShading: false,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = name;
  return mesh;
}

function fitCameraToBounds(
  camera: THREE.PerspectiveCamera,
  bounds: { min: [number, number, number]; max: [number, number, number] },
): void {
  // Bounds are centered at origin (caller offsets meshes so centroid = (0,0,0)).
  // Use the largest extent (not diagonal) so the model fills the viewport tightly.
  const dx = bounds.max[0] - bounds.min[0];
  const dy = bounds.max[1] - bounds.min[1];
  const dz = bounds.max[2] - bounds.min[2];
  const maxExtent = Math.max(dx, dy, dz);
  const fov = camera.fov * (Math.PI / 180);
  // Tighter framing — model fills ~70% of viewport.
  const distance = (maxExtent / 2 / Math.tan(fov / 2)) * 1.05;
  // Canonical CAD-isometric-ish viewing angle (azimuth ~35°, elevation ~25°).
  camera.position.set(distance * 0.78, distance * 0.5, distance * 0.78);
  camera.lookAt(0, 0, 0);
  camera.near = Math.max(0.1, distance / 100);
  camera.far = distance * 20;
  camera.updateProjectionMatrix();
}

export function DemoPlayerPage(): React.JSX.Element {
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
  } | null>(null);
  const animEngineRef = useRef<AnimationEngine | null>(null);
  const cameraCtrlRef = useRef<CameraController | null>(null);
  const elapsedMsRef = useRef(0);
  const terminalOriginRef = useRef(0);
  const faceMeshesRef = useRef<THREE.Mesh[]>([]);
  const nextRevealIdxRef = useRef(0);
  const revealAnimsRef = useRef<RevealAnim[]>([]);
  const [version, setVersion] = useState('v0.21');
  const [terminalLines, setTerminalLines] = useState<readonly TerminalLine[]>([]);
  const [titleCard, setTitleCard] = useState<{ title: string; tagline: string; durationMs: number } | null>(
    null,
  );

  const handleSceneReady = useCallback((ctx: NonNullable<typeof sceneRef.current>) => {
    sceneRef.current = ctx;
    animEngineRef.current = new AnimationEngine(ctx.scene);
    cameraCtrlRef.current = new CameraController(ctx.camera, ctx.scene);
  }, []);

  useEffect(() => {
    if (!animEngineRef.current || !cameraCtrlRef.current) return;
    window.__demoPlayer = {
      isFrameReady: () => {
        const animOk = !!animEngineRef.current?.isFrameReady();
        const revealOk = revealAnimsRef.current.length === 0;
        return animOk && revealOk;
      },
      onEvent: (event) => {
        animEngineRef.current?.enqueue(event);
        if (event.kind === 'feature.compiled') {
          cameraCtrlRef.current?.nudgeTo(event.featureId, 300, elapsedMsRef.current);
        }
      },
      setRotatePhase: (durationMs) => {
        cameraCtrlRef.current?.startRotate(durationMs, elapsedMsRef.current);
      },
      setTerminalLines: (lines) => setTerminalLines(lines),
      startTerminalClock: (originMs) => {
        terminalOriginRef.current = originMs;
      },
      setTitleCard: (spec) => setTitleCard(spec),
      advance: (dtMs) => {
        elapsedMsRef.current += dtMs;
        animEngineRef.current?.advance(dtMs);
        cameraCtrlRef.current?.update(elapsedMsRef.current);
        // Tick reveal animations.
        const now = elapsedMsRef.current;
        const stillActive: RevealAnim[] = [];
        for (const a of revealAnimsRef.current) {
          const t = Math.min(1, (now - a.startMs) / a.durationMs);
          const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
          a.mat.opacity = e;
          if (t < 1) stillActive.push(a);
          else a.mat.opacity = 1;
        }
        revealAnimsRef.current = stillActive;
        // Force render so subsequent page.screenshot() captures the updated state.
        // (Headless Chromium can throttle rAF; we drive renderer explicitly here.)
        if (sceneRef.current) {
          sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera);
        }
      },
      setVersion: (v) => setVersion(v),
      loadScript: async (source) => {
        if (!sceneRef.current) throw new Error('demo-player: scene not ready');
        await geometryEngine.initialize();
        const result = await geometryEngine.executeCode(source);
        const scene = sceneRef.current.scene;
        // Clear any existing face meshes from a prior load.
        for (const m of faceMeshesRef.current) {
          scene.remove(m);
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        }
        faceMeshesRef.current = [];
        nextRevealIdxRef.current = 0;
        let faceCount = 0;
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let gi = 0; gi < result.geometries.length; gi++) {
          const geom = result.geometries[gi];
          for (const face of geom.faces) {
            const mesh = buildMeshFromFace(face, `face-${gi}-${face.faceId}`);
            scene.add(mesh);
            faceMeshesRef.current.push(mesh);
            faceCount++;
            for (let i = 0; i < face.vertices.length; i += 3) {
              const x = face.vertices[i], y = face.vertices[i + 1], z = face.vertices[i + 2];
              if (x < minX) minX = x; if (x > maxX) maxX = x;
              if (y < minY) minY = y; if (y > maxY) maxY = y;
              if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
            }
          }
        }
        const bounds: { min: [number, number, number]; max: [number, number, number] } = {
          min: [minX, minY, minZ],
          max: [maxX, maxY, maxZ],
        };
        // Center the model at origin so camera rotation orbits around it.
        if (faceCount > 0) {
          const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
          for (const m of faceMeshesRef.current) {
            m.position.set(-cx, -cy, -cz);
          }
          fitCameraToBounds(sceneRef.current.camera, {
            min: [minX - cx, minY - cy, minZ - cz],
            max: [maxX - cx, maxY - cy, maxZ - cz],
          });
        }
        return { faceCount, bounds };
      },
      dumpScene: () => {
        const scene = sceneRef.current?.scene;
        const camera = sceneRef.current?.camera;
        if (!scene || !camera) {
          return {
            childCount: 0, meshCount: 0,
            cameraPos: [0, 0, 0] as [number, number, number],
            cameraLookingAt: [0, 0, 0] as [number, number, number],
            sampleOpacities: [],
          };
        }
        let meshCount = 0;
        const sampleOpacities: number[] = [];
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            meshCount++;
            const mat = obj.material as THREE.MeshPhongMaterial;
            if (sampleOpacities.length < 5) sampleOpacities.push(mat.opacity);
          }
        });
        const lookDir = new THREE.Vector3();
        camera.getWorldDirection(lookDir);
        const lookAt: [number, number, number] = [
          camera.position.x + lookDir.x,
          camera.position.y + lookDir.y,
          camera.position.z + lookDir.z,
        ];
        return {
          childCount: scene.children.length,
          meshCount,
          cameraPos: [camera.position.x, camera.position.y, camera.position.z],
          cameraLookingAt: lookAt,
          sampleOpacities,
        };
      },
      revealFaces: (count, durationMs) => {
        const meshes = faceMeshesRef.current;
        let started = 0;
        const startMs = elapsedMsRef.current;
        for (let i = 0; i < count && nextRevealIdxRef.current < meshes.length; i++) {
          const mesh = meshes[nextRevealIdxRef.current];
          const mat = mesh.material as THREE.MeshPhongMaterial;
          mat.transparent = true;
          mat.opacity = 0;
          revealAnimsRef.current.push({ mesh, mat, startMs, durationMs });
          nextRevealIdxRef.current++;
          started++;
        }
        return started;
      },
    };
    return () => {
      delete window.__demoPlayer;
    };
  }, []);

  return (
    <div
      data-testid="demo-player"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {titleCard ? (
        <TitleCard title={titleCard.title} tagline={titleCard.tagline} />
      ) : (
        <>
          <TerminalPane
            lines={terminalLines}
            width={TERMINAL_W}
            height={TERMINAL_H}
            getElapsedMs={() => Math.max(0, elapsedMsRef.current - terminalOriginRef.current)}
          />
          <ViewerPane
            version={version}
            width={VIEWER_W}
            height={VIEWER_H}
            onSceneReady={handleSceneReady}
          />
        </>
      )}
    </div>
  );
}
