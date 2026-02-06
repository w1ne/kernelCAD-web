# Performance Improvement Strategy

As the complexity of models in kernelCAD grows, the system faces several performance bottlenecks. This document outlines the current challenges and proposes a roadmap for optimization.

## Current Bottlenecks

### 1. Rendering Overhead (Main Thread)
- **High Draw Call Count**: Faces are rendered as individual Three.js meshes. A complex part with 500 faces results in 500+ draw calls, which is taxingly expensive for the WebGL context.
- **Main-Thread Edge Calculation**: `EdgesGeometry` (the black outlines) is currently computed in the React components. This calculation is $O(N \log N)$ relative to the number of triangles and blocks the UI thread during every update.
- **Redundant Disposals/Allocations**: React Three Fiber forces reconciliation of hundreds of geometry objects on every code change.

### 2. Geometry Engine (Worker)
- **Full Re-mesh on Every Run**: Currently, whenever the user types, the entire CAD model is recomputed and re-meshed. 90% of the model might be unchanged, but we waste CPU time meshing it again.
- **Fixed Tolerances**: Meshing uses a fixed `0.1` tolerance. This is either too detailed for simple blocks (wasting memory) or too coarse for small precision parts.

### 3. Data Transfer
- **Payload Size**: Large models generate tens of megabytes of vertex/index data. while we use `Transferables`, the serialization of the object tree and React state updates in Main are still costly.

---

## Proposed Improvements

### Phase 1: Short-term (Easy Wins)

#### [ ] Adaptive Execution Debounce
Implement a dynamic debounce that increases with code length or previous execution time. Small scripts get instantaneous updates (~150ms), while heavy models wait slightly longer (~800ms) to avoid lagging the editor.

#### [ ] Offload Edge Mesh to Worker
Move the `EdgesGeometry` generation (or equivalent wireframe extraction) to the Web Worker. The worker should return both the face mesh AND the edge lines, so the Viewer can simply upload them to the GPU.

#### [x] Consolidated Mesh Rendering
Combine all faces of a single `Shape` into a single `BufferGeometry`. 
- Use groups or multi-material support if face-specific selection is needed.
- This reduces the component count from $O(\text{faces})$ to $O(\text{shapes})$.

### Phase 2: Medium-term (Structural)

#### [ ] Incremental Meshing & Caching
Implement a "Shape Cache" in the worker based on AST analysis.
- If a line of code hasn't changed (e.g., `const box1 = makeBox(...)`), reuse the previous mesh.
- Only re-mesh shapes that are affected by the changed lines or downstream dependencies.

#### [ ] Adaptive Meshing
Allow the engine to use coarse meshing during "live preview" (interaction) and switch to high-quality meshing when the user stops typing for >2 seconds.

### Phase 3: Long-term (Advanced)

#### [ ] Instanced Selection 
Use a single picking buffer (Offscreen Canvas or GPU Picking) rather than standard Three.js raycasting against thousands of objects.

#### [ ] WASM Streaming & Prefetching
Optimize the `opencascade.wasm` initialization by using streaming instantiation and persistent worker storage (indexedDB) to avoid re-downloading/re-parsing on every refresh.

---

## Verification Plan

### Automated Benchmarking
- Create a `stress_test.test.ts` that generates models with 100, 500, and 1000 faces.
- Measure and log:
    - Worker execution time.
    - Mesh transfer time.
    - Frame rate (FPS) in a headless browser (Puppeteer/Playwright).

### Manual Verification
- Test interaction lag with the "Complex Assembly" example.
- Verify that "Shaded with Edges" mode doesn't stutter during rotation.
