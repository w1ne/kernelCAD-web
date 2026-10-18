//! Whole-machine text transmits are streamed instead of retained.
//!
//! Parsing every node of a 1.2 GB transmit into decoded structures needs tens
//! of gigabytes, which no 32-bit webassembly module can hold. This module
//! walks the compacted payload once, recording only a pointer-level summary
//! of every node type the B-Rep export follows, then parses and maps each
//! body's small closure as an independent document.
//!
//! The summary is a few hundred megabytes at worst; every per-body document
//! is a few kilobytes to a few megabytes and is freed immediately.

use std::collections::{BTreeMap, HashMap};

use parasolid_core::{
    CompactXtPayload, DocumentLimits, EffectiveSchemaRegistry, FieldValue, RawNode, SchemaProvider,
    parse_xt,
};
use serde_json::{json, Value};

use crate::placement;
use crate::{body_faces_json, no_faces_json};

/// Node types whose pointers the export follows.
///
/// The NURBS payload types (B-spline vertices, knot sets, rational control
/// grids) are intentionally absent: they are most of the transmit's bytes,
/// the export never represents them (lower.ts builds analytic and planar
/// faces), and a referencing edge/face downgrades to an unsupported-geometry
/// diagnostic instead of failing its body.
const KEEP_TYPES: &[u16] = &[
    11, 100, 12, 13, 14, 15, 16, 17, 18, 19, 29, 30, 31, 32, 33, 34, 38, 40, 41, 46, 48, 50,
    51, 52, 53, 54, 56, 59, 60, 67, 68, 69, 124, 133, 134, 137, 204,
];

/// Pointer-level summary of one followed node.
#[derive(Debug, Clone, Copy)]
struct Summary {
    index: u32,
    start: u32,
    end: u32,
    ptr_start: u32,
    ptr_len: u16,
    node_type: u16,
}

/// The pointer graph over one compacted payload.
pub struct SummaryGraph {
    summaries: Vec<Summary>,
    by_index: Vec<u32>,
    arena: Vec<u32>,
    first_of_type: BTreeMap<u16, u32>,
    bodies: Vec<u32>,
    instances: Vec<u32>,
}

/// What one whole-transmit streaming export produced.
pub struct StreamedExport {
    /// Largest single body document seen (bytes) and its node count.
    pub largest_mini: (usize, usize, u32),
    pub schema_key: String,
    /// Serialized `[{"faces":[...]}, ...]` array, one entry per body in
    /// transmit order; failed bodies contribute an empty face list. Written
    /// as JSON text during mapping so the whole face tree is never retained.
    pub bodies_json: Vec<u8>,
    pub body_count: usize,
    /// `{"body": ordinal, ...}` placements resolved from the transmit.
    pub instances: Vec<Value>,
    pub mapped_bodies: usize,
    pub skipped_bodies: usize,
    pub first_skip: Option<String>,
}

impl SummaryGraph {
    /// Walk the payload once and record the pointer graph.
    ///
    /// # Errors
    ///
    /// Returns the same parse diagnostics as a full parse.
    pub fn build<P: SchemaProvider>(
        payload: &CompactXtPayload,
        provider: &P,
        limits: DocumentLimits,
    ) -> Result<(Self, EffectiveSchemaRegistry), parasolid_core::ParseError> {
        let mut registry = EffectiveSchemaRegistry::new(limits.max_schema_types);
        let mut graph = Self {
            summaries: Vec::new(),
            by_index: Vec::new(),
            arena: Vec::new(),
            first_of_type: BTreeMap::new(),
            bodies: Vec::new(),
            instances: Vec::new(),
        };
        payload.walk(provider, limits, &mut registry, |node| {
            graph.visit(&node);
            Ok(())
        })?;
        graph.finish();
        Ok((graph, registry))
    }

