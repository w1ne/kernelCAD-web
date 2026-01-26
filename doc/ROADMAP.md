# kernelCAD Roadmap 3.0: Professional CAD Workflow

> Building a CATIA/Fusion360-class parametric CAD system in the browser

This roadmap focuses on achieving feature parity with professional CAD tools through foundational sketch-extrude workflows and visualization modes.

---

## ✅ COMPLETED: Foundation (v0.1-0.2)

### Architecture & Core Systems
- [x] **Workbench Architecture**: Modular layout system (Header, SidePanel, Workspace)
- [x] **AST-Based Code Manipulation**: Syntax-aware insertion with `acorn` parser
- [x] **Command Pattern**: Undo/Redo support with `CommandManager`
- [x] **Feature Registry**: Pluggable primitive system (Box, Cylinder, Sphere)
- [x] **Scene Browser**: Fusion 360-style feature tree with "Jump to Code"
- [x] **Test Coverage**: 77 tests (39 AST + 38 integration)

### Current Limitations
- ⚠️ **Primitives Only**: No sketch-based modeling workflow
- ⚠️ **Single View Mode**: Missing wireframe/shaded/x-ray modes
- ⚠️ **No Positioning**: Shapes stack at origin, need manual `.translate()`
- ⚠️ **No Constraints**: No dimensional or geometric constraints

---

## 🎯 PHASE 1: CAD Fundamentals (v0.3-0.4) - CURRENT PRIORITY

**Goal**: Match the core Sketch → Extrude → Modify workflow of Fusion360/CATIA

### 1.1 Sketching System (v0.3.0)
**Target**: Parametric 2D sketch creation with constraints

- [ ] **Sketch Plane Selection**
  - [ ] XY, XZ, YZ planes
  - [ ] Face selection from existing geometry
  - [ ] Offset plane definition
  
- [ ] **2D Sketch Tools** (Replicad `Sketcher` API wrapper)
  - [ ] Line (hLine, vLine, lineTo)
  - [ ] Arc/Circle
  - [ ] Rectangle
  - [ ] Polygon
 - [ ] Spline
  
- [ ] **Geometric Constraints** (Auto-inference + Manual)
  - [ ] Horizontal/Vertical
  - [ ] Parallel/Perpendicular
  - [ ] Tangent/Concentric
  - [ ] Equal length/radius
  
- [ ] **Dimensional Constraints**
  - [ ] Distance/Length
  - [ ] Radius/Diameter
  - [ ] Angle
  - [ ] **Parameter-driven** (e.g., `width = 10`)

- [ ] **Sketch UI**
  - [ ] 2D canvas overlay for visual sketching
  - [ ] Constraint indicators (Fusion360-style icons)
  - [ ] Dimension input fields
  - [ ] AST code generation: `const sketch1 = startSketch('XY').line([0,0], [10,0])...`

### 1.2 3D Operations (v0.3.1)
**Target**: Convert sketches to solid geometry

- [ ] **Extrude**
  - [ ] Distance (fixed value or parameter)
  - [ ] Direction (normal, reversed, both)
  - [ ] Operation (New Body, Join, Cut, Intersect)
  - [ ] Taper angle
  
- [ ] **Revolve**
  - [ ] Axis selection
  - [ ] Angle (full 360° or partial)
  
- [ ] **Sweep**
  - [ ] Path selection
  - [ ] Guide curves
  
- [ ] **Loft**
  - [ ] Multi-profile selection
  - [ ] Guide rails

### 1.3 Positioning & Assembly (v0.3.2)
**Fix**: Shapes currently stack at origin

- [ ] **Transform Dialog**
  - [ ] Translate (X, Y, Z inputs)
  - [ ] Rotate (Axis + Angle)
  - [ ] Scale
  
- [ ] **Smart Positioning**
  - [ ] Auto-offset new features
  - [ ] Snap to edges/faces/vertices
  - [ ] Alignment constraints
  
- [ ] **Multi-Body Support**
  - [ ] Component/Assembly tree
  - [ ] Mates/Joints (Fusion360-style)

---

## 🔭 PHASE 2: Visualization & Interaction (v0.4.0)

**Goal**: CAD-grade technical visualization (NOT photorealistic rendering)

> **Design Philosophy**: Professional CAD software (CATIA/NX/Fusion360) prioritizes **clarity** and **technical precision** over photorealism. Features should be clearly visible, edges sharp, dimensions readable.

### 2.1 View Modes (Priority Order)
**CAD Standard Modes** (Must-have):
- [ ] **Shaded with Edges** (Default, most common in CAD)
  - Flat-shaded surfaces with black edge lines
  - High contrast for readability
  - Ambient + directional lighting (not realistic)
  
- [ ] **Wireframe** (Technical review)
  - Edges only, no surfaces
  - Black lines on light background or white lines on dark
  - Performance: 60fps for 10k+ edges
  
- [ ] **Shaded** (Clean view)
  - Solid surfaces without edge lines
  - Consistent lighting (not shadows/reflections)
  - Simple material: matte finish

