# API & Interface Reference

This document describes the key APIs and interfaces exposed by kernelCAD for customization and extension.

## Table of Contents
- [Context APIs](#context-apis)
- [Geometry Engine](#geometry-engine)
- [Feature System](#feature-system)
- [Sketch System](#sketch-system)
- [Code Generation](#code-generation)

---

## Context APIs

kernelCAD uses React Context for state management. The main contexts are:

### `useWorkbench()`
The unified context hook that aggregates all sub-contexts.

```typescript
const {
  // Code
  code,
  setCode,
  insertCode,
  editorInstance,
  commandManager,
  
  // UI
  viewMode,
  viewMode3D,
  activeDialog,
  setActiveDialog,
  
  // Selection
  selectedFace,
  setSelectedFace,
  sketchMode,
  
  // Geometry
  geometries,
  isComputing,
  error,
  executeGeometry,
} = useWorkbench();
```

### `useCode()`
Focused context for code management.

**Methods:**
- `setCode(code: string)`: Update the code editor content
- `insertCode(snippet: string)`: Insert code before the return statement
- `commandManager.execute(command: Command)`: Execute undo/redo commands

### `useGeometry()`
Focused context for geometry execution and results.

**Properties:**
- `geometries: GeometryResult[]` - Mesh data for rendering
- `sketchesGeometries: SketchGeometry[]` - Sketch line data
- `isComputing: boolean` - Execution state
- `error: string | null` - Last error message

**Methods:**
- `executeGeometry(code: string): Promise<void>` - Execute CAD code

---

## Geometry Engine

### `GeometryEngine`
The core class that executes CAD code in a Web Worker.

```typescript
import { GeometryEngine } from './lib/geometryEngine';

const engine = GeometryEngine.getInstance();
await engine.execute(code);
const meshes = engine.getGeometries();
```

**Methods:**
- `execute(code: string): Promise<ExecutionResult>` - Run CAD code
- `getGeometries(): GeometryResult[]` - Get mesh data
- `exportSTEP(shapeIndex: number): Promise<Blob>` - Export to STEP
- `exportSTL(shapeIndex: number): Promise<Blob>` - Export to STL

### `GeometryResult`
Type definition for rendered geometry:

```typescript
interface GeometryResult {
  faces: FaceGeometry[];
  volume?: number;
  boundingBox?: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

interface FaceGeometry {
  faceId: number;
  vertices: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  plane: {
    origin: [number, number, number];
    normal: [number, number, number];
    xDir?: [number, number, number];
  };
}
```

---

## Feature System

### Registering a Feature

Features are tools that appear in the toolbar and execute CAD operations.

```typescript
import { featureRegistry } from './features/FeatureRegistry';

featureRegistry.register({
  id: 'my-feature',
  name: 'My Feature',
  icon: MyIcon,
  category: 'primitives',
  execute: (context) => {
    context.insertCode('const shape = ...');
  }
});
```

### Feature Interface

```typescript
interface Feature {
  id: string;
  name: string;
  icon: React.ComponentType;
  category: 'primitives' | 'modifiers' | 'operations';
  execute: (context: FeatureContext) => void;
  parameters?: ParameterDefinition[];
}

interface FeatureContext {
  insertCode: (code: string) => void;
  setActiveDialog: (dialog: string | null) => void;
  code: string;
  geometries: GeometryResult[];
}
```

---

## Sketch System

### `SafeSketcher`
Enhanced Sketcher wrapper with validation and error prevention.

```typescript
import { createSafeReplicad } from './lib/safeSketch';

const safeReplicad = createSafeReplicad(replicad);
const sketch = new safeReplicad.Sketcher()
  .lineTo([10, 0])
  .lineTo([10, 10])
  .close();
```

**Features:**
- Tracks geometry presence (prevents empty sketch errors)
- Handles cursor position automatically
- Validates loop closure

### Sketch Code Generation

```typescript
import { generateSketchCode, generateSketchBody } from './lib/sketchCodegen';

const sketchData: SketchData = {
  id: 'sketch1',
  name: 'mySketch',
  plane: 'XY',
  entities: [
    { type: 'line', start: [0, 0], end: [10, 0] },
    { type: 'rectangle', corner: [0, 0], width: 10, height: 5 }
  ],
  closed: true,
  createdAt: Date.now()
};

const code = generateSketchCode(sketchData);
// Output: const mySketch = new Sketcher('XY').lineTo([10,0])...
```

---

## Code Generation

### AST Manipulation

The AST module provides safe code manipulation using the Acorn parser.

```typescript
import { insertShape, getReturnedVariables } from './lib/ast';

// Insert code before return statement
const newCode = insertShape(existingCode, 'const box = makeBox(10);');

// Extract variables from return statement
const vars = getReturnedVariables(code);
// ['box', 'cylinder', ...]
```

**Key Functions:**
- `parseCode(code: string): Node` - Parse JS to AST
- `generateCode(ast: Node): string` - Generate JS from AST
- `insertStatementSimple(code: string, statement: string): string` - Insert without modifying return
- `insertShape(code: string, statement: string): string` - Insert and update return array
- `getReturnedVariables(code: string): string[]` - Extract variable names from return
- `resolveVariableName(node: Node): string | null` - Get variable name from AST node (strict mode)

### CodeBuilder (Recommended)

Fluent API for generating robust code:

```typescript
import { CodeBuilder } from './lib/CodeBuilder';

const code = new CodeBuilder()
  .variable('box')
  .call('makeBox', [10, 10, 10])
  .build();
// Output: const box = makeBox(10, 10, 10);
```

---

## Extension Points

### Custom Dialogs

Create custom parameter dialogs for your features:

```typescript
export function MyCustomDialog({ onConfirm, onCancel }) {
  return (
    <div className="dialog">
      {/* Your UI */}
      <button onClick={() => onConfirm({ param1: value })}>
        Confirm
      </button>
    </div>
  );
}
```

### Worker Protocol

Extend the geometry worker with custom operations:

```typescript
// In worker.ts
const customOperations = {
  myOperation: (shape, params) => {
    // Custom geometry logic
    return shape.transform(...);
  }
};
```

---

## Type Definitions

### Complete Type Exports

```typescript
import type {
  // Contexts
  WorkbenchContextType,
  CodeContextType,
  GeometryContextType,
  
  // Geometry
  GeometryResult,
  FaceGeometry,
  SketchGeometry,
  
  // Features
  Feature,
  FeatureContext,
  
  // Sketches
  SketchData,
  SketchEntity,
  Point2D,
} from './types';
```

---

## Best Practices

1. **Always use `insertCode`** instead of manually modifying the code string
2. **Use `SafeSketcher`** for all sketch operations to prevent crashes
3. **Leverage AST APIs** for reliable code manipulation
4. **Register features** through the FeatureRegistry for consistency
5. **Use TypeScript** for type safety across all APIs
6. **Handle async operations** properly when calling geometry engine
7. **Clean up dialogs** after user actions (call `setActiveDialog(null)`)

---

## See Also

- [Architecture Documentation](./ARCHITECTURE.md)
- [Testing Strategy](./TESTING_STRATEGY.md)
- [Roadmap](./ROADMAP.md)