    fn visit(&mut self, node: &RawNode) {
        if !KEEP_TYPES.contains(&node.node_type) {
            return;
        }
        let ptr_start = u32::try_from(self.arena.len()).unwrap_or(u32::MAX);
        for target in follow_targets(node) {
            self.arena.push(target);
        }
        let ptr_len = u16::try_from(self.arena.len().saturating_sub(ptr_start as usize))
            .unwrap_or(u16::MAX);
        let position = u32::try_from(self.summaries.len()).unwrap_or(u32::MAX);
        self.summaries.push(Summary {
            index: node.index,
            start: u32::try_from(node.byte_range.start).unwrap_or(u32::MAX),
            end: u32::try_from(node.byte_range.end).unwrap_or(u32::MAX),
            ptr_start,
            ptr_len,
            node_type: node.node_type,
        });
        self.first_of_type.entry(node.node_type).or_insert(position);
        match node.node_type {
            12 => self.bodies.push(position),
            11 | 100 => self.instances.push(position),
            _ => {}
        }
    }

    fn finish(&mut self) {
        let mut order: Vec<u32> = (0..u32::try_from(self.summaries.len()).unwrap_or(u32::MAX)).collect();
        order.sort_unstable_by_key(|position| self.summaries[*position as usize].index);
        self.by_index = order;
    }

    fn position_of(&self, index: u32) -> Option<u32> {
        let slot = self
            .by_index
            .binary_search_by_key(&index, |position| self.summaries[*position as usize].index)
            .ok()?;
        Some(self.by_index[slot])
    }

    fn pointer(
        &self,
        summary: &Summary,
        ordinal: usize,
    ) -> Option<u32> {
        if ordinal >= usize::from(summary.ptr_len) {
            return None;
        }
        let target = *self.arena.get(summary.ptr_start as usize + ordinal)?;
        if target == 0 {
            return None;
        }
        self.position_of(target)
    }

    fn pointer_count(&self, summary: &Summary) -> usize {
        usize::from(summary.ptr_len)
    }

    /// Number of summarized nodes.
    #[must_use]
    pub fn summary_count(&self) -> usize {
        self.summaries.len()
    }

    /// Number of recorded pointer targets.
    #[must_use]
    pub fn arena_len(&self) -> usize {
        self.arena.len()
    }

    /// Node-type histogram of one body's closure.
    #[must_use]
    pub fn closure_type_counts(&self, body_index: u32) -> Option<Vec<(u16, usize)>> {
        let position = self.position_of(body_index)?;
        let mut stamps = vec![0_u32; self.summaries.len()];
        let mut generation = 0_u32;
        let closure = self.closure(&mut stamps, &mut generation, position);
        let mut counts = std::collections::BTreeMap::<u16, usize>::new();
        for slot in closure {
            counts
                .entry(self.summaries[slot as usize].node_type)
                .and_modify(|count| *count += 1)
                .or_insert(1);
        }
        let mut rows: Vec<(u16, usize)> = counts.into_iter().collect();
        rows.sort_by_key(|(_, count)| std::cmp::Reverse(*count));
        Some(rows)
    }

    /// The node type and byte span of one summary.
    #[must_use]
    pub fn node_span(&self, index: u32) -> Option<(u16, usize, usize)> {
        let position = self.position_of(index)?;
        let summary = &self.summaries[position as usize];
        Some((summary.node_type, summary.start as usize, summary.end as usize))
    }

    /// Assemble the standalone document for one body node index.
    #[must_use]
    pub fn mini_for_body(&self, payload: &CompactXtPayload, body_index: u32) -> Option<Vec<u8>> {
        let position = self.position_of(body_index)?;
        let mut stamps = vec![0_u32; self.summaries.len()];
        let mut generation = 0_u32;
        let closure = self.closure(&mut stamps, &mut generation, position);
        Some(build_mini(
            payload.payload(),
            payload.header().header_range.end,
            self,
            &closure,
        ))
    }

    /// Closure of one body: every followed node reachable from it, plus the
    /// first occurrence of every node type encountered (whose inline schema
    /// bytes the standalone document needs).
    fn closure(&self, stamps: &mut [u32], generation: &mut u32, seed: u32) -> Vec<u32> {
        *generation = generation.wrapping_add(1);
        let generation = *generation;
        let mut stack = vec![seed];
        let mut out = Vec::new();
        while let Some(position) = stack.pop() {
            let stamp = &mut stamps[position as usize];
            if *stamp == generation {
                continue;
            }
            *stamp = generation;
            let summary = &self.summaries[position as usize];
            out.push(position);
            if let Some(first) = self.first_of_type.get(&summary.node_type) {
                if *first != position && stamps[*first as usize] != generation {
                    stack.push(*first);
                }
            }
            for ordinal in 0..self.pointer_count(summary) {
                if let Some(target) = self.pointer(summary, ordinal) {
                    if stamps[target as usize] != generation {
                        stack.push(target);
                    }
                }
            }
        }
        out
    }
}

