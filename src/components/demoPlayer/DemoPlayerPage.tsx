import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ViewerPane } from './ViewerPane';
import { TerminalPane } from './TerminalPane';
import { TitleCard } from './TitleCard';
import { AnimationEngine } from './AnimationEngine';
import { CameraController } from './CameraController';
import type { FeatureEvent } from '../../compute/featureEvents';
import type { TerminalLine } from './TerminalPane';
import type { FaceGeometry } from '../../lib/workerTypes';
import type { FeatureMeshSerialized } from '../../capture/featureMeshSerialize';
import { rehydrateFromBridge } from '../../capture/featureMeshSerialize';
import { resolveColor } from '../../render/palette';

export const KCAD_FEATURE_GROUP_KEY = 'kCadFeatureGroup';

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
  /** Snap camera to one of four standard engineering views and force a
   *  render. Used by `kernelcad render` for headless multi-view PNG
   *  capture. Caller should `forceFullOpacity()` first so faded-in meshes
   *  appear at full visibility. */
  setRenderView(view: RenderView): void;
  /** Set every loaded FeatureMesh material to opacity 1.0 and re-render.
   *  Used by `kernelcad render` to skip the build-animation fade-in. */
  forceFullOpacity(): void;
  /** Load pre-computed per-feature meshes into the scene. Each feature becomes a named THREE.Group. */
  loadFeatureMeshes(
    perFeature: FeatureMeshSerialized[],
    bounds: { min: [number, number, number]; max: [number, number, number] },
  ): { groupCount: number };
  /** Debug: dump scene state. */
  dumpScene(): {
    childCount: number;
    meshCount: number;
    cameraPos: [number, number, number];
    cameraLookingAt: [number, number, number];
    sampleOpacities: number[];
    /** polygonOffset triple per sampled mesh material — used by tests to
     *  verify the renderer applies depth bias on assembly meshes. */
    samplePolygonOffsets: Array<{ enabled: boolean; factor: number; units: number }>;
  };
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

/** Default mesh color when a feature has no .color() metadata. Held as a
 *  number for THREE; mirrors the long-standing "neutral CAD silver" tone the
 *  demo player has always rendered. resolveColor() returns hex strings, which
 *  THREE.Material.color.set() also accepts. */
const DEFAULT_MESH_COLOR = 0xc8d2e0;

