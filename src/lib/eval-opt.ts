import {assert} from './assert.js';
import type {EvalGraph} from './eval.js';

class Mapping {
	private readonly _replacements = new Map<number, number>();

	replace(oldVertex: number, newVertex: number) {
		this._replacements.set(oldVertex, newVertex);

		for (const [from, to] of this._replacements) {
			if (to === oldVertex) {
				this._replacements.set(from, newVertex);
			}
		}
	}

	apply(vertex: number) {
		vertex = this._replacements.get(vertex) ?? vertex;
		let offset = 0;

		for (const from of this._replacements.keys()) {
			if (from < vertex) {
				offset--;
			}
		}

		return vertex + offset;
	}

	applyToGraph(graph: EvalGraph) {
		const mapping: number[] = [];

		for (let i = 0; i < graph.verticesCount; i++) {
			mapping.push(this.apply(i));
		}

		for (const [from, to] of this._replacements) {
			assert(!graph.positiveEdges.has(from));
			assert(!graph.negativeEdges.has(from));
			assert(
				graph.activeVertices.has(from) === graph.activeVertices.has(to),
			);

			graph.activeVertices.delete(from);
		}

		for (const vertices of [
			graph.horizontalVertices,
			graph.verticalVertices,
		]) {
			for (const [tile, vertex] of vertices) {
				// Cast safety: Mapping has a range of 0..verticesCount. vertex
				// should always be in-bounds.
				vertices.set(tile, mapping[vertex]!);
			}
		}

		// Cast safety: Mapping has a range of 0..verticesCount. vertex should
		// always be in-bounds.
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

		// Cast safety: Mapping has a range of 0..verticesCount. vertex should
		// always be in-bounds.
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

		// Cast safety: Mapping has a range of 0..verticesCount. vertex should
		// always be in-bounds.
		graph.activeVertices = new Set(
			[...graph.activeVertices].map((i) => mapping[i]!),
		);

		graph.verticesCount -= this._replacements.size;
		return this._replacements.size;
	}
}

function optimizeEmptyEdges(graph: EvalGraph) {
	let count = 0;

	for (const edges of [graph.positiveEdges, graph.negativeEdges]) {
		for (const [target, sources] of edges) {
			const [item = 0] = sources;

			if (sources.size < 2 && item === 0) {
				edges.delete(target);
				count++;
			}
		}
	}

	return count;
}

function optimizeConstantVertices(graph: EvalGraph) {
	const variables = new Set<number>();

	for (const tile of graph.inputTiles) {
		const vertex = graph.horizontalVertices.get(tile);
		if (vertex) variables.add(vertex);
	}

	for (const edges of [graph.positiveEdges, graph.negativeEdges]) {
		for (const [target] of edges) {
			variables.add(target);
		}
	}

	const mapping = new Mapping();

	for (let i = 2; i < graph.verticesCount; i++) {
		if (!variables.has(i)) {
			mapping.replace(i, Number(graph.activeVertices.has(i)));
		}
	}

	return mapping.applyToGraph(graph);
}

function optimizeConstantEdges(graph: EvalGraph) {
	let count = 0;

	for (const edges of [graph.positiveEdges, graph.negativeEdges]) {
		for (const [, sources] of edges) {
			let modified = sources.delete(0);

			if (sources.has(1) && sources.size > 1) {
				sources.clear();
				sources.add(1);
				modified = true;
			}

			if (modified) count++;
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

export const optimizations: ReadonlyArray<(graph: EvalGraph) => number> = [
	validateGraph,
	optimizeEmptyEdges,
	optimizeConstantVertices,
	optimizeConstantEdges,
];
