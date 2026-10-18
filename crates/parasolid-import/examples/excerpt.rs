//! Write small, self-contained excerpts of one transmit file.
//!
//! The one-body mode picks a closed solid body whose faces use only analytic
//! surfaces and include a cylinder, keeps the transitive closure of the topology
//! and geometry it references (plus the first occurrence of every included node
//! type, whose inline schema bytes the stream needs), and writes a file that
//! re-parses and maps on its own. The two-instance mode adds two real instances
//! of that body with their assembly path so placements can be checked against
//! the file's own transforms.

#[path = "../src/provider.rs"]
mod provider;

use parasolid_core::{DocumentLimits, FieldValue, RawNode, SchemaKey, XtDocument, inspect_xt, parse_xt};
use parasolid_import::placement::{BodyPlacement, placements as resolve_placements};
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};
use std::env;
use std::fs;

fn main() {
    let mut args = env::args().skip(1);
    let input = args.next().expect("input .x_t path");
    let one_out = args.next().expect("one-body output path");
    let two_out = args.next();
    let bytes = fs::read(&input).expect("read input");
    let mut limits = DocumentLimits::default();
    limits.max_file_size = bytes.len().max(1);
    limits.max_nodes = 50_000_000;
    limits.max_variable_elements = 50_000_000;
    // Writing the excerpt needs node byte ranges, not a second copy of the
    // whole source; dropping the copy saves over a gigabyte on the full file.
    limits.retain_raw_bytes = false;

    let header = inspect_xt(&bytes, inspection(limits)).expect("header");
    let key = SchemaKey::parse(&header.schema_key).expect("key");
    let provider = provider::for_key(&key);
    let document = parse_xt(&bytes, &provider, limits).expect("parse");

    let by_index: HashMap<u32, &RawNode> = document.nodes.iter().map(|node| (node.index, node)).collect();
    let mut first_of_type = BTreeMap::<u16, u32>::new();
    for node in &document.nodes {
        first_of_type.entry(node.node_type).or_insert(node.index);
    }

    let all_placements = resolve_placements(&document, None);
    let mut placements_by_body = HashMap::<u32, Vec<BodyPlacement>>::new();
    for placement in all_placements {
        placements_by_body.entry(placement.body).or_default().push(placement);
    }
    println!(
        "placements total {} bodies {}",
        placements_by_body.values().map(Vec::len).sum::<usize>(),
        placements_by_body.len()
    );
    for node in document.nodes.iter().filter(|n| n.node_type == 11).take(4) {
        println!(
            "  instance {} fields {:?}",
            node.index,
            node.fields.iter().map(|f| format!("{}:{:?}", f.definition.name, f.values.first())).collect::<Vec<_>>()
        );
        if let Some(transform_index) = match node.fields.get(4).and_then(|f| f.values.first()) {
            Some(FieldValue::PointerIndex(target)) if *target != 0 => Some(*target),
            _ => None,
        } {
            if let Some(transform) = by_index.get(&transform_index) {
                println!(
                    "    transform node {} type {} fields {:?}",
                    transform_index,
                    transform.node_type,
                    transform.fields.iter().map(|f| format!("{}:{:?}", f.definition.name, f.values.first())).collect::<Vec<_>>()
                );
            } else {
                println!("    transform node {transform_index} not retained");
            }
        }
    }
    for placement in placements_by_body.values().flatten().take(6) {
        println!(
            "  placement body {} inst {} chain {} t {:?} s {}",
            placement.body, placement.instance, placement.chain.len(), placement.transform.translation, placement.transform.scale
        );
    }
    let candidates = candidate_bodies(&document, &by_index, &placements_by_body);
    if candidates.is_empty() {
        panic!("no buildable solid body with a cylinder");
    }
    for candidate in candidates.iter().take(8) {
        println!(
            "  candidate body {} faces {} closure {} bytes {} pair {:?} gap mm {:.3}",
            candidate.index,
            candidate.faces,
            candidate.nodes,
            candidate.bytes,
            candidate.pair.as_ref().map(|(first, _)| first.instance),
            candidate.gap * 1000.0
        );
    }
    let chosen = &candidates[0];
    println!("chosen body {}", chosen.index);

    let closure = closure_of(&by_index, &first_of_type, &[chosen.index]);
    let one = write_excerpt(&bytes, &document, &by_index, &closure, &one_out);
    println!("one-body nodes {} bytes {}", closure.len(), one);

    let placements = placements_by_body.get(&chosen.index).cloned().unwrap_or_default();
    println!("instances of body {}: {}", chosen.index, placements.len());
    for placement in placements.iter().take(8) {
        println!(
            "  inst {} chain {} translation [{:.6} {:.6} {:.6}] scale {:.6} det {:+.4}",
            placement.instance,
            placement.chain.len(),
            placement.transform.translation[0],
            placement.transform.translation[1],
            placement.transform.translation[2],
            placement.transform.scale,
            placement.transform.determinant()
        );
    }
    let pair = chosen.pair.clone();
    if let (Some(out), Some((first, second))) = (two_out, pair) {
        println!(
            "two-instance pair {} {} relative translation mm [{:.6} {:.6} {:.6}]",
            first.instance,
            second.instance,
            (second.transform.translation[0] - first.transform.translation[0]) * 1000.0,
            (second.transform.translation[1] - first.transform.translation[1]) * 1000.0,
            (second.transform.translation[2] - first.transform.translation[2]) * 1000.0
        );
        let mut seeds = vec![chosen.index];
        for placement in [&first, &second] {
            seeds.extend(placement.chain.iter().copied());
        }
        let closure = closure_of(&by_index, &first_of_type, &seeds);
        let n = write_excerpt(&bytes, &document, &by_index, &closure, &out);
        println!("two-instance nodes {} bytes {}", closure.len(), n);
    }
}

