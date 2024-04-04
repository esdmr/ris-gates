import {assert} from './assert.js';
import type {EvalGraph} from './eval.js';

class Mapping {
	private readonly _mapping: Uint32Array;
	private readonly _replacedVertices = new Set<number>();

	constructor(private readonly _graph: EvalGraph) {
		const mapping = new Uint32Array(_graph.verticesCount);
		this._mapping = mapping;

		for (let i = 0; i < mapping.length; i++) {
			mapping[i] = i;
		}
	}

	replace(oldVertex: number, newVertex: number) {
		const mapping = this._mapping;
		const graph = this._graph;

		assert(!graph.positiveEdges.has(oldVertex));
		assert(!graph.negativeEdges.has(oldVertex));
		assert(!graph.activeVertices.has(oldVertex));
		assert(!graph.inputVertices.has(oldVertex));

		// Cast safety: Mapping has a range of `0..verticesCount`. `newVertex`
		// should always be in-bounds.
		newVertex = mapping[newVertex]!;
		assert(mapping[oldVertex] === oldVertex);
		assert(mapping[newVertex] === newVertex);
		this._replacedVertices.add(oldVertex);

		for (let i = 0; i < mapping.length; i++) {
			if (mapping[i] === oldVertex) {
				mapping[i] = newVertex;
			}
		}
	}

	applyToGraph() {
		const mapping = this._mapping;
		const graph = this._graph;

		for (let i = 0, deletionCount = 0; i < mapping.length; i++) {
			if (mapping[i] === i) {
				mapping[i] = i - deletionCount;
			} else {
				deletionCount++;
			}
		}

		for (const from of this._replacedVertices) {
			// Cast safety: Mapping has a range of `0..verticesCount`. `from`
			// should always be in-bounds.
			mapping[from] = mapping[mapping[from]!]!;
		}

		for (const vertices of [
			graph.horizontalVertices,
			graph.verticalVertices,
		]) {
			for (const [tile, vertex] of vertices) {
				// Cast safety: Mapping has a range of `0..verticesCount`.
				// `vertex` should always be in-bounds.
				vertices.set(tile, mapping[vertex]!);
			}
		}

		// Cast safety: Mapping has a range of `0..verticesCount`. `target` and
		// `i` should always be in-bounds.
		graph.positiveEdges = new Map(
			[...graph.positiveEdges].map(
				([target, sources]) =>
					// eslint-disable-next-line @internal/no-object-literals
					[
						mapping[target]!,
						new Set([...sources].map((i) => mapping[i]!)),
					] as const,
			),
		);

		// Cast safety: Mapping has a range of `0..verticesCount`. `target` and
		// `i` should always be in-bounds.
		graph.negativeEdges = new Map(
			[...graph.negativeEdges].map(
				([target, sources]) =>
					// eslint-disable-next-line @internal/no-object-literals
					[
						mapping[target]!,
						new Set([...sources].map((i) => mapping[i]!)),
					] as const,
			),
		);

		// Cast safety: Mapping has a range of `0..verticesCount`. `i` should
		// always be in-bounds.
		graph.activeVertices = new Set(
			[...graph.activeVertices].map((i) => mapping[i]!),
		);

		// Cast safety: Mapping has a range of `0..verticesCount`. `i` should
		// always be in-bounds.
		graph.inputVertices = new Set(
			[...graph.inputVertices].map((i) => mapping[i]!),
		);

		graph.verticesCount -= this._replacedVertices.size;
		return this._replacedVertices.size;
	}
}

function optimizeConstantEdges(graph: EvalGraph) {
	let count = 0;

	for (const edges of [graph.positiveEdges, graph.negativeEdges]) {
		for (const [target, sources] of edges) {
			let modified = sources.delete(0);

			if (sources.size > 1 && sources.has(1)) {
				sources.clear();
				sources.add(1);
				modified = true;
			} else if (sources.size === 0) {
				edges.delete(target);
				modified = true;
			}

			if (modified) count++;
		}
	}

	return count;
}

function optimizeUnusedNegativeEdges(graph: EvalGraph) {
	const usedVertices = new Set<number>();

	for (const [, sources] of graph.positiveEdges) {
		for (const source of sources) {
			usedVertices.add(source);
		}
	}

	let count = 0;

	for (const [target] of graph.negativeEdges) {
		if (!usedVertices.has(target)) {
			graph.negativeEdges.delete(target);
			count++;
		}
	}

	return count;
}

function validateGraph(graph: EvalGraph) {
	for (const [target, sources] of graph.positiveEdges) {
		assert(!sources.has(target));
		assert(!graph.negativeEdges.has(target));
	}

	for (const [target, sources] of graph.negativeEdges) {
		assert(!sources.has(target));
		assert(!graph.positiveEdges.has(target));

		for (const source of sources) {
			assert(!graph.negativeEdges.has(source));
		}
	}

	return 0;
}

function optimizeConstantVertices(graph: EvalGraph) {
	const mapping = new Mapping(graph);

	for (let i = 2; i < graph.verticesCount; i++) {
		if (
			!graph.inputVertices.has(i) &&
			!graph.positiveEdges.has(i) &&
			!graph.negativeEdges.has(i)
		) {
			mapping.replace(i, Number(graph.activeVertices.delete(i)));
		}
	}

	return mapping.applyToGraph();
}

function optimizeAliasedVertices(graph: EvalGraph) {
	const mapping = new Mapping(graph);

	for (const [target, sources] of graph.positiveEdges) {
		const [source = 0] = sources;
		assert(!graph.activeVertices.has(target));

		if (
			sources.size === 1 &&
			!graph.activeVertices.has(source) &&
			!graph.inputVertices.has(source)
		) {
			graph.positiveEdges.delete(target);
			mapping.replace(target, source);
		}
	}

	return mapping.applyToGraph();
}

function simplifyUnidirectionalNegates(graph: EvalGraph) {
	for (const [tile, vertex] of graph.horizontalVertices) {
		if (vertex === 1) {
			graph.horizontalVertices.set(
				tile,
				graph.verticalVertices.get(tile) ?? vertex,
			);
		}
	}

	for (const [tile, vertex] of graph.verticalVertices) {
		if (vertex === 1) {
			graph.verticalVertices.set(
				tile,
				graph.horizontalVertices.get(tile) ?? vertex,
			);
		}
	}

	return 0;
}

export const optimizations: ReadonlyArray<(graph: EvalGraph) => number> = [
	validateGraph,
	optimizeConstantEdges,
	optimizeUnusedNegativeEdges,
	optimizeConstantVertices,
	optimizeAliasedVertices,
	simplifyUnidirectionalNegates,
];

export function optimize(graph: EvalGraph) {
	for (let updated = true; updated; ) {
		updated = false;

		for (const optimize of optimizations) {
			const delta = optimize(graph);
			if (import.meta.env.DEV) console.log(optimize.name, delta);
			if (delta > 0) updated = true;
		}
	}
}
