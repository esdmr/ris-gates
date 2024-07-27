#![no_std]
mod assert;
mod eval;
mod log;
mod types;

use wasm_bindgen::prelude::*;

/// # Safety
///
/// See the safety requirements for [eval::State].
#[wasm_bindgen]
pub unsafe fn next_frame(
	vertices_ptr: *mut bool,
	edge_types_ptr: *const types::EdgeKind,
	edges_ptr: *const types::Edge,
	vertices_len: usize,
	positive_edges_len: usize,
) -> bool {
	// Safety: Caller must verify that this construction is valid.
	eval::next_frame(unsafe {
		&mut eval::State::new(
			vertices_ptr,
			edge_types_ptr,
			edges_ptr,
			vertices_len,
			positive_edges_len,
		)
	})
}