- [ ] **Hidden Line Removed**
  - Wireframe with occluded edges hidden or dashed
  - Classic engineering drawing style
  
**Advanced Modes** (Nice-to-have):
- [ ] **X-Ray / Transparent**
  - See-through surfaces (opacity 30%)
  - Edges visible through geometry
  - For assembly collision checking
  
- [ ] **Faceted** (Mesh analysis)
  - Show individual triangles
  - Debug tessellation quality

**NOT Implementing** (Out of scope):
- ❌ Ray-traced reflections
- ❌ Global illumination
- ❌ Material PBR (metal/glass realism)
- ❌ Shadows (soft/hard)
- ❌ Depth of field / bloom

### 2.2 Lighting & Materials
**CAD-Style Lighting** (Technical, not realistic):
```javascript
// Example: CATIA-style 3-point lighting
const lights = [
  new DirectionalLight(0xffffff, 0.7),  // Key (from camera)
  new AmbientLight(0xffffff, 0.5),      // Fill (uniform)
  new DirectionalLight(0xffffff, 0.3)   // Rim (from back)
];
```

- [ ] **Headlight Mode** (light follows camera)
- [ ] **Fixed Lights** (world-space, for orientation)
- [ ] **Ambient Occlusion** (subtle only, for depth perception)
- [ ] **No Shadows** (or minimal contact shadows only)

**Materials**:
- [ ] Simple matte shader (Lambertian or Phong, NOT PBR)
- [ ] Consistent color across viewing angles
- [ ] Edge emphasis (outline shader or post-process)

### 2.3 Display Settings
- [ ] **Edge Display Options**
  - Visible edges (thick black lines)
  - Tangent edges (hide/show toggle)
  - Sharp edges vs smooth edges differentiation
  - Edge thickness control (1-3px)
  
- [ ] **Grid & Axes**
  - Origin triad (XYZ arrows, RGB colors)
  - Grid plane display (fade with distance)
  - Unit labels (mm/in toggle)
  - Grid snap visualization
  
- [ ] **Background**
  - Solid color (light gray or gradient)
  - NOT skybox/environment map

### 2.4 Camera Controls
- [ ] **Standard Views** (Orthographic)
  - Front, Back, Left, Right, Top, Bottom
  - Isometric (default 3D view)
  - Home view (fit all in viewport)
  
- [ ] **Navigation**
  - Orbit (rotate around center)
  - Pan (translate view)
  - Zoom (dolly or FOV)
  - Frame selection (zoom to selected object)

- [ ] **Projection**
  - Orthographic (engineering default, no perspective distortion)
  - Perspective (for assembly context only)
  
- [ ] **Sectioning**
  - Section plane (slice view)
  - Half-section
  - Multi-plane section
  - Section fill pattern (hatch lines)

---

## 🚀 PHASE 3: Advanced Features (v0.5.0+)

### 3.1 Feature Tree Management
- [ ] **Drag-and-Drop Reordering** (history-based modeling)
- [ ] **Suppress/Unsuppress Features**
- [ ] **Edit Feature** (double-click to modify parameters)
- [ ] **Feature Rename** (AST refactoring)
- [ ] **Rollback** (view model at any point in history)

### 3.2 Parameters & Expressions
- [ ] **Global Parameters**
  - [ ] Variables panel (like Fusion360)
  - [ ] User-defined parameters (`width = 10`)
  - [ ] Expressions (`holeSpacing = width / 3`)
  
- [ ] **Linked Dimensions**
  - [ ] Update parameter → model rebuilds
  - [ ] Dependency graph visualization

### 3.3 Advanced Operations
- [ ] **Patterns**
  - [ ] Linear pattern
  - [ ] Circular pattern
  - [ ] Mirror
  
- [ ] **Shell/Thicken**
  - [ ] Hollow out solid
  - [ ] Variable thickness
  
- [ ] **Draft**
  - [ ] Tapered faces for molding
  
- [ ] **Split Body/Face**
  - [ ] Trim surfaces
  - [ ] Boolean fragments

### 3.4 Gizmos & Direct Manipulation
- [ ] **Transform Gizmos** (Three.js TransformControls)
  - [ ] Move arrows (X/Y/Z)
  - [ ] Rotate rings
  - [ ] Scale handles
  - [ ] Updates code: `.translate(x, y, z)`
  
- [ ] **Dimension Handles**
  - [ ] Drag to resize extrusion
  - [ ] Live dimension display

---

## 📊 Feature Comparison Matrix

| Feature | kernelCAD (Current) | Target (Fusion360) |
|---------|---------------------|-------------------|
| **Sketch Creation** | ❌ Manual code | ✅ Visual canvas |
| **Geometric Constraints** | ❌ None | ✅ Auto-inference |
| **Extrude** | ❌ Code only | ✅ Dialog + preview |
| **View Modes** | ⚠️ Shaded only | ✅ 6+ modes |
| **Feature Tree** | ✅ Read-only | ✅ Editable |
| **Undo/Redo** | ✅ Code only | ✅ Operations |
| **Parameters** | ⚠️ Manual variables | ✅ Managed panel |
| **Gizmos** | ❌ None | ✅ Full 3D manipulation |
| **Assembly** | ❌ None | ✅ Mates/Joints |