/// Export every body and instance from a compacted whole-machine transmit.
///
/// # Errors
///
/// Returns the same parse diagnostics as a full parse when the payload itself
/// is malformed.
pub fn stream_export<P: SchemaProvider>(
    payload: &CompactXtPayload,
    provider: &P,
    limits: DocumentLimits,
) -> Result<StreamedExport, parasolid_core::ParseError> {
    let (graph, _registry) = SummaryGraph::build(payload, provider, limits)?;
    let header_end = payload.header().header_range.end;
    let mut stamps = vec![0_u32; graph.summaries.len()];
    let mut generation = 0_u32;

    let mut bodies_json = Vec::<u8>::with_capacity(1 << 20);
    bodies_json.push(b'[');
    let mut largest_mini = (0_usize, 0_usize, 0_u32);
    let mut mapped_bodies = 0_usize;
    let mut skipped_bodies = 0_usize;
    let mut first_skip = None;
    for (ordinal, &body) in graph.bodies.iter().enumerate() {
        if ordinal > 0 {
            bodies_json.push(b',');
        }
        let closure = graph.closure(&mut stamps, &mut generation, body);
        let body_index = graph.summaries[body as usize].index;
        // A single body whose closure would be a quarter of the model cannot
        // be parsed as one document inside 4 GiB; the robot is represented by
        // its many normal bodies, and this one is reported as skipped.
        const MAX_CLOSURE_NODES: usize = 150_000;
        if closure.len() > MAX_CLOSURE_NODES {
            skipped_bodies += 1;
            if first_skip.is_none() {
                first_skip = Some(format!(
                    "body {body_index} has a {}-node closure and is not imported",
                    closure.len()
                ));
            }
            bodies_json.extend_from_slice(b"{\"faces\":[]}");
            continue;
        }
        let mini = build_mini(payload.payload(), header_end, &graph, &closure);
        if mini.len() > largest_mini.0 {
            largest_mini = (mini.len(), closure.len(), body_index);
        }
        let faces = match parse_mini(&mini, provider) {
            Ok(document) => match parasolid_core::brep::map_xt_brep(&document) {
                Ok(model) => match body_faces_json(&model, body_index) {
                    Some(faces) => {
                        mapped_bodies += 1;
                        faces
                    }
                    None => {
                        skipped_bodies += 1;
                        if first_skip.is_none() {
                            first_skip =
                                Some(format!("body {body_index} is absent from its own closure"));
                        }
                        no_faces_json()
                    }
                },
                Err(error) => {
                    skipped_bodies += 1;
                    if first_skip.is_none() {
                        first_skip = Some(format!(
                            "body {body_index}: {error} details={:?}",
                            error.details()
                        ));
                    }
                    no_faces_json()
                }
            },
            Err(error) => {
                skipped_bodies += 1;
                if first_skip.is_none() {
                    first_skip =
                        Some(format!("body {body_index}: {error} details={:?}", error.details()));
                }
                no_faces_json()
            }
        };
        bodies_json.extend_from_slice(b"{\"faces\":[");
        for (slot, face) in faces.iter().enumerate() {
            if slot > 0 {
                bodies_json.push(b',');
            }
            // Writing into a byte buffer cannot fail.
            serde_json::to_writer(&mut bodies_json, face).ok();
        }
        bodies_json.extend_from_slice(b"]}");
    }
    bodies_json.push(b']');
    let body_count = graph.bodies.len();

    let instances = if graph.instances.is_empty() {
        Vec::new()
    } else {
        let mini = build_mini(payload.payload(), header_end, &graph, &graph.instances);
        let document = parse_mini(&mini, provider)?;
        let body_indexes: Vec<u32> = graph
            .bodies
            .iter()
            .map(|position| graph.summaries[*position as usize].index)
            .collect();
        let ordinal: HashMap<u32, usize> = body_indexes
            .iter()
            .enumerate()
            .map(|(ordinal, index)| (*index, ordinal))
            .collect();
        placement::placements_for(&document, &body_indexes)
            .into_iter()
            .filter_map(|entry| {
                let ordinal = *ordinal.get(&entry.body)?;
                Some(json!({
                    "body": ordinal,
                    "rotation": entry.transform.rotation,
                    "translation": entry.transform.translation,
                    "scale": entry.transform.scale,
                }))
            })
            .collect()
    };

    Ok(StreamedExport {
        schema_key: payload.header().schema_key.clone(),
        largest_mini,
        bodies_json,
        body_count,
        instances,
        mapped_bodies,
        skipped_bodies,
        first_skip,
    })
}

