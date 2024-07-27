use wasm_bindgen::prelude::*;

use crate::types::Edge;

#[wasm_bindgen]
extern "C" {
	#[wasm_bindgen(js_namespace = console)]
	fn log(k: char, t: usize, a: usize, b: usize, c: usize, d: usize, v: bool);
}

#[cfg(not(risg_prod))]
pub fn print_edge(kind: char, target: usize, edge: &Edge, value: bool) {
	log(kind, target, edge.0, edge.1, edge.2, edge.3, value);
}

#[cfg(risg_prod)]
pub fn print_edge(_kind: char, _target: usize, _edge: &Edge, _value: bool) {
	// Nothing
}
