//! Node-type histogram for one transmit file, using the scan-only reader so
//! the whole file can be measured without retaining decoded nodes.

#[path = "../src/provider.rs"]
mod provider;

use parasolid_core::{DocumentLimits, InspectionLimits, SchemaKey, inspect_xt, scan_xt_node_types};

fn main() {
    let path = std::env::args().nth(1).expect("path");
    let bytes = std::fs::read(&path).expect("read");
    let mut limits = DocumentLimits::default();
    limits.max_file_size = bytes.len().max(1);
    limits.max_nodes = 50_000_000;
    limits.max_variable_elements = 50_000_000;
    limits.retain_raw_bytes = false;
    limits.retain_source_offsets = false;
    let header = inspect_xt(&bytes, inspection(limits)).expect("header");
    println!("schema {}", header.schema_key);
    let key = SchemaKey::parse(&header.schema_key).expect("key");
    let provider = provider::for_key(&key);
    let targets: Vec<u16> = (2u16..=1200).collect();
    let counts = scan_xt_node_types(&bytes, &provider, limits, &targets).expect("scan");
    println!("records {}", counts.record_count);

    // Keep set: every node type that carries a reviewed B-Rep role name, plus
    // instances/transforms/assemblies for placement.
    let keep: Vec<u16> = vec![
        10, 11, 100, 12, 13, 14, 15, 16, 17, 18, 19, 29, 30, 31, 32, 33, 34, 38, 40, 41, 45, 46,
        48, 50, 51, 52, 53, 54, 56, 59, 60, 67, 68, 69, 124, 126, 127, 128, 133, 134, 136, 137,
        204,
    ];
    let mut kept = 0usize;
    let mut dropped = 0usize;
    let mut rows: Vec<(u16, usize)> = counts
        .target_type_counts
        .iter()
        .filter(|(_, count)| **count > 0)
        .map(|(node_type, count)| (*node_type, *count))
        .collect();
    rows.sort_by_key(|(_, count)| std::cmp::Reverse(*count));
    for (node_type, count) in &rows {
        let marker = if keep.contains(node_type) { 'K' } else { ' ' };
        println!("  {marker} type {node_type:4} {count:>9}");
        if keep.contains(node_type) {
            kept += count;
        } else {
            dropped += count;
        }
    }
    println!("kept {kept} dropped {dropped}");
}

fn inspection(limits: DocumentLimits) -> InspectionLimits {
    InspectionLimits {
        max_file_size: limits.max_file_size,
        max_string_bytes: limits.max_string_bytes,
        retain_source_offsets: false,
    }
}
