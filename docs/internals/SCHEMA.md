> **Ported from `kernelCAD-private` research; revised for v0.1+ implementation.**
> See the kernelcad-NORTHSTAR architecture spec (in kernelCAD-private) for current architecture.

# kernelCAD Unified Model Schema

This document defines the core data structures for `kernelCAD`, optimizing for high-performance dependency tracking and persistent topological stability.

## 1. The `RelationshipGraph` (Master State)

The `RelationshipGraph` is the single source of truth for the entire design. It is a **Directed Acyclic Graph (DAG)** where nodes represent intent and edges represent dependencies.

### Node Types
| Type | Description | Internal Payload |
| :--- | :--- | :--- |
| **Component** | A geometric container. | List of `Feature` nodes, `BRepBody` cache. |
| **Occurrence**| A spatial instance. | `Matrix3D` transform, pointer to `Component`. |
| **Feature** | Parametric operation. | Input parameters, parent entity references, SMI operator ID. |
| **Constraint**| Geometric rule. | Equation solver data (2D/3D). |

### Schema (JSON Representation)
```json
{
  "documentId": "uuid-v4",
  "rootComponent": "comp_001",
  "nodes": {
    "feat_001": {
      "type": "Extrude",
      "parents": ["sketch_001"],
      "params": { "distance": 50.0, "operation": "Join" },
      "dirty": false
    }
  },
  "relationships": [
    { "from": "sketch_001", "to": "feat_001", "type": "GeometrySource" }
  ]
}
```

---

## 2. Stable ID Generation (Persistent Naming)

To avoid the "Lost Appointment" problem during topology changes, kernelCAD uses a **Hierarchical Trace ID**.

### The Algorithm: `kernelCAD::generateStableID(entity)`
1.  **Origin Trace**: Identify the `FeatureID` that birthed the entity (e.g., `feat_extrude_1`).
2.  **Ordinal Trace**: If the feature produces multiple entities (e.g., side faces), assign an index based on the generator's local topology (0 = Start Cap, 1 = Side, 2 = End Cap).
3.  **Parent Context**: Append the IDs of the parent entities used as inputs.
4.  **Hash**: Compute a `SHA-256` or `CityHash` of the trace string to create a fixed-length `StableID`.

**Example ID**: `extrude_1:face_side:sketch_line_4`

---

## 3. The Attribute Journal (`AttributeJournal`)

A flat, fast lookup table linked to the B-Rep kernel's "Bulletin Board".

- **Key**: `BRepEntityHandle` (Memory Address).
- **Value**: `StableID`.

**Propagation Rule**: When the B-Rep kernel splits a face, the journal clones the `StableID` to both resulting faces, appending a `:split_N` suffix to maintain uniqueness.

## Implications for high-performance

- **Graph Sharding**: In large assemblies, shard the `RelationshipGraph` by `Component` to allow parallel loading and independent recompute.
- **Lazy Deserialization**: Do not load B-Rep geometry until a `Component` is actually "Visible" or "Active" in the viewport.
