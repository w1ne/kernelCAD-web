// The headless browser renderer cannot hold the whole-machine scene (hundreds
// of solids; the page crashes during mesh load), so the clip is rendered from
// a real excerpt of the same transmit: three bodies read and lowered by the
// same code path, written by `cargo run --release --example excerpt`.
const robot = await lib.fromCAD('/Volumes/LabWired/rp1-cad/rp1-one-body.x_t', { sourceUnit: 'm' });
return robot;