fn parse_mini<P: SchemaProvider>(
    mini: &[u8],
    provider: &P,
) -> Result<parasolid_core::XtDocument, parasolid_core::ParseError> {
    let limits = DocumentLimits {
        max_file_size: mini.len().max(1),
        retain_raw_bytes: false,
        retain_source_offsets: false,
        ..DocumentLimits::default()
    };
    parse_xt(mini, provider, limits)
}

/// Assemble a standalone document from the header plus the given summaries.
///
/// Node ranges are copied verbatim; they already carry their own trailing
/// delimiter bytes, so no separators are inserted between nodes.
fn build_mini(payload: &[u8], header_end: usize, graph: &SummaryGraph, closure: &[u32]) -> Vec<u8> {
    let mut ranges: Vec<(u32, u32)> = closure
        .iter()
        .map(|position| {
            let summary = &graph.summaries[*position as usize];
            (summary.start, summary.end)
        })
        .collect();
    ranges.sort_unstable();
    ranges.dedup();
    let mut capacity = header_end.saturating_add(6);
    for (start, end) in &ranges {
        capacity = capacity.saturating_add(end.saturating_sub(*start) as usize);
    }
    let mut out = Vec::with_capacity(capacity);
    out.extend_from_slice(&payload[..header_end.min(payload.len())]);
    let mut cursor = header_end;
    for (start, end) in ranges {
        let start = start as usize;
        let end = (end as usize).min(payload.len());
        if start < cursor || end <= start {
            continue;
        }
        out.extend_from_slice(&payload[start..end]);
        cursor = end;
    }
    out.extend_from_slice(b"1 0\n");
    out
}

/// Pointer targets this export follows for one node; everything else
/// (attributes, meshes, keys, sibling and owner chains of geometry) is not
/// part of any body closure.
fn follow_targets(node: &RawNode) -> Vec<u32> {
    let mut targets = Vec::new();
    fn push(field: &parasolid_core::RawField, targets: &mut Vec<u32>) {
        for value in &field.values {
            if let FieldValue::PointerIndex(target) = value {
                targets.push(*target);
            }
        }
    }
    let named = |names: &[&str]| {
        node.fields
            .iter()
            .filter(|field| names.contains(&field.definition.name.as_str()))
            .collect::<Vec<_>>()
    };
    match node.node_type {
        12 => {
            for field in named(&["region", "edge", "vertex"]) {
                push(field, &mut targets);
            }
        }
        19 => {
            for field in named(&["body", "shell", "next"]) {
                push(field, &mut targets);
            }
        }
        13 => {
            for field in named(&["region", "face", "front_face", "edge", "vertex", "next"]) {
                push(field, &mut targets);
            }
        }
        14 => {
            for field in named(&["shell", "front_shell", "loop", "surface", "next", "next_front"]) {
                push(field, &mut targets);
            }
        }
        15 => {
            for field in named(&["face", "halfedge", "next"]) {
                push(field, &mut targets);
            }
        }
        17 => {
            for field in named(&["loop", "forward", "backward", "vertex", "other", "edge", "curve"]) {
                push(field, &mut targets);
            }
        }
        16 => {
            for field in named(&["halfedge", "curve", "next", "owner"]) {
                push(field, &mut targets);
            }
        }
        18 => {
            for field in named(&["point", "next", "owner"]) {
                push(field, &mut targets);
            }
        }
        29 => {}
        30..=39 | 46 | 48 | 50..=63 | 67..=69 | 124 | 126 | 133 | 134 | 136 | 137 | 40 | 41 | 45
        | 127 | 128 | 204 => {
            for field in &node.fields {
                let name = field.definition.name.as_str();
                if matches!(name, "owner" | "next" | "previous" | "geometric_owner") {
                    continue;
                }
                push(field, &mut targets);
            }
        }
        _ => {}
    }
    targets
}