fn inspection(limits: DocumentLimits) -> parasolid_core::InspectionLimits {
    parasolid_core::InspectionLimits {
        max_file_size: limits.max_file_size,
        max_string_bytes: limits.max_string_bytes,
        retain_source_offsets: true,
    }
}

struct Candidate {
    index: u32,
    faces: usize,
    nodes: usize,
    bytes: usize,
    gap: f64,
    pair: Option<(BodyPlacement, BodyPlacement)>,
}

fn candidate_bodies(
    document: &XtDocument,
    by_index: &HashMap<u32, &RawNode>,
    placements_by_body: &HashMap<u32, Vec<BodyPlacement>>,
) -> Vec<Candidate> {
    let mut scored = Vec::new();
    let mut visited = HashSet::<u32>::new();
    for node in &document.nodes {
        if node.node_type != 12 || body_kind(node) != Some(1) {
            continue;
        }
        let pair = placements_by_body
            .get(&node.index)
            .and_then(|placements| translation_pair(placements));
        visited.clear();
        let mut stack = vec![node.index];
        let mut faces = 0usize;
        let mut buildable = true;
        let mut bytes = 0usize;
        while let Some(index) = stack.pop() {
            if !visited.insert(index) {
                continue;
            }
            let Some(current) = by_index.get(&index) else { continue };
            bytes += current.byte_range.end - current.byte_range.start;
            if current.node_type == 14 {
                faces += 1;
                match face_surface_type(by_index, current) {
                    Some(kind) if matches!(kind, 50..=54) => {}
                    _ => {
                        buildable = false;
                        break;
                    }
                }
                // Every boundary edge must ride an analytic line, circle or
                // ellipse; intersection and spline curves cannot be rebuilt as
                // exact wires from this export.
                if !face_curves_ok(by_index, current) {
                    buildable = false;
                    break;
                }
            }
            stack.extend(follow(current));
        }
        if !buildable || faces == 0 {
            continue;
        }
        let mut has_cylinder = false;
        for index in &visited {
            if let Some(current) = by_index.get(index) {
                if current.node_type == 14 && face_surface_type(by_index, current) == Some(51) {
                    has_cylinder = true;
                    break;
                }
            }
        }
        if !has_cylinder {
            continue;
        }
        scored.push(Candidate {
            index: node.index,
            faces,
            nodes: visited.len(),
            bytes,
            gap: pair.as_ref().map_or(0.0, |(_, _, gap)| *gap),
            pair: pair.map(|(first, second, _)| (first, second)),
        });
        if scored.len() >= 512 {
            break;
        }
    }
    scored.sort_by(|a, b| {
        b.pair
            .is_some()
            .cmp(&a.pair.is_some())
            .then(a.faces.cmp(&b.faces))
            .then(b.gap.partial_cmp(&a.gap).unwrap_or(std::cmp::Ordering::Equal))
            .then(a.bytes.cmp(&b.bytes))
    });
    let with_pair = scored.iter().filter(|c| c.pair.is_some()).count();
    println!("buildable solid bodies with a cylinder: {} (with a placed twin: {with_pair})", scored.len());
    scored
}

