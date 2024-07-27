use core::slice::{from_raw_parts, from_raw_parts_mut};

use crate::assert::assert_unchecked;
use crate::log::print_edge;
use crate::types::{Edge, EdgeKind};

pub struct State<'data> {
	values: &'data mut [bool],
	edge_types: &'data [EdgeKind],
	edges: &'data [Edge],
	vertices_len: usize,
	positive_edges_len: usize,
}

impl<'data> State<'data> {
	/// # Safety
	///
	/// The pointers passed to this function need to follow the safety
	/// requirements of `core::slice::from_raw_parts[_mut]`, and must all have a
	/// length of `vertices_len`. `vertices_len` should be between 2 and
	/// `usize::MAX - 1`, and `positive_edges_len` smaller than `vertices_len`.
	pub unsafe fn new<'new>(
		vertices_ptr: *mut bool,
		edge_types_ptr: *const EdgeKind,
		edges_ptr: *const Edge,
		vertices_len: usize,
		positive_edges_len: usize,
	) -> State<'new> {
		let state = State {
			// Safety: Caller must verify that this construction is valid.
			values: unsafe { from_raw_parts_mut(vertices_ptr, vertices_len) },
			// Safety: Caller must verify that this construction is valid.
			edge_types: unsafe { from_raw_parts(edge_types_ptr, vertices_len) },
			// Safety: Caller must verify that this construction is valid.
			edges: unsafe { from_raw_parts(edges_ptr, vertices_len) },
			vertices_len,
			positive_edges_len,
		};

		state.assert_valid_state();

		for i in 2..vertices_len {
			state.assert_valid_edge(&state.edges[i]);
		}

		state
	}

	#[allow(clippy::multiple_unsafe_ops_per_block)]
	const fn assert_valid_state(&self) {
		// Safety: State is constructed through the `new` method. This means
		// that the following invariants are already handled.
		unsafe {
			assert_unchecked(self.values.len() == self.vertices_len);
			assert_unchecked(self.edge_types.len() == self.vertices_len);
			assert_unchecked(self.edges.len() == self.vertices_len);
			assert_unchecked(self.vertices_len >= 2);
			assert_unchecked(self.positive_edges_len <= self.vertices_len);
			assert_unchecked(self.positive_edges_len + 1 > 0);
		}
	}

	#[allow(clippy::multiple_unsafe_ops_per_block)]
	const fn assert_valid_edge(&self, sources: &Edge) {
		// Safety: State is constructed through the `new` method. This means
		// that the following invariants are already handled.
		unsafe {
			assert_unchecked(sources.0 < self.vertices_len);
			assert_unchecked(sources.1 < self.vertices_len);
			assert_unchecked(sources.2 < self.vertices_len);
			assert_unchecked(sources.3 < self.vertices_len);
		}
	}
}

fn process_edges(state: &mut State, kind: EdgeKind) -> bool {
	let mut updated = false;
	let is_negative = kind == EdgeKind::Negative;
	let symbol = if is_negative { '-' } else { '+' };

	state.assert_valid_state();

	for target in 2..state.vertices_len {
		if state.edge_types[target] != kind {
			continue;
		}

		let sources = &state.edges[target];
		state.assert_valid_edge(sources);

		let value = (state.values[sources.0]
			|| state.values[sources.1]
			|| state.values[sources.2]
			|| state.values[sources.3])
			^ is_negative;

		if value != state.values[target] {
			print_edge(symbol, target, sources, value);
			state.values[target] = value;
			updated = true;
		}
	}

	updated
}

pub fn next_frame(state: &mut State) -> bool {
	let mut anything_updated = false;

	state.assert_valid_state();

	// Make sure this loop terminates. If you created a loop with an IO
	// tile, it would have produced a sub-tick pulse and cause this loop to
	// never end. Since the worst-case scenario for a non-looping circuit is
	// equal to the number of positive edges, we will terminate at that
	// point, plus one more for good measure. (Of course, this scenario
	// implies that there will never be a stable tick, which technically is
	// not supported.)

	{
		let mut count = state.positive_edges_len + 1;

		while count > 0 {
			count -= 1;

			if process_edges(state, EdgeKind::Positive) {
				anything_updated = true;
			} else {
				break;
			}
		}
	}

	// Since only Conjoins and Disjoins can interact with other tiles, two
	// negative edges can never connect to each other. Therefore, no need to
	// loop multiple times here.

	if process_edges(state, EdgeKind::Negative) {
		anything_updated = true;
	}

	anything_updated
}
