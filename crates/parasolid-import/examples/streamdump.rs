//! Dump one body's streamed mini-document plus the spans of two node indexes.

#[path = "../src/provider.rs"]
mod provider;

use parasolid_core::{CompactXtPayload, DocumentLimits, InspectionLimits, SchemaKey, compact_xt_owned};
use parasolid_import::stream::SummaryGraph;

fn main() {
    let path = std::env::args().nth(1).expect("path");
    let body_index: u32 = std::env::args().nth(2).expect("body node index").parse().expect("u32");
    let node_index: u32 = std::env::args().nth(3).expect("probe node index").parse().expect("u32");
    let bytes = std::fs::read(&path).expect("read");
    let mut limits = DocumentLimits::default();
    limits.max_file_size = bytes.len().max(1);
    limits.max_nodes = 50_000_000;
    limits.max_variable_elements = 50_000_000;
    limits.retain_raw_bytes = false;
    let inspection = InspectionLimits {
        max_file_size: limits.max_file_size,
        max_string_bytes: limits.max_string_bytes,
        retain_source_offsets: false,
    };
    let payload: CompactXtPayload = compact_xt_owned(bytes, inspection).expect("compact");
    let key = SchemaKey::parse(payload.header().schema_key.as_str()).expect("key");
    let provider = provider::for_key(&key);
    let (graph, _registry) = SummaryGraph::build(&payload, &provider, limits).expect("graph");
    if let Some(counts) = graph.closure_type_counts(body_index) {
        println!("closure types: {:?}", counts.iter().take(12).collect::<Vec<_>>());
    }
    let mini = graph.mini_for_body(&payload, body_index).expect("mini");
    println!("mini bytes {}", mini.len());
    if let Some((node_type, start, end)) = graph.node_span(node_index) {
        println!("node {node_index} type {node_type} {start}..{end}");
        let debug: String = String::from_utf8_lossy(&payload.payload()[start..end.min(start + 400)]).to_string();
        println!("text: {debug}");
        // is the first-of-type for this node's type present in the mini? parse the mini and count
    } else {
        println!("node {node_index} not summarized");
    }
    std::fs::write("/tmp/rp1-evidence/mini-body.x_t", &mini).ok();
}