---

## 🗓️ Release Schedule

| Version | Focus | ETA |
|---------|-------|-----|
| **v0.3.0** | Sketching System | 2-3 weeks |
| **v0.3.1** | Extrude/Revolve | 1-2 weeks |
| **v0.3.2** | Positioning/Transforms | 1 week |
| **v0.4.0** | View Modes (Wireframe, etc.) | 2 weeks |
| **v0.5.0** | Parameters & Patterns | 3-4 weeks |

---

## 🏗️ Technical Implementation Notes

### Sketching Architecture
```typescript
// Feature Registry Addition
const SketchFeature = {
  id: 'sketch',
  label: 'Sketch',
  codeTemplate: (params) => `
    const ${params.name} = startSketch('${params.plane}')
      ${params.entities.map(e => e.toCode()).join('\n      ')}
      .close();
  `
};
```

### View Mode Implementation (CAD-Focused)
**Current State** (v0.2.1):
```typescript
// Simple PBR material (photorealistic approach)
const material = new MeshStandardMaterial({
  color: 0x3b82f6,
  roughness: 0.7,
  metalness: 0.3
});
```

**Target State** (v0.4.0 - CAD approach):
```typescript
// CAD-style materials with edge emphasis
const viewModes = {
  shadedWithEdges: {
    // Flat shading for surfaces
    mesh: new MeshLambertMaterial({ 
      color: 0x3b82f6,
      flatShading: true  // No smooth interpolation
    }),
    // Sharp black edges
    edges: new LineSegments(
      new EdgesGeometry(geometry, 15),  // 15° threshold for sharp edges
      new LineBasicMaterial({ color: 0x000000, linewidth: 2 })
    )
  },
  
  wireframe: {
    lines: new LineSegments(
      new WireframeGeometry(geometry),
      new LineBasicMaterial({ color: 0x000000 })
    )
  },
  
  shaded: {
    mesh: new MeshLambertMaterial({ color: 0x3b82f6 })
  },
  
  xray: {
    mesh: new MeshBasicMaterial({ 
      color: 0x3b82f6,
      transparent: true, 
      opacity: 0.3,
      side: DoubleSide
    }),
    edges: new LineSegments(...)  // Visible through transparent mesh
  }
};
```

**Lighting Setup** (CAD vs Photorealistic):
```typescript
// ❌ DON'T: Realistic lighting (game engine style)
const light = new DirectionalLight(0xffffff, 1.0);
light.castShadow = true;
const ambient = new AmbientLight(0x404040, 0.2);  // Dark ambient

// ✅ DO: CAD lighting (technical clarity)
const headlight = new DirectionalLight(0xffffff, 0.7);
headlight.position.set(0, 0, 1);  // Attach to camera
camera.add(headlight);

const ambient = new AmbientLight(0xffffff, 0.5);  // Bright ambient
const rim = new DirectionalLight(0xffffff, 0.3);
rim.position.set(0, 0, -1);  // Back lighting for depth
```

**Edge Detection Shader** (Optional, for advanced edge rendering):
```glsl
// Fragment shader for CAD-style edge emphasis
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  float edgeFactor = 1.0 - abs(dot(normal, viewDir));
  
  // Emphasize edges (Fresnel-like)
  vec3 color = baseColor;
  if (edgeFactor > 0.7) {
    color = mix(color, vec3(0.0), edgeFactor);  // Darken edges
  }
  
  gl_FragColor = vec4(color, 1.0);
}
```

### Constraint Solver Integration
- **Option 1**: Integrate `solvespace.js` (C++ port to WASM)
- **Option 2**: Use `planarity.js` (2D constraint solver)
- **Option 3**: Build minimal solver for basic constraints

---

## 🎯 Success Metrics

### v0.3 (Sketch + Extrude)
- [ ] User can create a bracket using only GUI (no manual code)
- [ ] Workflow: Sketch → Dimension → Extrude → Fillet
- [ ] Matches Fusion360 tutorial complexity

### v0.4 (Visualization)
- [ ] All 6+ view modes working
- [ ] Wireframe performance: 60fps for 10k edges
- [ ] Screenshot exports in all modes

### v0.5 (Parameters)
- [ ] Parameter-driven model updates in <1s
- [ ] Dependency graph with 20+ linked dimensions
- [ ] Pattern operation with 50+ instances

---

## Priority Order (Next 3 Months)

1. **Immediate** (This Week): Fix primitive positioning issue
2. **Short-Term** (2-3 Weeks): Sketch plane + basic 2D tools
3. **Medium-Term** (1 Month): Extrude with distance parameter
4. **Long-Term** (2-3 Months): Wireframe view + constraint solver