/// Two placements of one body with the same orientation whose translations
/// differ by at least 10 mm in file units (metres).
fn translation_pair(placements: &[BodyPlacement]) -> Option<(BodyPlacement, BodyPlacement, f64)> {
    let mut best: Option<(BodyPlacement, BodyPlacement, f64)> = None;
    for first in 0..placements.len() {
        for second in first + 1..placements.len() {
            let a = &placements[first].transform;
            let b = &placements[second].transform;
            let rotation_delta: f64 = a
                .rotation
                .iter()
                .zip(b.rotation.iter())
                .map(|(x, y)| (x - y).abs())
                .sum();
            if rotation_delta > 1e-9 {
                continue;
            }
            let gap: f64 = (0..3)
                .map(|k| (a.translation[k] - b.translation[k]).powi(2))
                .sum::<f64>()
                .sqrt();
            if gap < 0.01 {
                continue;
            }
            if best.as_ref().is_none_or(|(_, _, current)| gap > *current) {
                best = Some((
                    placements[first].clone(),
                    placements[second].clone(),
                    gap,
                ));
            }
        }
    }
    best
}

fn body_kind(node: &RawNode) -> Option<u8> {
    let field = node.fields.iter().find(|field| field.definition.name == "body_type")?;
    match field.values.first()? {
        FieldValue::UnsignedByte(value) => Some(*value),
        _ => None,
    }
}

fn pointer_field(node: &RawNode, name: &str) -> Option<u32> {
    let field = node.fields.iter().find(|field| field.definition.name == name)?;
    field.values.iter().find_map(|value| match value {
        FieldValue::PointerIndex(target) if *target != 0 => Some(*target),
        _ => None,
    })
}

fn face_curves_ok(by_index: &HashMap<u32, &RawNode>, face: &RawNode) -> bool {
    let Some(loop_head) = pointer_field(face, "loop") else { return false };
    let mut seen = HashSet::new();
    let mut loop_index = Some(loop_head);
    while let Some(current_loop) = loop_index {
        if !seen.insert(current_loop) {
            return false;
        }
        let Some(loop_node) = by_index.get(&current_loop) else { return false };
        let Some(fin_head) = pointer_field(loop_node, "halfedge") else { return false };
        let mut fin = Some(fin_head);
        let mut guard = 0;
        while let Some(fin_index) = fin {
            if guard > 0 && fin_index == fin_head {
                break;
            }
            guard += 1;
            if guard > 4096 || !seen.insert(fin_index) {
                return false;
            }
            let Some(fin_node) = by_index.get(&fin_index) else { return false };
            if let Some(edge_index) = pointer_field(fin_node, "edge") {
                let Some(edge_node) = by_index.get(&edge_index) else { return false };
                match pointer_field(edge_node, "curve").and_then(|index| by_index.get(&index)) {
                    Some(curve) if matches!(curve.node_type, 30..=32) => {}
                    Some(curve) if curve.node_type == 133 => {
                        match pointer_field(curve, "basis_curve").and_then(|index| by_index.get(&index)) {
                            Some(basis) if matches!(basis.node_type, 30..=32) => {}
                            _ => return false,
                        }
                    }
                    _ => return false,
                }
            }
            fin = pointer_field(fin_node, "forward");
        }
        loop_index = pointer_field(loop_node, "next");
    }
    true
}

fn face_has_loop(face: &RawNode) -> bool {
    face.fields
        .iter()
        .find(|field| field.definition.name == "loop")
        .is_some_and(|field| {
            field.values.iter().any(|value| matches!(value, FieldValue::PointerIndex(target) if *target != 0))
        })
}

fn face_surface_type(by_index: &HashMap<u32, &RawNode>, face: &RawNode) -> Option<u16> {
    let field = face.fields.iter().find(|field| field.definition.name == "surface")?;
    let FieldValue::PointerIndex(target) = field.values.first()? else {
        return None;
    };
    Some(by_index.get(target)?.node_type)
}

fn closure_of(
    by_index: &HashMap<u32, &RawNode>,
    first_of_type: &BTreeMap<u16, u32>,
    seeds: &[u32],
) -> BTreeSet<u32> {
    let mut closure = BTreeSet::new();
    let mut stack = seeds.to_vec();
    while let Some(index) = stack.pop() {
        if !closure.insert(index) {
            continue;
        }
        let Some(node) = by_index.get(&index) else { continue };
        if let Some(first) = first_of_type.get(&node.node_type) {
            if *first != index {
                // Push only; the main loop inserts and follows it on pop.
                stack.push(*first);
            }
        }
        stack.extend(follow(node));
    }
    closure
}

