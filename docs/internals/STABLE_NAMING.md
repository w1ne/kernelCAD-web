> **Ported from `kernelCAD-private` research; revised for v0.1+ implementation.**
> See the kernelcad-NORTHSTAR architecture spec (in kernelCAD-private) for current architecture.

# Stable Entity Naming System — Full Blueprint

**Version**: 1.0
**Stack**: OpenCASCADE (OCCT) + replicad + TypeScript (WebAssembly)
**Reference sources**: Production Fusion 360 headers (v2701.1.18), binary symbol analysis of
`ASMKERN231A.dll`, `NsASMInterface10.dll`, `NaNeutronConsumer10.dll`; OCCT 7.x source tree.

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [How Fusion 360 Solves It (Reverse-Engineered)](#2-how-fusion-360-solves-it-reverse-engineered)
3. [OCCT's TNaming System (the Equivalent)](#3-occts-tnaming-system-the-equivalent)
4. [Our Implementation Blueprint](#4-our-implementation-blueprint)
   - 4.1 Entity Identity System
   - 4.2 Shape Tagging via OCCT User Attributes
   - 4.3 Feature History Graph
   - 4.4 Reference Resolution Algorithm
   - 4.5 Practical Implementation with replicad / OCCT.js
   - 4.6 Geometry-Based Fallback Matching
5. [Naming Convention (Exact String Format)](#5-naming-convention-exact-string-format)
6. [Integration with the Feature Pipeline](#6-integration-with-the-feature-pipeline)
7. [Edge Cases and Known Problems](#7-edge-cases-and-known-problems)

---

## 1. The Problem

### 1.1 Why Stable Naming Is the Hardest Problem in Parametric CAD

A parametric model is a directed graph of features, each consuming references to topology
produced by earlier features. A fillet references "the top face of the extrude". A pattern
references "the circular edge of the revolve". After the user edits an upstream parameter —
say, changing the extrude depth — the kernel tears down and rebuilds the solid from scratch.
The faces, edges, and vertices in the new solid are brand-new C++ objects with no connection
to the old ones except geometry. A naive implementation loses every downstream reference.

Concretely:

```
Timeline:
  [Sketch_1] → [Extrude_1] → [Fillet_1 references Extrude_1:face_3]
                                               ↑
                               After user edits Extrude_1 depth:
                               face_3 may not exist, or it may now be face_5,
                               or it may have been split into two faces.
```

This is not a corner case. It happens on virtually every edit in any non-trivial model. If
you get this wrong, the entire history-based parametric model collapses.

### 1.2 Why Naive Approaches Fail

**Index-based references** (`face[3]`):
The OCCT `TopExp_Explorer` traversal order is deterministic for a fixed topology, but
changes with topology shape count. Adding a through-hole to a box changes the face count
and every index above the insertion point shifts. A fillet that referenced face index 3
now references the wrong face.

**Hash-by-geometry** (e.g., hash of surface normal + centroid):
This works until any dimension changes. After an extrude depth edit, the top face moves.
Its centroid, bounding box, and surface offset all change. The hash no longer matches.
Geometry-based hashing is only viable as a *fallback* disambiguation technique, not a
primary key.

**UUID-on-create**:
Assign a random UUID when a face is first created. This works for the first compute. On
recompute the entire body is rebuilt from scratch — new `TopoDS_Face` objects with no
connection to the old UUIDs. The old UUIDs are orphaned.

The root cause of all three failures is the same: they do not track the *causal history*
of each entity across recomputes. The solution requires recording why and from what each
topological entity was created, and using that causal record to re-identify the entity after
every rebuild.

### 1.3 What "Stable Naming" Means

A stable name (also called a *persistent name*, *topological name*, or *entity token*) for a
face, edge, or vertex is a string or structured identifier that:

1. Refers to the same logical entity across multiple recomputes.
2. Is deterministic: two independent recomputes of the same model produce the same name for
   the same logical face.
3. Survives topology changes: when a face is split, both children carry derivable names from
   the parent.
4. Is serialisable: can be stored in the `.f3d` file / JSON model and re-resolved on load.

---

## 2. How Fusion 360 Solves It (Reverse-Engineered)

### 2.1 The Attribute System on B-Rep Entities

From the production headers (`Attribute.h`, `Attributes.h`, `BRepFace.h`, `BRepEdge.h`):

```cpp
// adsk::core namespace
class Attributes {
  Ptr<Attribute> add(const std::string& groupName,
                     const std::string& name,
                     const std::string& value);
  Ptr<Attribute> itemByName(const std::string& groupName,
                            const std::string& name) const;
};

// On every BRepFace and BRepEdge:
Ptr<core::Attributes> attributes() const;
```

Every `BRepFace`, `BRepEdge`, and `BRepVertex` carries a keyed attribute dictionary. Fusion
uses a reserved group named (reconstructed) `"SMI_NamingAttr"` to store the composite
persistent name string. This is how the upper API layer (`entityToken()`) is implemented:
it reads the naming attribute from the underlying ACIS entity.

### 2.2 The `entityToken` Composite Format

From `HARDCORE_RE_BIBLE.md` (reconstructed from symbol analysis of
`Ns::ASMInterface::prependFeatureId`):

```
entityToken := <FeatureID>:<ASM_Entity_ID>:<Split_Count>
```

| Field | Type | Description |
|-------|------|-------------|
| `FeatureID` | 36-char UUID | The UUID of the feature that created or last modified this entity. Stored in `MetaStream.dat` entries. |
| `ASM_Entity_ID` | 4-byte integer (hex) | The ACIS kernel's own integer handle for the entity within the body. Stable within a session. |
| `Split_Count` | decimal integer | Starts at `0`. Incremented each time the entity is split by a subsequent Boolean operation. Disambiguates children. |

Example: `"a1b2c3d4-e5f6-...":0x0000002F:0` for the original top face of an extrude.
After a Boolean cut that splits it: `"a1b2c3d4-...:0x0000002F:1"` and `"a1b2c3d4-...:0x0000002F:2"`.

### 2.3 The ASM Attribute Journal and `prependFeatureId`

When `SMIBoolean::Union` (or any SMI operation) executes:

```cpp
// Pseudo-C++ reconstructed from disassembly:
void SMIBoolean::Union(BODY* tool, BODY* blank, Status& status) {
    auto history = this->getHistoryStream();
    history->mark_checkpoint();

    outcome result = api_boolean(tool, blank, UNION, nullptr);
    if (!result.ok()) { history->rollback(); return; }

    // CRITICAL: attribute propagation step
    this->prependFeatureId(blank, this->getFeatureId());
}
```

`prependFeatureId` walks every new/modified entity in `blank` after the Boolean and:
- For **modified** entities (face existed before, now has different trim loops): updates
  the `FeatureID` field in the naming attribute to the current feature's ID, preserving
  the `ASM_Entity_ID`.
- For **generated** entities (new faces created by the Boolean interface): assigns the
  current `FeatureID` + a new `ASM_Entity_ID` from the kernel.
- For **split** entities: copies the parent's `FeatureID` + `ASM_Entity_ID`, increments
  `Split_Count` for each child.
- For **deleted** entities: removes the attribute. Downstream references to deleted
  entities are flagged as broken at the `RelationshipGraph` level.

### 2.4 The Attribute Propagation Rules

These rules are the core of the naming system. They define how identity propagates through
topological operations.

| Operation | Input Entities | Output Entities | Rule |
|-----------|---------------|-----------------|------|
| **Create primitive** | (none) | N faces, M edges | Each gets `FeatureID:newASMId:0` |
| **Boolean union/cut — unaffected face** | face F | face F' (same geometry, new trim) | `Modified(F) → F'` — same name |
| **Boolean — interface face** (new material boundary) | edge E of tool body | face F (lateral face of cut) | `Generated(E) → F` — new name derived from source edge |
| **Fillet — generates blend face** | edge E | blend face B | `Generated(E) → B` |
| **Split 1→2** | face F | faces F1, F2 | F1 = `parentId:splitCount+1`, F2 = `parentId:splitCount+2` |
| **Merge 2→1** | faces F1, F2 | face FM | `FM` name encodes both parents: `Merged_<name1>_<name2>` |
| **Deleted** | face F | (none) | all downstream refs to F are broken |

### 2.5 SMI Layer as the Naming Orchestrator

The SMI layer (`NsASMInterface10.dll`, class hierarchy `Ns::ASMInterface::SMI*`) is the
single point responsible for naming. It wraps every ACIS kernel call and, after each call,
consults the kernel's `BooleanHistory` (the ACIS-level equivalent of OCCT's
`Generated/Modified/IsDeleted`) to apply the attribute propagation rules above.

This is why naming in Fusion works correctly for multi-step features: an Extrude that
internally calls `api_make_prism` followed by `api_boolean` goes through two rounds of
attribute propagation, and the SMI layer handles both before returning control to the
upper-layer `ExtrudeFeature` object.

---

## 3. OCCT's TNaming System (the Equivalent)

### 3.1 Architecture Overview

OCCT provides a first-class naming framework in the `TNaming` package. It lives inside the
`OCAF` (Open CASCADE Application Framework) layer — a label-tree document model. The key
classes:

| Class | Role |
|-------|------|
| `TDF_Label` | A node in the document label tree. Analogous to a keyed dictionary entry. |
| `TDF_Attribute` | Base class for anything stored on a `TDF_Label`. |
| `TNaming_NamedShape` | A `TDF_Attribute` that records a `TopoDS_Shape` and its evolution kind. |
| `TNaming_Builder` | The write interface: records `Generated`, `Modified`, `Delete`, `Select` events. |
| `TNaming_Selector` | The read / re-select interface: given a name record, finds the current shape after rebuild. |
| `TNaming_UsedShapes` | Tracks all shapes referenced in the document for cross-reference queries. |

### 3.2 Shape Evolution Kinds

`TNaming_Evolution` enum:

| Kind | Meaning |
|------|---------|
| `PRIMITIVE` | Shape created from nothing (primitive constructor) |
| `GENERATED` | Shape generated from a lower-dimensional entity (e.g., face generated from edge) |
| `MODIFY` | Shape is a modified version of an existing shape (same topology kind, trimmed differently) |
| `DELETE` | Shape was deleted by this operation |
| `SELECTED` | Shape is being named for selection purposes (leaf reference) |
| `REPLACE` | Shape replaces another of the same dimension (rarely used directly) |

### 3.3 Using TNaming After a Boolean Operation

```cpp
#include <TNaming_Builder.hxx>
#include <BRepAlgoAPI_Fuse.hxx>
#include <TopExp_Explorer.hxx>

void recordBooleanHistory(
    TDF_Label featureLabel,
    BRepAlgoAPI_Fuse& fuse,
    const TopoDS_Shape& tool,
    const TopoDS_Shape& blank)
{
    TNaming_Builder builder(featureLabel);

    // Record the result shape as the feature's named shape
    builder.Select(fuse.Shape(), fuse.Shape());

    // Walk tool faces — record what happened to each
    for (TopExp_Explorer exp(tool, TopAbs_FACE); exp.More(); exp.Next()) {
        const TopoDS_Face& oldFace = TopoDS::Face(exp.Current());

        // Was it deleted?
        if (fuse.IsDeleted(oldFace)) {
            builder.Delete(oldFace);
            continue;
        }
        // Was it modified (same face, new trim)?
        const TopTools_ListOfShape& modified = fuse.Modified(oldFace);
        for (const TopoDS_Shape& newShape : modified) {
            builder.Modify(oldFace, newShape);
        }
        // Were new faces generated from this face (e.g., interface)?
        const TopTools_ListOfShape& generated = fuse.Generated(oldFace);
        for (const TopoDS_Shape& newShape : generated) {
            builder.Generated(oldFace, newShape);
        }
    }
    // Same for blank faces and edges...
}
```

### 3.4 TNaming_Selector: Re-Resolution After Rebuild

The `TNaming_Selector` is the inverse operation. Given a label that recorded a shape at
naming time, it re-finds that shape after the model has been rebuilt:

```cpp
// At reference-creation time:
TNaming_Selector selector(referenceLabel);
selector.Select(theFace, contextShape);  // records name + context

// After model rebuild:
selector.Solve(updatedContext);          // resolves → updates referenceLabel
TopoDS_Shape resolved = TNaming_Tool::CurrentShape(referenceLabel);
```

Internally `TNaming_Selector::Solve` reconstructs the topological name as a sequence of
naming steps (e.g., "the face generated from the edge that is the bottom loop of this
wire") and re-applies that sequence to the new context shape.

### 3.5 Label Hierarchy Mirrors the Feature Tree

The `TDF_Label` tree should mirror the model's feature hierarchy:

```
Root label (document)
├── Feature_1 label
│   ├── result shape label    (TNaming_NamedShape: the extrude solid)
│   ├── face_0 label          (TNaming_NamedShape: top face, PRIMITIVE)
│   ├── face_1 label          (PRIMITIVE)
│   └── edge_0 label          (PRIMITIVE)
├── Feature_2 label (fillet)
│   ├── result shape label
│   ├── blend_face_0 label    (GENERATED from Feature_1/edge_2)
│   └── modified_face_0 label (MODIFY of Feature_1/face_0)
└── ...
```

This structure allows `TNaming_Selector` to trace the causal chain upward through the tree.

### 3.6 TNaming Availability in the WASM Build

The `opencascade.js` WASM build used by replicad does **not** expose the OCAF/TNaming
package by default. The standard WASM build includes only the geometric and topological
OCCT packages. This means:

- `TNaming_Builder`, `TNaming_Selector`, `TDF_Label` are **not available** in the JS API.
- We must implement the equivalent functionality in **TypeScript** using OCCT's
  `Generated/Modified/IsDeleted` history returned by `BRepAlgoAPI_*` builders.

This is not a show-stopper. OCCT's boolean history API is sufficient — TNaming is built
on top of the same information. We implement a JS-level naming layer that replicates the
TNaming logic without the OCAF document tree.

---

## 4. Our Implementation Blueprint

### 4.1 Entity Identity System

The core data structure. An `EntityId` is a serialisable, stable, human-readable identifier
for a single topological entity (face, edge, or vertex) at any point in the model's history.

```typescript
/**
 * Stable, serialisable identifier for a single topological entity.
 * This is the kernelCAD equivalent of Fusion's entityToken composite string.
 */
interface EntityId {
  /** UUID of the feature whose buildShape() created or last gave identity to this entity. */
  featureId: string;

  /** Topological dimension of the entity. */
  entityKind: 'face' | 'edge' | 'vertex';

  /**
   * How this entity came into being relative to its originating feature.
   * This is the causal record — the key to re-resolution.
   */
  generationRule: GenerationRule;

  /**
   * When a single (featureId, generationRule) pair is ambiguous (multiple entities
   * from the same rule), disambiguator provides an ordering index.
   * Assigned at naming time; stable across recomputes unless the topology changes
   * in a way that changes the count (then it's a split/merge event).
   */
  disambiguator?: number;
}

type GenerationRule =
  /** Entity created directly by a primitive constructor (box, cylinder, extrude from scratch). */
  | { type: 'primitive'; index: number }

  /**
   * Entity generated from a lower-dimensional source entity by the feature's operation.
   * Examples:
   *   - A fillet creates a blend face generated from the selected edge.
   *   - An extrude creates side faces generated from each sketch segment edge.
   */
  | { type: 'generated'; fromEntityId: EntityId }

  /**
   * Entity is a modified version of a pre-existing entity.
   * The entity's geometry changed (e.g., new trim loops) but it is the same
   * logical face/edge (same surface, same topological role).
   */
  | { type: 'modified'; fromEntityId: EntityId }

  /**
   * Two or more source entities merged into one.
   * Happens when a Boolean removes a shared edge, merging two coplanar faces.
   */
  | { type: 'merged'; parentIds: EntityId[] }

  /**
   * One source entity split into N children.
   * Happens when a Boolean cuts through a face.
   */
  | { type: 'split'; parentId: EntityId; splitIndex: number }
  ;

/**
 * Serialised form of EntityId — used in JSON (model file, feature params).
 * The `generationRule` is encoded as a nested JSON object.
 */
type SerializedEntityId = {
  featureId: string;
  entityKind: 'face' | 'edge' | 'vertex';
  rule: SerializedGenerationRule;
  disambiguator?: number;
};
```

### 4.2 Shape Tagging via a JavaScript Registry

Since TNaming is not available in the WASM build, we maintain a JavaScript-level registry
that maps OCCT shape handles to `EntityId` objects.

OCCT provides two stable shape identity mechanisms accessible from JS:
- `shape.HashCode(upperBound)` — a session-stable integer hash of the `TShape` pointer.
  **Warning**: this is pointer-based and therefore only stable within a single compute run.
- Shape memory address / JS object identity — also session-only.

Neither is cross-session stable. For cross-session stability we use the naming layer itself:
the `EntityId` is the persistent identity; the shape-pointer lookup is only needed during
a single compute run to connect live OCCT shapes to their names.

```typescript
/**
 * Session-scoped registry mapping live OCCT shapes to their EntityIds.
 * Rebuilt completely on every full recompute. Not persisted.
 */
class ShapeRegistry {
  // keyed by OCCT shape hash code (session-only integer)
  private hashToId = new Map<number, EntityId>();
  // keyed by EntityId serialised form (for reverse lookup)
  private idToShape = new Map<string, OC.TopoDS_Shape>();

  register(shape: OC.TopoDS_Shape, id: EntityId): void {
    const hash = shape.HashCode(0x7FFFFFFF);
    this.hashToId.set(hash, id);
    this.idToShape.set(serializeEntityId(id), shape);
  }

  getIdForShape(shape: OC.TopoDS_Shape): EntityId | null {
    const hash = shape.HashCode(0x7FFFFFFF);
    return this.hashToId.get(hash) ?? null;
  }

  getShapeForId(id: EntityId): OC.TopoDS_Shape | null {
    return this.idToShape.get(serializeEntityId(id)) ?? null;
  }

  clear(): void {
    this.hashToId.clear();
    this.idToShape.clear();
  }
}

/**
 * Deterministic serialisation of EntityId for use as a Map key.
 */
function serializeEntityId(id: EntityId): string {
  return JSON.stringify(id, Object.keys(id).sort());
}
```

### 4.3 Feature History Graph

After each feature runs, we record an `EntityEvolutionRecord` — the mapping from every
old entity in the pre-feature body to the corresponding entities in the post-feature body.
This is the JavaScript equivalent of OCCT's `TNaming_Builder` records.

```typescript
/**
 * Records how topology evolved through a single feature's execution.
 * Stored persistently in the model alongside the feature's parameters.
 * Used by ReferenceResolver to trace entity identity forward through the timeline.
 */
interface EntityEvolutionRecord {
  /** Feature that produced this evolution record. */
  featureId: string;

  /**
   * Modified: one old entity became one new entity (same role, trimmed differently).
   * Key: serialised old EntityId. Value: new EntityId for the same logical entity.
   */
  modified: Record<string, EntityId>;

  /**
   * Split: one old entity became N new entities (face cut by a Boolean).
   * Key: serialised old EntityId. Value: array of new EntityIds (split children).
   */
  split: Record<string, EntityId[]>;

  /**
   * Generated: an entity of dimension D produced an entity of dimension D+1.
   * Key: serialised source EntityId. Value: array of generated EntityIds.
   * Examples:
   *   - sketch segment edge → extrude side face
   *   - body edge → fillet blend face
   */
  generated: Record<string, EntityId[]>;

  /**
   * Merged: multiple old entities combined into one new entity.
   * Key: serialised new EntityId. Value: array of parent EntityIds.
   */
  merged: Record<string, EntityId[]>;

  /**
   * Deleted entities — no longer present in the output body.
   * Downstream references to these are broken after this feature.
   */
  deleted: string[]; // serialised EntityIds

  /**
   * Brand-new entities with no precursor (primitive creation or entirely new faces
   * that could not be matched to any input entity).
   */
  created: EntityId[];
}

/**
 * The full ordered history of a model: one record per feature, in timeline order.
 * This is the persistent naming database.
 */
interface ModelNamingHistory {
  /** Ordered list of evolution records, one per feature. Same order as the timeline. */
  records: EntityEvolutionRecord[];
}
```

### 4.4 Reference Resolution Algorithm

When a downstream feature holds a stored reference `ref: EntityId` and we need to resolve
it to a live `TopoDS_Shape` after recompute, we walk forward through the history graph.

```typescript
type ResolutionResult =
  | { status: 'resolved'; entityId: EntityId; shape: OC.TopoDS_Shape }
  | { status: 'broken'; reason: 'deleted' | 'ambiguous' | 'not-found'; entityId: EntityId }
  | { status: 'split'; children: EntityId[] }; // reference is now ambiguous — user must disambiguate

/**
 * Walk the ModelNamingHistory forward from the feature that created `ref`
 * to the end of the timeline (or to `upToFeatureId`), and return the current
 * EntityId (and shape) that `ref` evolved into.
 *
 * Algorithm matches Fusion's `RelationshipGraph` resolution logic.
 */
function resolveEntityId(
  ref: EntityId,
  history: ModelNamingHistory,
  registry: ShapeRegistry,
  upToFeatureId?: string
): ResolutionResult {
  // Step 1: Find the index of the feature that originally defined ref
  const startIdx = history.records.findIndex(r => r.featureId === ref.featureId);
  if (startIdx === -1) {
    return { status: 'broken', reason: 'not-found', entityId: ref };
  }

  // Step 2: Determine the end index (either end-of-timeline or a specific feature)
  const endIdx = upToFeatureId
    ? history.records.findIndex(r => r.featureId === upToFeatureId)
    : history.records.length - 1;

  // Step 3: Walk forward, following the evolution of `ref` at each step
  let currentId: EntityId = ref;

  for (let i = startIdx + 1; i <= endIdx; i++) {
    const record = history.records[i];
    const key = serializeEntityId(currentId);

    // Was it deleted?
    if (record.deleted.includes(key)) {
      return { status: 'broken', reason: 'deleted', entityId: currentId };
    }

    // Was it modified (1:1 evolution)?
    if (record.modified[key]) {
      currentId = record.modified[key];
      continue;
    }

    // Was it split (1:N)? — this is the ambiguous case
    if (record.split[key]) {
      const children = record.split[key];
      if (ref.disambiguator !== undefined) {
        // If the original reference had a disambiguator, follow the matching child
        const child = children[ref.disambiguator];
        if (child) {
          currentId = child;
          continue;
        }
      }
      // No disambiguator or index out of range — report as split
      return { status: 'split', children };
    }

    // Was it merged into something?
    for (const [mergedKey, parentIds] of Object.entries(record.merged)) {
      if (parentIds.some(p => serializeEntityId(p) === key)) {
        // Follow to the merged entity
        currentId = deserializeEntityId(mergedKey);
        continue;
      }
    }

    // Entity was not touched by this feature — it passes through unchanged
  }

  // Step 4: Look up the live shape for the resolved EntityId
  const shape = registry.getShapeForId(currentId);
  if (!shape) {
    return { status: 'broken', reason: 'not-found', entityId: currentId };
  }

  return { status: 'resolved', entityId: currentId, shape };
}
```

#### Resolution Edge Cases

**Split with disambiguator**: When a face is split, both children inherit the parent's
`EntityId` plus a `splitIndex`. A downstream fillet that referenced the parent face before
the split records `disambiguator: 0` (first child) or `disambiguator: 1` (second child)
at the moment the user selected which child to fillet. On subsequent recomputes the same
`splitIndex` is used. If the topology changes such that there is only one child, the
`disambiguator: 1` reference is broken.

**Geometry-proximity fallback for split**: When there is no disambiguator (old reference
created before split logic was implemented, or the split is new), fall back to geometry
matching (Section 4.6) to determine which child is the "most similar" to the original.

**Transitive resolution**: A reference may need to follow multiple evolution steps. E.g.:
`Feature_1 → Feature_2 modifies → Feature_3 modifies → current`. Each step is one iteration
of the loop above. No recursion needed; the linear walk handles arbitrarily long chains.

### 4.5 Practical Implementation: Building Evolution Records from OCCT History

This is where the rubber meets the road. After each feature runs its `buildShape()`, we
compare the pre-feature and post-feature topologies using OCCT's `BRepAlgoAPI_*` history
API to classify every old entity as modified, deleted, or unchanged, and every new entity
as generated or created.

```typescript
import type OpenCascade from 'opencascade.js';

declare const oc: OpenCascade;

/**
 * Called immediately after a feature's BRepAlgoAPI_* builder completes.
 * Extracts the OCCT-level history and converts it into our EntityEvolutionRecord.
 *
 * @param featureId  UUID of the feature being processed
 * @param builder    Any BRepAlgoAPI_BuilderAlgo subclass (Fuse, Cut, Section, Common)
 * @param prevRegistry  ShapeRegistry from before this feature ran
 * @param newRegistry   ShapeRegistry being populated for after this feature
 * @param prevBody   The TopoDS_Shape before this feature
 * @param toolBody   The tool shape (for Boolean operations), if any
 */
function buildEvolutionRecord(
  featureId: string,
  builder: OC.BRepAlgoAPI_BuilderAlgo,
  prevRegistry: ShapeRegistry,
  newRegistry: ShapeRegistry,
  prevBody: OC.TopoDS_Shape,
  toolBody?: OC.TopoDS_Shape
): EntityEvolutionRecord {
  const record: EntityEvolutionRecord = {
    featureId,
    modified: {},
    split: {},
    generated: {},
    merged: {},
    deleted: [],
    created: [],
  };

  // Walk all faces of the inputs and classify each one.
  const inputBodies = toolBody ? [prevBody, toolBody] : [prevBody];

  for (const inputBody of inputBodies) {
    const faceExp = new oc.TopExp_Explorer(inputBody, oc.TopAbs_FACE);
    for (; faceExp.More(); faceExp.Next()) {
      const oldFace = oc.TopoDS.Face_1(faceExp.Current());
      const oldId = prevRegistry.getIdForShape(oldFace);
      if (!oldId) continue;  // Entity from an input we're not tracking (tool body, construction)

      const oldKey = serializeEntityId(oldId);

      // --- DELETED ---
      if (builder.IsDeleted(oldFace)) {
        record.deleted.push(oldKey);
        continue;
      }

      // --- MODIFIED (same face, new trim loops) ---
      const modifiedList = builder.Modified(oldFace);
      if (!modifiedList.IsEmpty()) {
        const modifiedFaces: EntityId[] = [];
        const it = new oc.TopTools_ListIteratorOfListOfShape(modifiedList);
        for (; it.More(); it.Next()) {
          const newFace = oc.TopoDS.Face_1(it.Value());
          const newId: EntityId = {
            featureId,
            entityKind: 'face',
            generationRule: { type: 'modified', fromEntityId: oldId },
          };
          newRegistry.register(newFace, newId);
          modifiedFaces.push(newId);
        }
        if (modifiedFaces.length === 1) {
          // Simple modification: 1 old → 1 new
          record.modified[oldKey] = modifiedFaces[0];
        } else if (modifiedFaces.length > 1) {
          // Split: 1 old → N new
          const splitIds = modifiedFaces.map((id, idx) => ({
            ...id,
            generationRule: { type: 'split' as const, parentId: oldId, splitIndex: idx },
          }));
          splitIds.forEach((id, idx) => newRegistry.register(
            oc.TopoDS.Face_1(
              new oc.TopTools_ListIteratorOfListOfShape(modifiedList).Value()  // re-iterate
            ),
            id
          ));
          record.split[oldKey] = splitIds;
        }
        continue;
      }

      // --- FACE PASSED THROUGH UNCHANGED ---
      // The face is still present in the output with the same geometry and trim.
      // Re-register it in newRegistry under the same EntityId.
      const passedFaces = getPassThroughFace(builder, oldFace);
      if (passedFaces) {
        newRegistry.register(passedFaces, oldId);
      }
    }
    faceExp.Delete();
  }

  // --- GENERATED entities: new faces from edges (fillet blend faces, extrude side faces) ---
  // Walk the result shape for faces that are not in the prevRegistry.
  const resultExp = new oc.TopExp_Explorer(builder.Shape(), oc.TopAbs_FACE);
  let primitiveIndex = 0;
  for (; resultExp.More(); resultExp.Next()) {
    const resultFace = oc.TopoDS.Face_1(resultExp.Current());
    const existingId = newRegistry.getIdForShape(resultFace);
    if (existingId) continue;  // Already classified above

    // This face is entirely new — check if it was generated from an input edge
    const sourceEdge = findSourceEdgeForGeneratedFace(builder, resultFace, prevBody);
    let newId: EntityId;
    if (sourceEdge) {
      const sourceEdgeId = prevRegistry.getIdForShape(sourceEdge);
      if (sourceEdgeId) {
        newId = {
          featureId,
          entityKind: 'face',
          generationRule: { type: 'generated', fromEntityId: sourceEdgeId },
        };
        const genKey = serializeEntityId(sourceEdgeId);
        record.generated[genKey] = [...(record.generated[genKey] ?? []), newId];
      } else {
        // Source edge is from the tool body or construction — treat as primitive
        newId = { featureId, entityKind: 'face', generationRule: { type: 'primitive', index: primitiveIndex++ } };
        record.created.push(newId);
      }
    } else {
      // Brand new face with no traceable source
      newId = { featureId, entityKind: 'face', generationRule: { type: 'primitive', index: primitiveIndex++ } };
      record.created.push(newId);
    }
    newRegistry.register(resultFace, newId);
  }
  resultExp.Delete();

  return record;
}

/**
 * Attempt to find which input edge was the source for a generated face
 * (e.g., the edge swept by an extrude to create a lateral face).
 * Uses BRepAlgoAPI_BuilderAlgo::Generated().
 */
function findSourceEdgeForGeneratedFace(
  builder: OC.BRepAlgoAPI_BuilderAlgo,
  face: OC.TopoDS_Face,
  inputBody: OC.TopoDS_Shape
): OC.TopoDS_Edge | null {
  const edgeExp = new oc.TopExp_Explorer(inputBody, oc.TopAbs_EDGE);
  for (; edgeExp.More(); edgeExp.Next()) {
    const edge = oc.TopoDS.Edge_1(edgeExp.Current());
    const generated = builder.Generated(edge);
    const it = new oc.TopTools_ListIteratorOfListOfShape(generated);
    for (; it.More(); it.Next()) {
      if (it.Value().IsSame(face)) {
        edgeExp.Delete();
        return edge;
      }
    }
  }
  edgeExp.Delete();
  return null;
}
```

**Important note on edge/vertex naming**: The same algorithm applies to edges and vertices.
For brevity the pseudocode above shows only faces; the production implementation walks
`TopAbs_EDGE` and `TopAbs_VERTEX` in additional passes with the same classification logic.

### 4.6 Geometry-Based Fallback Matching

When the naming history is broken, incomplete (file loaded from an older format), or when
a split produces no disambiguator, we fall back to geometric matching. This is a best-effort
heuristic — not a substitute for causal naming, but it prevents catastrophic failure in
common cases.

```typescript
/**
 * Snapshot of geometric properties taken at the time a reference was created.
 * Stored alongside the EntityId reference so we can fall back to geometry matching.
 */
interface FaceGeometrySnapshot {
  surfaceType: 'plane' | 'cylinder' | 'cone' | 'sphere' | 'torus' | 'nurbs' | 'other';
  /** Unit normal at the centroid, in the component's local coordinate system. */
  normalAtCentroid: [number, number, number];
  /** Centroid position in local coordinates. */
  centroid: [number, number, number];
  /** Face area in cm². */
  area: number;
  /** Bounding box diagonal length in cm. */
  bboxDiagonal: number;
  /** For planes/cylinders: a characteristic parameter (plane D, cylinder radius). */
  characteristicParam?: number;
}

/**
 * Attempt to find the best matching face in `candidates` for a stored `reference` snapshot.
 * Returns null if no confident match is found.
 *
 * Priority order (highest confidence first):
 *   1. Exact surface type + parameters (e.g., same plane equation within tolerance)
 *   2. Normal direction + area within tolerance
 *   3. Centroid position within a spatial tolerance
 *   4. Bounding box diagonal within tolerance (last resort for wildly-moved geometry)
 */
function matchFaceByGeometry(
  reference: FaceGeometrySnapshot,
  candidates: Array<{ face: OC.TopoDS_Face; snapshot: FaceGeometrySnapshot }>,
  tolerance: number = 1e-4  // cm
): OC.TopoDS_Face | null {
  // --- Pass 1: exact surface type + characteristic parameter ---
  const exactMatches = candidates.filter(c =>
    c.snapshot.surfaceType === reference.surfaceType &&
    (reference.characteristicParam === undefined ||
     Math.abs((c.snapshot.characteristicParam ?? 0) - reference.characteristicParam) < tolerance)
  );
  if (exactMatches.length === 1) return exactMatches[0].face;

  // Use the more restrictive passes on the remaining candidates
  const pool = exactMatches.length > 0 ? exactMatches : candidates;

  // --- Pass 2: normal direction + area ---
  const normalAreaMatches = pool.filter(c => {
    const normalDot = dotProduct(c.snapshot.normalAtCentroid, reference.normalAtCentroid);
    const areaDiff = Math.abs(c.snapshot.area - reference.area) / (reference.area + 1e-10);
    return normalDot > 0.999 && areaDiff < 0.01;  // <0.1° and <1% area difference
  });
  if (normalAreaMatches.length === 1) return normalAreaMatches[0].face;

  // --- Pass 3: centroid distance ---
  const centroidMatches = (normalAreaMatches.length > 0 ? normalAreaMatches : pool)
    .filter(c => distance3d(c.snapshot.centroid, reference.centroid) < tolerance * 10);
  if (centroidMatches.length === 1) return centroidMatches[0].face;

  // Ambiguous or not found
  return null;
}

function dotProduct(a: [number, number, number], b: [number, number, number]): number {
  return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}
function distance3d(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
}
```

**When to trigger geometry fallback**:
1. `resolveEntityId` returns `{ status: 'broken', reason: 'not-found' }` — history record
   missing for this entity (legacy file, manual repair mode).
2. `resolveEntityId` returns `{ status: 'split' }` and there is no `disambiguator` — user
   must confirm, but we pre-populate the suggestion with geometry matching.
3. Import from external file (STEP, IGES) — no history at all; all naming starts from
   geometry matching + initial labelling.

---

## 5. Naming Convention (Exact String Format)

The `EntityId` is always resolved to a canonical string for storage and display. This
string format is what appears in:
- The `.f3d`-equivalent JSON model file under `features[N].params.references[M].entityToken`
- Error messages: "Reference 'ExtrudeFace_1_3' is broken because the face was deleted"
- The debug inspector panel in the kernelCAD UI

### 5.1 Format Grammar

```
entity_token   := feature_token "_" local_index
                | "Merged_" entity_token "_" entity_token
                | "Split_" entity_token "_" split_index

feature_token  := feature_type "Face_" seq
                | feature_type "Edge_" seq
                | feature_type "Vertex_" seq

feature_type   := "Extrude" | "Revolve" | "Fillet" | "Chamfer" | "Loft" | "Sweep"
                | "Boolean" | "Shell" | "Sketch" | "Primitive" | "Import" | ...

seq            := decimal integer, 1-based, assigned in timeline order

local_index    := decimal integer, 0-based within this feature's output entities of this kind
split_index    := decimal integer, 0-based child index
```

### 5.2 Examples

| Scenario | String |
|----------|--------|
| Third face created by first Extrude feature | `ExtrudeFace_1_2` |
| First edge created by second Fillet feature | `FilletEdge_2_0` |
| Top vertex of first Revolve | `RevolveVertex_1_0` |
| Split of `ExtrudeFace_1_2` into two pieces | `Split_ExtrudeFace_1_2_0`, `Split_ExtrudeFace_1_2_1` |
| Merge of two faces after Boolean | `Merged_ExtrudeFace_1_2_ExtrudeFace_1_3` |
| Face generated by Fillet from `ExtrudeEdge_1_4` | `FilletFace_2_0` (with `generationRule.fromEntityId` pointing to `ExtrudeEdge_1_4`) |

### 5.3 Conversion Between EntityId and String

```typescript
function entityIdToToken(id: EntityId, sequenceTable: Map<string, number>): string {
  const seq = sequenceTable.get(id.featureId) ?? 0;
  const rule = id.generationRule;

  if (rule.type === 'merged') {
    const parentTokens = rule.parentIds
      .map(p => entityIdToToken(p, sequenceTable))
      .join('_');
    return `Merged_${parentTokens}`;
  }
  if (rule.type === 'split') {
    const parentToken = entityIdToToken(rule.parentId, sequenceTable);
    return `Split_${parentToken}_${rule.splitIndex}`;
  }

  const kindSuffix = id.entityKind === 'face' ? 'Face' :
                     id.entityKind === 'edge' ? 'Edge' : 'Vertex';
  const localIdx = id.disambiguator ?? (rule.type === 'primitive' ? rule.index : 0);
  const featurePrefix = featureTypeToPrefix(id.featureId);  // lookup from feature node
  return `${featurePrefix}${kindSuffix}_${seq}_${localIdx}`;
}
```

---

## 6. Integration with the Feature Pipeline

### 6.1 FeatureExecutor

The `FeatureExecutor` is the central orchestrator. It:
1. Calls the feature's `buildShape()` pure function.
2. Calls `buildEvolutionRecord()` to classify topology.
3. Updates the `ModelNamingHistory`.
4. Updates the `ShapeRegistry` for the current session.

```typescript
class FeatureExecutor {
  constructor(
    private history: ModelNamingHistory,
    private registry: ShapeRegistry
  ) {}

  async execute(
    feature: FeatureNode,
    prevResult: ComputeResult | null
  ): Promise<ComputeResult> {
    // 1. Resolve all entity references in the feature's params
    const resolvedRefs = this.resolveFeatureReferences(feature, prevResult);
    if (resolvedRefs.broken.length > 0) {
      throw new BrokenReferenceError(feature.id, resolvedRefs.broken);
    }

    // 2. Run the feature's pure geometry function
    const { newShape, builder } = await feature.buildShape(
      feature.params,
      resolvedRefs.resolved,
      prevResult?.solid ?? null
    );

    // 3. Build the evolution record from OCCT's history output
    const newRegistry = new ShapeRegistry();
    const evolutionRecord = buildEvolutionRecord(
      feature.id,
      builder,
      this.registry,
      newRegistry,
      prevResult?.solid?._shape ?? new oc.TopoDS_Shape(),
      feature.params.toolBody?._shape
    );

    // 4. Assign stable string tokens to all new entities
    const namingMap = buildNamingMap(newRegistry, this.history.records.length + 1);

    // 5. Commit to history
    this.history.records.push(evolutionRecord);
    this.registry = newRegistry;  // swap for next feature

    return {
      solid: newShape,
      namingMap,
      evolutionRecord,
    };
  }

  private resolveFeatureReferences(
    feature: FeatureNode,
    prevResult: ComputeResult | null
  ): { resolved: ResolvedRef[]; broken: BrokenRef[] } {
    const resolved: ResolvedRef[] = [];
    const broken: BrokenRef[] = [];

    for (const ref of feature.params.entityReferences ?? []) {
      const result = resolveEntityId(ref.entityId, this.history, this.registry, feature.id);
      if (result.status === 'resolved') {
        resolved.push({ paramKey: ref.paramKey, entityId: result.entityId, shape: result.shape });
      } else {
        broken.push({ paramKey: ref.paramKey, entityId: ref.entityId, reason: result });
      }
    }

    return { resolved, broken };
  }
}
```

### 6.2 ReferenceResolver

A thin facade over `resolveEntityId` with geometry-fallback integration and user-interaction
hooks:

```typescript
class ReferenceResolver {
  constructor(
    private history: ModelNamingHistory,
    private registry: ShapeRegistry
  ) {}

  resolve(ref: EntityId): ResolutionResult {
    const result = resolveEntityId(ref, this.history, this.registry);

    if (result.status === 'broken' && result.reason === 'not-found') {
      // Attempt geometry fallback
      return this.geometryFallback(ref);
    }

    if (result.status === 'split') {
      // Try geometry fallback to pick a candidate
      const candidate = this.geometryFallbackForSplit(ref, result.children);
      if (candidate) {
        return { status: 'resolved', entityId: candidate.entityId, shape: candidate.shape };
      }
      // Cannot auto-resolve — must surface to user
      return result;
    }

    return result;
  }

  private geometryFallback(ref: EntityId): ResolutionResult { /* ... */ }
  private geometryFallbackForSplit(ref: EntityId, children: EntityId[]): ResolvedRef | null { /* ... */ }
}
```

### 6.3 DependencyGraph and Entity Reference Edges

The `DependencyGraph` (kernelCAD's `RelationshipGraph` equivalent) uses `EntityId` as
labels on its edges. An edge from Feature A to Feature B labelled with `entityId` means:
"Feature B references entity `entityId` which was produced by Feature A (or transitively
through A)."

```typescript
interface DependencyEdge {
  fromFeatureId: string;    // producer
  toFeatureId: string;      // consumer
  entityRef: EntityId;      // the specific entity being referenced
  paramKey: string;         // which parameter in the consumer holds this ref
}
```

This means the `DependencyGraph` can answer: "which features are broken if entity X is
deleted?" by traversing all outgoing edges labelled with X or any descendant of X in the
history graph.

### 6.4 Recompute with Naming

Full recompute sequence when the user edits a feature parameter:

```
1. Mark the edited feature and all downstream features as "dirty"
2. For each dirty feature in timeline order:
   a. FeatureExecutor.execute(feature, prevResult)
      → resolves refs via ReferenceResolver
      → runs buildShape()
      → calls buildEvolutionRecord()
      → updates ModelNamingHistory
   b. If any ref is broken → mark feature as ERROR, continue
3. Emit 'recomputed' event → UI refreshes viewport + timeline
```

---

## 7. Edge Cases and Known Problems

### 7.1 Broken References After Sketch Edit

**Scenario**: The user edits the sketch profile of an extrude so that the profile changes
from a rectangle to a pentagon. The extrude rebuilds with 7 faces instead of 6. A
downstream fillet that referenced `ExtrudeFace_1_4` (the top face of the rectangle) now
gets `ExtrudeFace_1_5` as the top face (pentagon now has an extra side face inserted, which
increments the primitive index of the top face).

**Consequence**: The evolution record for the new extrude will list the old top face as
`deleted` (because the sketch profile changed, it's a new primitive, not a modification).
The fillet's reference is broken.

**Handling**:
1. Geometry fallback: the top face is still a flat plane with upward normal. Geometry
   matching will find it as the single flat-upward-normal face in the new extrude.
2. If geometry fallback succeeds, silently remap the reference and mark the feature with
   a `warning` state (not `error`) to indicate that automatic remapping occurred.
3. If geometry fallback fails (e.g., the sketch is now circular, no flat top), mark the
   fillet as `error` and surface a user-visible message: "Reference 'ExtrudeFace_1_4' is
   no longer valid. Please reselect the face."

**Implementation**: The `ComputeFn` for the Extrude feature must capture
`FaceGeometrySnapshot` for every output face at the time the reference is created (i.e., at
user selection time), and store it in the `params.entityReferences[N].geometrySnapshot`
field.

### 7.2 Component Instancing and Assembly Context

When the same `Component` is used in multiple `Occurrence` instances (as in Fusion's
assembly, via `Occurrence.fullPathName`), the same underlying `EntityId` refers to the
same topological entity, but it appears at different positions in world space.

The `entityToken` in Fusion's API concatenates the `Occurrence.fullPathName` with the
local `entityToken`:

```
assemblyEntityToken = occurrence.fullPathName + "/" + face.entityToken
```

In kernelCAD, an `AssemblyEntityId` extends `EntityId` with an occurrence path:

```typescript
interface AssemblyEntityId extends EntityId {
  occurrencePath: string[];  // ordered component UUIDs from root to leaf
}
```

The `ReferenceResolver` handles `AssemblyEntityId` by first resolving the occurrence path
to get the correct component's `ModelNamingHistory`, then running the standard resolution.

The `ShapeRegistry` for each component instance is shared (same geometry), but the
transform is applied at the occurrence level. References within a single component never
need to traverse occurrence paths.

### 7.3 Reference to Construction Geometry

Construction planes, axes, and points have fixed, user-assigned identifiers (e.g., `XY`,
`YZ`, `XZ`, or a UUID assigned when a user-created construction plane is defined). They do
not participate in the B-Rep topology and are therefore stable by construction. No evolution
records are needed for construction geometry.

```typescript
interface ConstructionRef {
  kind: 'constructionPlane' | 'constructionAxis' | 'constructionPoint';
  id: string;  // 'XY' | 'YZ' | 'XZ' | UUID
}

type AnyRef = EntityId | ConstructionRef;
```

The `ReferenceResolver` handles `ConstructionRef` by looking up the `id` directly in the
`ConstructionGeometryRegistry`, bypassing the naming history entirely.

### 7.4 Import from External File (STEP/IGES/STL)

When a body is imported from STEP or IGES, there is no feature history. All faces are
assigned `generationRule: { type: 'primitive', index: N }` with `featureId` set to the
import feature's UUID. From that point forward, features applied on top of the imported
body use the standard naming pipeline.

For STL imports (mesh bodies): no B-Rep topology, no stable naming possible. These are
treated as `BaseFeature` (direct-edit) bodies in Fusion's parlance and references into
them are flagged as `mesh-reference` — not supported in the parametric pipeline.

### 7.5 Large Split Events (Shelling, Pattern)

A `Shell` operation can split every face on the solid (adding inner offset faces). A
`Pattern` operation replicates the entire body N times. These are not 1:1 or 1:N splits
of individual faces but whole-body transformations.

**Shell**: Each original face generates an offset copy face. The evolution record has N
`generated` entries (one per original face → offset face). The original faces are recorded
as `modified` (their trim loops change to include the bridge walls). Bridge faces (the
walls of the shell) are new `primitive` faces.

**Pattern**: Each pattern instance is a separate `FeatureNode` that references the original
body's entities with an additional `instanceIndex` parameter. The resolution algorithm
checks `instanceIndex` to select the correct copy. Each instance maintains its own
`ShapeRegistry` but shares the same `ModelNamingHistory` for the pattern target.

### 7.6 Merge Detection (Coplanar Face Unification)

When a Boolean operation joins two coplanar faces that share an edge (the shared edge is
consumed), OCCT's `BRepAlgoAPI_Fuse` may return the merged face as a `Modified` result
of one of the input faces. The other input face appears as `Deleted`.

Detection heuristic: if a face appears as `Deleted` but its surface (plane equation or
surface parameters) matches a face that appears as `Modified` output of a different input
face, classify the result as a `merged` evolution rather than independent `modified` +
`deleted` events.

```typescript
function detectMergeEvents(
  record: EntityEvolutionRecord,
  prevRegistry: ShapeRegistry,
  newRegistry: ShapeRegistry
): void {
  for (const deletedKey of record.deleted) {
    const deletedId = deserializeEntityId(deletedKey);
    // Check if the "deleted" face's geometry is subsumed by any modified face
    const deletedSnapshot = prevRegistry.getGeometrySnapshot(deletedId);
    if (!deletedSnapshot) continue;

    for (const [modKey, newId] of Object.entries(record.modified)) {
      const newSnapshot = newRegistry.getGeometrySnapshot(newId);
      if (!newSnapshot) continue;
      if (sameSurfaceType(deletedSnapshot, newSnapshot) &&
          areaApproximatelySum(newSnapshot, deletedSnapshot, prevRegistry.getGeometrySnapshot(deserializeEntityId(modKey))!)) {
        // Reclassify as merge
        record.merged[serializeEntityId(newId)] = [
          deserializeEntityId(modKey),
          deletedId
        ];
        delete record.modified[modKey];
        record.deleted = record.deleted.filter(k => k !== deletedKey);
        break;
      }
    }
  }
}
```

### 7.7 Tolerance and Floating-Point Considerations

All geometry comparison in the naming system must use OCCT's modelling tolerance
(`Precision::Confusion()` = 1e-7 cm by default). Hard-coded constants like `1e-4` in the
fallback matching functions above are **application-level tolerances**, not OCCT kernel
tolerances. These must be tunable per-model to handle both micro-scale (MEMS) and large
(civil engineering) models.

```typescript
const NAMING_TOLERANCES = {
  /** Spatial tolerance for centroid/position matching, in model units (cm). */
  centroidMatch: 1e-4,
  /** Area ratio tolerance for face area matching (0.01 = 1%). */
  areaRatio: 0.01,
  /** Normal dot product threshold for direction matching (0.999 ≈ 0.08°). */
  normalDot: 0.999,
  /** Surface parameter tolerance for plane/cylinder characteristic params. */
  surfaceParam: 1e-6,
};
```

---

## Appendix A: Quick-Reference Summary Table

| Fusion 360 Concept | kernelCAD Equivalent |
|--------------------|---------------------|
| `entityToken` string | `EntityId` struct + `entityIdToToken()` |
| `Ns::ASMInterface::prependFeatureId` | `buildEvolutionRecord()` |
| ACIS `HISTORY_STREAM` | `ModelNamingHistory.records[]` |
| Attribute Journal entry | `EntityEvolutionRecord` |
| `TNaming_Builder.Modified()` | `record.modified[oldKey] = newId` |
| `TNaming_Builder.Generated()` | `record.generated[sourceKey] = [newId, ...]` |
| `TNaming_Builder.Delete()` | `record.deleted.push(oldKey)` |
| `TNaming_Selector.Solve()` | `resolveEntityId()` |
| `BRepFace.entityToken` | `ShapeRegistry.getIdForShape(face)` → `entityIdToToken()` |
| `RelationshipGraph` broken-ref detection | `FeatureExecutor.resolveFeatureReferences()` |
| Geometry fallback (Fusion internal) | `matchFaceByGeometry()` |
| Split disambiguation | `EntityId.disambiguator` field |
| Merge detection | `detectMergeEvents()` post-processing pass |

---

## Appendix B: Files Implementing This Blueprint

When implementing, the following source files should be created (relative to `src/`):

```
src/
  naming/
    EntityId.ts           — EntityId interfaces, serializeEntityId, deserializeEntityId
    ShapeRegistry.ts      — ShapeRegistry class
    EvolutionRecord.ts    — EntityEvolutionRecord interface, buildEvolutionRecord()
    ResolutionAlgorithm.ts — resolveEntityId(), ResolutionResult
    GeometryFallback.ts   — matchFaceByGeometry(), FaceGeometrySnapshot
    NamingConvention.ts   — entityIdToToken(), featureTypeToPrefix()
    MergeDetection.ts     — detectMergeEvents()
  pipeline/
    FeatureExecutor.ts    — FeatureExecutor class (integrates naming)
    ReferenceResolver.ts  — ReferenceResolver facade
    DependencyGraph.ts    — DependencyEdge, graph traversal
  model/
    ModelNamingHistory.ts — ModelNamingHistory interface, serialization/deserialization
```

These modules form the stable naming subsystem. They have no dependency on the UI layer
and can be unit-tested independently of the OCCT WASM build by using mock shape registries.