function buildMeshFromFace(face: FaceGeometry, name: string, color: number | string): THREE.Mesh {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(face.vertices, 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(face.normals, 3));
  geom.setIndex(new THREE.BufferAttribute(face.indices, 1));
  geom.computeBoundingSphere();
  // MeshPhongMaterial — light-reactive shading for visible CAD geometry (existing scene has ambient + directional lights).
  // polygonOffset — assemblies fan into N FeatureMeshes (Task 7), so adjacent
  // parts whose surfaces touch (column on plate, servo case flush against
  // bracket) produce coplanar geometry. Depth bias resolves the resulting
  // Z-fighting flicker without geometric epsilons.
  const mat = new THREE.MeshPhongMaterial({
    color,
    specular: 0x222233,
    shininess: 30,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    flatShading: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = name;
  return mesh;
}

export type RenderView = 'front' | 'right' | 'top' | 'iso';

function fitCameraToBounds(
  camera: THREE.PerspectiveCamera,
  bounds: { min: [number, number, number]; max: [number, number, number] },
  view: RenderView | 'demo' = 'demo',
): void {
  // Bounds are centered at origin (caller offsets meshes so centroid = (0,0,0)).
  // Use the largest extent (not diagonal) so the model fills the viewport tightly.
  const dx = bounds.max[0] - bounds.min[0];
  const dy = bounds.max[1] - bounds.min[1];
  const dz = bounds.max[2] - bounds.min[2];
  const maxExtent = Math.max(dx, dy, dz);
  const fov = camera.fov * (Math.PI / 180);
  // Tighter framing for mobile-readable videos: the viewer is letterboxed next
  // to the terminal, so the model should fill the 3D pane without clipping.
  const distance = (maxExtent / 2 / Math.tan(fov / 2)) * 0.95;

  // kernelCAD is Z-up. Each engineering view fixes camera position + up
  // vector so the rendered tile matches first-angle drafting convention.
  // 'demo' preserves the legacy 3/4 angle (Y-up THREE default) the demo
  // pipeline has always rendered — captureDemo screenshots target this.
  let pos: [number, number, number];
  let up: [number, number, number] = [0, 0, 1];
  switch (view) {
    case 'front': pos = [0, -distance, 0]; break;
    case 'right': pos = [distance, 0, 0]; break;
    case 'top':   pos = [0, 0, distance]; up = [0, 1, 0]; break;
    case 'iso':   pos = [distance * 0.7, -distance * 0.7, distance * 0.5]; break;
    case 'demo':
    default:
      pos = [distance * 0.78, distance * 0.5, distance * 0.78];
      up = [0, 1, 0];
      break;
  }
  camera.up.set(up[0], up[1], up[2]);
  camera.position.set(pos[0], pos[1], pos[2]);
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
        return !!animEngineRef.current?.isFrameReady();
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
        // Force render so subsequent page.screenshot() captures the updated state.
        // (Headless Chromium can throttle rAF; we drive renderer explicitly here.)
        if (sceneRef.current) {
          sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera);
        }
      },
      setVersion: (v) => setVersion(v),
      setRenderView: (view) => {
        if (!sceneRef.current) throw new Error('demo-player: scene not ready');
        const ctx = sceneRef.current;
        // Reuse the bounds the loadFeatureMeshes path computed (mesh
        // groups are already centered at origin; just re-aim the camera).
        // Recompute aggregate bounds from current scene contents to
        // tolerate scenes loaded without explicit fit.
        const bbox = new THREE.Box3();
        ctx.scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) bbox.expandByObject(obj);
        });
        if (bbox.isEmpty()) return;
        const minV = bbox.min, maxV = bbox.max;
        fitCameraToBounds(
          ctx.camera,
          { min: [minV.x, minV.y, minV.z], max: [maxV.x, maxV.y, maxV.z] },
          view,
        );
        ctx.renderer.render(ctx.scene, ctx.camera);
      },
      forceFullOpacity: () => {
        if (!sceneRef.current) throw new Error('demo-player: scene not ready');
        const ctx = sceneRef.current;
        ctx.scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            const mat = obj.material as THREE.Material;
            mat.opacity = 1;
            mat.transparent = false;
            mat.needsUpdate = true;
          }
        });
        ctx.renderer.render(ctx.scene, ctx.camera);
      },
      loadFeatureMeshes: (perFeature, bounds) => {
        if (!sceneRef.current) throw new Error('demo-player: scene not ready');
        const scene = sceneRef.current.scene;
        // Clear any prior groups (re-load support).
        for (const child of [...scene.children]) {
          if (child instanceof THREE.Group && child.userData[KCAD_FEATURE_GROUP_KEY]) {
            scene.remove(child);
            child.traverse((o) => {
              if (o instanceof THREE.Mesh) {
                o.geometry.dispose();
                (o.material as THREE.Material).dispose();
              }
            });
          }
        }

        let groupCount = 0;
        for (const ser of perFeature) {
          const fm = rehydrateFromBridge(ser);
          const group = new THREE.Group();
          group.name = fm.featureId;
          group.userData[KCAD_FEATURE_GROUP_KEY] = true;
          group.userData.featureKind = fm.featureKind;
          group.userData.predecessors = fm.predecessors;
          group.userData.op = fm.op;
          group.visible = true;
          // Resolve role-token / hex color via the shared palette.
          // Unknown / missing → DEFAULT_MESH_COLOR (preserves prior behavior).
          const resolved = resolveColor(fm.color);
          const colorForMesh: number | string = resolved ?? DEFAULT_MESH_COLOR;
          for (const face of fm.faces) {
            const mesh = buildMeshFromFace(face, `${fm.featureId}-face-${face.faceId}`, colorForMesh);
            group.add(mesh);
          }
          scene.add(group);
          groupCount++;
        }

        // Center & camera-fit using supplied bounds (skip if nothing was loaded).
        if (perFeature.length > 0) {
          const [minX, minY, minZ] = bounds.min;
          const [maxX, maxY, maxZ] = bounds.max;
          const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
          for (const child of scene.children) {
            if (child instanceof THREE.Group && child.userData[KCAD_FEATURE_GROUP_KEY]) {
              child.position.set(-cx, -cy, -cz);
            }
          }
          fitCameraToBounds(sceneRef.current.camera, {
            min: [minX - cx, minY - cy, minZ - cz],
            max: [maxX - cx, maxY - cy, maxZ - cz],
          });
        }

        return { groupCount };
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
            samplePolygonOffsets: [],
          };
        }
        let meshCount = 0;
        const sampleOpacities: number[] = [];
        const samplePolygonOffsets: Array<{ enabled: boolean; factor: number; units: number }> = [];
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            meshCount++;
            const mat = obj.material as THREE.MeshPhongMaterial;
            if (sampleOpacities.length < 5) sampleOpacities.push(mat.opacity);
            if (samplePolygonOffsets.length < 5) {
              samplePolygonOffsets.push({
                enabled: mat.polygonOffset,
                factor: mat.polygonOffsetFactor,
                units: mat.polygonOffsetUnits,
              });
            }
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
          samplePolygonOffsets,
        };
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
      {titleCard ? <TitleCard title={titleCard.title} tagline={titleCard.tagline} /> : null}
    </div>
  );
}
