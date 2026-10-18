//! Throwaway diagnostic: augment the chosen body's closure with the type
//! exemplars exactly like `excerpt` does, but record for every node which
//! (parent, field) introduced it, and report which follow() edges lead
//! outside the body's own (exemplar-free) closure.

#[path = "../src/provider.rs"]
mod provider;

use parasolid_core::{DocumentLimits, FieldValue, RawNode, RawField, SchemaKey, inspect_xt, parse_xt};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::env;
use std::fs;

fn main() {
    let input = env::args().nth(1).expect("input .x_t path");
    let body_index: u32 = env::args().nth(2).expect("seed body index").parse().unwrap();
    let bytes = fs::read(&input).expect("read input");
    let mut limits = DocumentLimits::default();
    limits.max_file_size = bytes.len().max(1);
    limits.max_nodes = 50_000_000;
    limits.max_variable_elements = 50_000_000;
    limits.retain_raw_bytes = false;
    let header = inspect_xt(
        &bytes,
        parasolid_core::InspectionLimits {
            max_file_size: limits.max_file_size,
            max_string_bytes: limits.max_string_bytes,
            retain_source_offsets: true,
        },
    )
    .expect("header");
    let key = SchemaKey::parse(&header.schema_key).expect("key");
    let provider = provider::for_key(&key);
    let document = parse_xt(&bytes, &provider, limits).expect("parse");
    let by_index: HashMap<u32, &RawNode> =
        document.nodes.iter().map(|node| (node.index, node)).collect();
    let mut first_of_type = BTreeMap::<u16, u32>::new();
    for node in &document.nodes {
        first_of_type.entry(node.node_type).or_insert(node.index);
    }

    if let Some(node) = by_index.get(&body_index) {
        for field in &node.fields {
            let ptrs: Vec<u32> = field
                .values
                .iter()
                .filter_map(|value| match value {
                    FieldValue::PointerIndex(target) if *target != 0 => Some(*target),
                    _ => None,
                })
                .collect();
            if !ptrs.is_empty() {
                println!(
                    "  seed field {}: {} values, first {:?}",
                    field.definition.name,
                    ptrs.len(),
                    &ptrs[..ptrs.len().min(8)]
                );
            }
        }
    }

    for probe_id in std::env::var("DEBUG_NODES")
        .unwrap_or_default()
        .split(',')
        .filter_map(|s| s.trim().parse::<u32>().ok())
    {
        match by_index.get(&probe_id) {
            Some(node) => {
                println!("node {probe_id} type {}:", node.node_type);
                for field in &node.fields {
                    let vals: Vec<String> = field
                        .values
                        .iter()
                        .map(|v| format!("{v:?}"))
                        .collect();
                    println!(
                        "   {} = {}",
                        field.definition.name,
                        vals.join(",").chars().take(160).collect::<String>()
                    );
                }
            }
            None => println!("node {probe_id}: not in document"),
        }
    }

    // Truth: the seed body's own closure, no exemplars.
    let truth = plain_closure(&by_index, body_index);
    println!("seed {body_index}: truth nodes {}", truth.len());
    let mut truth_sorted: Vec<_> = truth.iter().copied().collect();
    truth_sorted.sort_unstable();
    let truth_desc: Vec<String> = truth_sorted
        .iter()
        .map(|i| {
            format!(
                "{}:t{}",
                i,
                by_index.get(i).map(|n| n.node_type).unwrap_or(0)
            )
        })
        .collect();
    println!("  truth members: {}", truth_desc.join(" "));

    // Augmented walk identical to closure_of, with lineage.
    let mut seen = HashSet::<u32>::new();
    let mut lineage = HashMap::<u32, (u32, String)>::new();
    let mut stack = vec![body_index];
    lineage.insert(body_index, (0, "seed".into()));
    let mut foreign = Vec::<(u32, u32, String)>::new(); // (target, parent, field)
    while let Some(index) = stack.pop() {
        if !seen.insert(index) {
            continue;
        }
        let Some(node) = by_index.get(&index) else { continue };
        let mut push = |target: u32, field: &str, foreign: &mut Vec<(u32, u32, String)>| {
            if !seen.contains(&target) {
                if !truth.contains(&target) {
                    foreign.push((target, index, field.to_string()));
                }
                lineage.entry(target).or_insert((index, field.to_string()));
                stack.push(target);
            }
        };
        if let Some(first) = first_of_type.get(&node.node_type) {
            if *first != index {
                push(*first, "[exemplar]", &mut foreign);
            }
        }
        for (name, target) in follow_fields(node) {
            push(target, name, &mut foreign);
        }
    }
    println!("augmented nodes {}", seen.len());
    println!("foreign pushes {}", foreign.len());
    let mut counts = HashMap::<String, usize>::new();
    for (target, parent, field) in &foreign {
        let pt = by_index.get(parent).map(|n| n.node_type).unwrap_or(0);
        let tt = by_index.get(target).map(|n| n.node_type).unwrap_or(0);
        *counts
            .entry(format!("type{pt} -[{field}]-> type{tt}"))
            .or_default() += 1;
    }
    let mut rows: Vec<_> = counts.into_iter().collect();
    rows.sort_by(|a, b| b.1.cmp(&a.1));
    for (k, v) in rows.iter().take(24) {
        println!("  {v:5}  {k}");
    }
    for (target, _, _) in foreign.iter().take(6) {
        let mut chain = vec![*target];
        let mut cur = *target;
        for _ in 0..14 {
            match lineage.get(&cur) {
                Some((parent, field)) if *parent != 0 => {
                    chain.push(*parent);
                    let _ = field;
                    cur = *parent;
                }
                _ => break,
            }
        }
        let desc: Vec<String> = chain
            .iter()
            .map(|i| {
                format!(
                    "{}:t{}",
                    i,
                    by_index.get(i).map(|n| n.node_type).unwrap_or(0)
                )
            })
            .collect();
        println!("  chain {}", desc.join(" <- "));
    }
}

/// Plain closure without exemplars, restricted to the same follow edges.
fn plain_closure(by_index: &HashMap<u32, &RawNode>, seed: u32) -> HashSet<u32> {
    let mut seen = HashSet::new();
    let mut stack = vec![seed];
    while let Some(index) = stack.pop() {
        if !seen.insert(index) {
            continue;
        }
        let Some(node) = by_index.get(&index) else { continue };
        stack.extend(follow_fields(node).into_iter().map(|(_, target)| target));
    }
    seen
}

fn follow_fields(node: &RawNode) -> Vec<(&str, u32)> {
    let mut targets = Vec::new();
    fn push<'a>(field: &'a RawField, targets: &mut Vec<(&'a str, u32)>) {
        for value in &field.values {
            if let FieldValue::PointerIndex(target) = value {
                if *target != 0 {
                    targets.push((field.definition.name.as_str(), *target));
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
        16 => {
            for field in named(&["halfedge", "curve", "next"]) {
                push(field, &mut targets);
            }
        }
        17 => {
            for field in named(&["loop", "forward", "backward", "vertex", "other", "edge", "curve"]) {
                push(field, &mut targets);
            }
        }
        18 => {
            for field in named(&["point", "next"]) {
                push(field, &mut targets);
            }
        }
        29 => {}
        30..=39 | 46 | 48 | 50..=63 | 67..=69 | 124 | 126 | 133 | 134 | 136 | 137 | 38 | 40 | 41 | 45 | 127 | 128 | 204 => {
            for field in &node.fields {
                let name = field.definition.name.as_str();
                if matches!(name, "owner" | "next" | "previous" | "geometric_owner") {
                    continue;
                }
                push(field, &mut targets);
            }
        }
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
