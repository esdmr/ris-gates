use core::slice;

use wasm_bindgen::prelude::*;

use crate::log::log_edge;
use crate::ptr::{Readable, Writable};
use crate::types::{Edge, EdgeType};

#[wasm_bindgen]
pub unsafe fn next_frame(
	vertices_ptr: *mut bool,
	edge_types_ptr: *const u8,
	edges_ptr: *const usize,
	vertices_len: usize,
	positive_edges_len: usize,
) -> bool {
	let mut vertices = slice::from_raw_parts_mut(vertices_ptr, vertices_len);
	let edges = slice::from_raw_parts(edges_ptr as *const Edge, vertices_len);
	let edge_types = slice::from_raw_parts(edge_types_ptr as *const EdgeType, vertices_len);

	let mut anything_updated = false;

	// Make sure this loop terminates. If you created a loop with an IO
	// tile, it would have produced a sub-tick pulse and cause this loop to
	// never end. Since the worst-case scenario for a non-looping circuit is
	// equal to the number of positive edges, we will terminate at that
	// point, plus one more for good measure. (Of course, this scenario
	// implies that there will never be a stable tick, which technically is
	// not supported.)

	{
		let mut updated = true;
		let mut count = positive_edges_len + 1;

		while updated && count > 0 {
			updated = false;
			count -= 1;

			for i in 2..vertices_len {
				if edge_types.read(i) != EdgeType::PositiveEdge {
					continue;
				}

				let edge = edges.read(i);
				let (a, b, c, d) = edge;
				let target = i as usize;

				let value =
					vertices.read(a) || vertices.read(b) || vertices.read(c) || vertices.read(d);

				if value != vertices.read(target as usize) {
					log_edge('+', target, edge, value);
					vertices.write(target as usize, value);
					updated = true;
					anything_updated = true;
				}
			}
		}
	}

	// Since only Conjoins and Disjoins can interact with other tiles, two
	// negative edges can never connect to each other. Therefore, no need to
	// loop multiple times here.

	for i in 2..vertices_len {
		if edge_types.read(i) != EdgeType::NegativeEdge {
			continue;
		}

		let edge = edges.read(i);
		let (a, b, c, d) = edge;
		let target = i as usize;

		let value = !(vertices.read(a) || vertices.read(b) || vertices.read(c) || vertices.read(d));

		if value != vertices.read(target as usize) {
			log_edge('-', target, edge, value);
			vertices.write(target as usize, value);
			anything_updated = true;
		}
	}

	anything_updated
}