/// Pointer targets this tool keeps for each node, restricted to the fields the
/// mapper and the placement walk read. Everything else (attributes, meshes,
/// keys, sibling and owner chains of geometry) is dropped so the excerpt stays
/// small and stable.
fn follow(node: &RawNode) -> Vec<u32> {
    let mut targets = Vec::new();
    fn push(field: &parasolid_core::RawField, targets: &mut Vec<u32>) {
        for value in &field.values {
            if let FieldValue::PointerIndex(target) = value {
                if *target != 0 {
                    targets.push(*target);
                }
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
            for field in named(&["halfedge", "curve", "next"]) {
                push(field, &mut targets);
            }
        }
        18 => {
            for field in named(&["point", "next"]) {
                push(field, &mut targets);
            }
        }
        29 => {}
        // Geometry: keep every pointer except the sibling and owner chains.
        30..=39 | 46 | 48 | 50..=63 | 67..=69 | 124 | 126 | 133 | 134 | 136 | 137 | 38 | 40 | 41 | 45 | 127 | 128 | 204 => {
            for field in &node.fields {
                let name = field.definition.name.as_str();
                if matches!(name, "owner" | "next" | "previous" | "geometric_owner") {
                    continue;
                }
                push(field, &mut targets);
            }
        }
        // Instances: part, transform, parent assembly (their effective names are f0..fn).
        11 => {
            for index in [3usize, 4, 5] {
                if let Some(field) = node.fields.get(index) {
                    push(field, &mut targets);
                }
            }
        }
        10 | 100 => {}
        _ => {}
    }
    targets
}

fn write_excerpt(
    bytes: &[u8],
    document: &XtDocument,
    by_index: &HashMap<u32, &RawNode>,
    closure: &BTreeSet<u32>,
    path: &str,
) -> usize {
    let mut spans: Vec<_> = closure
        .iter()
        .filter_map(|index| by_index.get(index))
        .map(|node| (node.index, node.node_type, node.byte_range.clone()))
        .collect();
    spans.sort_by_key(|(_, _, span)| span.start);
    let header_end = document.header.header_range.end.min(bytes.len());
    let mut out = bytes[..header_end].to_vec();
    // The header reader already consumed the delimiter after its last token, so
    // exactly one separator belongs between the header and the first node.
    while out.last() == Some(&b' ') {
        out.pop();
    }
    out.push(b' ');
    let mut cursor = header_end;
    for (count, (index, node_type, span)) in spans.iter().enumerate() {
        if span.end > bytes.len() || span.start > span.end {
            continue;
        }
        if span.start < cursor && count > 0 {
            println!("  OVERLAP node {index} {}..{} cursor {cursor}", span.start, span.end);
        }
        if count < 12 {
            println!(
                "  span {count} node {index} type {node_type} {}..{} head {}",
                span.start,
                span.end,
                String::from_utf8_lossy(&bytes[span.start..(span.start + 24).min(span.end)])
            );
        }
        // Node ranges carry their own trailing delimiter bytes (a space after a
        // token field, nothing after a character field), so spans concatenate
        // verbatim with no separator between them.
        out.extend_from_slice(&bytes[span.start..span.end]);
        cursor = span.end;
    }
    out.extend_from_slice(&bytes[document.terminator.byte_range.clone()]);
    out.push(b'\n');
    fs::write(path, &out).expect("write excerpt");
    out.len()
}

fn pick_pair(placements: &[BodyPlacement]) -> Option<(BodyPlacement, BodyPlacement)> {
    let mut best: Option<(f64, usize, usize)> = None;
    for first in 0..placements.len() {
        for second in first + 1..placements.len() {
            let a = &placements[first].transform;
            let b = &placements[second].transform;
            let rotation_delta: f64 = a
                .rotation
                .iter()
                .zip(b.rotation.iter())
                .map(|(x, y)| (x - y).abs())
                .sum();
            let translation_delta: f64 = a
                .translation
                .iter()
                .zip(b.translation.iter())
                .map(|(x, y)| (x - y).abs())
                .sum();
            if rotation_delta < 1e-9 && translation_delta > 0.005 {
                if best.is_none_or(|(current, _, _)| translation_delta > current) {
                    best = Some((translation_delta, first, second));
                }
            }
        }
    }
    best.map(|(_, first, second)| (placements[first].clone(), placements[second].clone()))
}
