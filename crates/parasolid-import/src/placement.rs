//! Instance placement for native Parasolid assemblies.
//!
//! A BODY node holds a chain of INSTANCE nodes that instantiate it. Each
//! INSTANCE carries a pointer to a TRANSFORM node and to the assembly that owns
//! it. Walking from a leaf instance up through the owning assemblies yields the
//! chain of transforms from the part coordinate system to the file root.

use parasolid_core::{FieldValue, RawNode, XtDocument};
use std::collections::HashMap;

/// One resolved 3-D affine placement: `x' = (rotation * x + translation) * scale`.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PlacementTransform {
    /// Row-major 3x3 matrix.
    pub rotation: [f64; 9],
    pub translation: [f64; 3],
    pub scale: f64,
}

impl PlacementTransform {
    #[must_use]
    pub fn identity() -> Self {
        Self {
            rotation: [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0],
            translation: [0.0; 3],
            scale: 1.0,
        }
    }

    /// Compose so that `self.after(inner)` applies `inner` first.
    #[must_use]
    pub fn after(&self, inner: &Self) -> Self {
        let mut rotation = [0.0f64; 9];
        for row in 0..3 {
            for column in 0..3 {
                rotation[row * 3 + column] = (0..3)
                    .map(|k| self.rotation[row * 3 + k] * inner.rotation[k * 3 + column])
                    .sum();
            }
        }
        let mut translation = [0.0f64; 3];
        for row in 0..3 {
            translation[row] = self.scale
                * ((0..3)
                    .map(|k| self.rotation[row * 3 + k] * inner.translation[k] * inner.scale)
                    .sum::<f64>()
                    + self.translation[row]);
        }
        Self {
            rotation,
            translation,
            scale: self.scale * inner.scale,
        }
    }

    /// Determinant of the rotation part; negative marks a mirrored placement.
    #[must_use]
    pub fn determinant(&self) -> f64 {
        self.rotation[0] * (self.rotation[4] * self.rotation[8] - self.rotation[5] * self.rotation[7])
            - self.rotation[1] * (self.rotation[3] * self.rotation[8] - self.rotation[5] * self.rotation[6])
            + self.rotation[2] * (self.rotation[3] * self.rotation[7] - self.rotation[4] * self.rotation[6])
    }
}

/// One placed occurrence of a body.
#[derive(Clone, Debug)]
pub struct BodyPlacement {
    /// BODY node index.
    pub body: u32,
    /// Leaf INSTANCE node index.
    pub instance: u32,
    /// Leaf-to-root chain of INSTANCE node indexes.
    pub chain: Vec<u32>,
    /// Composed placement from part coordinates to root coordinates.
    pub transform: PlacementTransform,
}

/// Resolve every placement of `body` (or every placed body when `None`).
///
/// The walk does not require the INSTANCE/ASSEMBLY nodes to be part of the
/// mapped B-Rep model; it only reads their pointer fields by position, which
/// the effective schemas for types 11 and 100 preserve.
#[must_use]
pub fn placements(document: &XtDocument, body: Option<u32>) -> Vec<BodyPlacement> {
    let bodies: Vec<u32> = match body {
        Some(body) => vec![body],
        None => document
            .nodes
            .iter()
            .filter(|node| node.node_type == 12)
            .map(|node| node.index)
            .collect(),
    };
    placements_for(document, &bodies)
}

/// Resolve every placement of each body node index in `bodies`.
///
/// `document` only needs to carry the INSTANCE and TRANSFORM nodes; the body
/// indexes may come from an earlier pass over the same transmit.
#[must_use]
pub fn placements_for(document: &XtDocument, bodies: &[u32]) -> Vec<BodyPlacement> {
    let mut parts = HashMap::<u32, Vec<u32>>::new();
    let mut nodes = HashMap::<u32, &RawNode>::new();
    for node in &document.nodes {
        nodes.insert(node.index, node);
        if node.node_type == 11 {
            if let Some(part) = pointer_at(node, 3) {
                parts.entry(part).or_default().push(node.index);
            }
        }
    }
    let mut out = Vec::new();
    for body_index in bodies {
        let Some(leaves) = parts.get(body_index) else {
            continue;
        };
        let node_index = *body_index;
        for leaf in leaves {
            let Some(leaf_node) = nodes.get(leaf) else { continue };
            let mut chain = vec![*leaf];
            let mut assembly = pointer_at(leaf_node, 5);
            let mut guard = 0;
            while let Some(current) = assembly {
                guard += 1;
                if guard > 4096 {
                    break;
                }
                let Some(parents) = parts.get(&current) else { break };
                let Some(parent) = parents.first() else { break };
                chain.push(*parent);
                let Some(parent_node) = nodes.get(parent) else { break };
                assembly = pointer_at(parent_node, 5);
            }
            let mut transform = PlacementTransform::identity();
            for index in chain.iter().rev() {
                let Some(instance) = nodes.get(index) else { continue };
                let step = transform_of(&nodes, instance).unwrap_or_else(PlacementTransform::identity);
                transform = transform.after(&step);
            }
            out.push(BodyPlacement {
                body: node_index,
                instance: *leaf,
                chain,
                transform,
            });
        }
    }
    out
}

fn pointer_at(node: &RawNode, index: usize) -> Option<u32> {
    match node.fields.get(index)?.values.first()? {
        FieldValue::PointerIndex(target) if *target != 0 => Some(*target),
        _ => None,
    }
}

fn transform_of(nodes: &HashMap<u32, &RawNode>, instance: &RawNode) -> Option<PlacementTransform> {
    let transform_index = pointer_at(instance, 4)?;
    let node = nodes.get(&transform_index)?;
    if node.node_type != 100 {
        return None;
    }
    let mut rotation = [0.0f64; 9];
    for (slot, value) in rotation.iter_mut().zip(node.fields.get(4)?.values.iter()) {
        if let FieldValue::Double(Some(number)) = value {
            *slot = *number;
        }
    }
    let mut translation = [0.0f64; 3];
    match node.fields.get(5)?.values.first() {
        Some(FieldValue::Vector(values) | FieldValue::IntersectionPoint(values)) => {
            for (slot, value) in translation.iter_mut().zip(values.iter()) {
                if let Some(number) = value {
                    *slot = *number;
                }
            }
        }
        _ => {}
    }
    let scale = match node.fields.get(6)?.values.first()? {
        FieldValue::Double(Some(number)) => *number,
        _ => 1.0,
    };
    Some(PlacementTransform {
        rotation,
        translation,
        scale,
    })
}

/// Build the body-node-index to model-body-ordinal map used by the JSON export.
#[must_use]
pub fn ordinal_map(body_nodes: impl IntoIterator<Item = u32>) -> HashMap<u32, usize> {
    body_nodes
        .into_iter()
        .enumerate()
        .map(|(ordinal, node)| (node, ordinal))
        .collect()
}
