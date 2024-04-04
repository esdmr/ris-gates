import {assert} from './assert.js';
import {JsEvaluator} from './eval-js.js';
import {optimizations} from './eval-opt.js';
// eslint-disable-next-line @internal/import-preference
import type * as EvalWasm from './eval-wasm.js';
import {mapGet} from './map-and-set.js';
import type {QuadTreeNode} from './node.js';
import type {Point} from './point.js';
import {PooledRingBuffer} from './ring.js';
import * as tileType from './tile-type.js';
import {Interval, type Timer} from './timer.js';
import type {QuadTree} from './tree.js';
import {WalkStep} from './walk.js';

export class TilesMap {
	readonly tiles = new Map<string, QuadTreeNode>();
	readonly negateTiles = new Set<QuadTreeNode>();
	readonly ioTiles = new Set<QuadTreeNode>();

	constructor(readonly tree: QuadTree) {
		const progress: WalkStep[] = [new WalkStep(tree.root)];

		while (progress.length > 0) {
			// Cast safety: length is at least one, so there is always a last
			// element.
			const {node, index} = progress.at(-1)!;

			if (
				node === undefined ||
				index === 4 ||
				node.type === tileType.empty
			) {
				progress.pop();

				if (progress.length > 0) {
					// Cast safety: length is at least one, so there is always a
					// last element.
					progress.at(-1)!.index++;
				}

				continue;
			}

			// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
			switch (node.type) {
				case tileType.branch: {
					progress.push(new WalkStep(node[index]));
					continue; // The loop, not the switch.
				}

				case tileType.negate: {
					this.negateTiles.add(node);
					break;
				}

				case tileType.io: {
					this.ioTiles.add(node);
					break;
				}

				// No default
			}

			const {x, y} = node.bounds.topLeft;
			this.tiles.set(`${x},${y}`, node);
			progress.pop();

			if (progress.length > 0) {
				// Cast safety: length is at least one, so there is always a last
				// element.
				progress.at(-1)!.index++;
			}
		}
	}

	getTile(point: Point) {
		return this.tiles.get(`${point.x},${point.y}`);
	}
}

export class NegateVertex {
	constructor(
		public x: bigint,
		public y: bigint,
	) {}
}

export class EvalGraph {
	horizontalVertices = new Map<QuadTreeNode, number>();
	verticalVertices = new Map<QuadTreeNode, number>();
	positiveEdges = new Map<number, Set<number>>();
	negativeEdges = new Map<number, Set<number>>();
	readonly inputTiles = new Set<QuadTreeNode>();
	// Vertex 0 is always false and vertex 1 is always true.
	activeVertices = new Set([1]);
	inputVertices = new Set<number>();
	verticesCount = 2;
	protected declare _toDot?: () => string;

	static {
		if (import.meta.env.DEV) {
			EvalGraph.prototype._toDot = function () {
				let output = 'digraph G {';

				for (const [target, sources] of this.positiveEdges) {
					for (const source of sources) {
						output += `${source} -> ${target};`;
					}
				}

				for (const [target, sources] of this.negativeEdges) {
					for (const source of sources) {
						output += `${source} -> ${target} [color=red];`;
					}
				}

				output += '}';
				return output;
			};
		}
	}

	constructor(readonly map: TilesMap) {
		for (const tile of map.tiles.values()) {
			const {x, y} = tile.bounds.topLeft;

			const adjacentTiles = [
				map.tiles.get(`${x},${y - 1n}`),
				map.tiles.get(`${x + 1n},${y}`),
				map.tiles.get(`${x},${y + 1n}`),
				map.tiles.get(`${x - 1n},${y}`),
			];

			for (const [dir, other] of adjacentTiles.entries()) {
				if (!other) {
					continue;
				}

				// Cast safety: Guaranteed to be a tile.
				const type = other.type as tileType.QuadTreeTileType;

				if (tileType.isRotatedFormOf(type, tileType.conjoinN)) {
					this._processConjoin(tile, other, dir);
				} else if (tileType.isRotatedFormOf(type, tileType.disjoinN)) {
					this._processDisjoin(tile, other, dir);
				}
			}
		}

		for (const tile of map.ioTiles) {
			const vertex = this.horizontalVertices.get(tile);

			if (
				vertex !== undefined &&
				!this.positiveEdges.has(vertex) &&
				!this.negativeEdges.has(vertex)
			) {
				this.inputTiles.add(tile);
				this.inputVertices.add(vertex);
			}
		}

		for (const tile of map.negateTiles) {
			const horizontal = this.horizontalVertices.get(tile);
			if (horizontal !== undefined) this.activeVertices.add(horizontal);

			const vertical = this.verticalVertices.get(tile);
			if (vertical !== undefined) this.activeVertices.add(vertical);
		}
	}

	// eslint-disable-next-line complexity
	private _processConjoin(
		tile: QuadTreeNode,
		conjoin: QuadTreeNode,
		dir: number,
	) {
		const tileIsPointingTowardsConjoin =
			(4 + (tile.type % 10) - dir) % 4 === 0;
		const conjoinIsPointingTowardsTile =
			(4 + conjoin.type - tileType.conjoinN - dir) % 4 === 2;

		switch (tile.type) {
			case tileType.io: {
				if (conjoinIsPointingTowardsTile) {
					this._addEdge(conjoin, tile);
				} else {
					this._addEdge(tile, conjoin);
				}

				break;
			}

			case tileType.negate: {
				if (conjoinIsPointingTowardsTile) {
					this._addEdge(conjoin, tile, false);
				} else {
					this._addEdge(tile, conjoin);
				}

				break;
			}

			case tileType.conjoinN:
			case tileType.conjoinE:
			case tileType.conjoinS:
			case tileType.conjoinW: {
				if (
					!tileIsPointingTowardsConjoin &&
					conjoinIsPointingTowardsTile
				) {
					this._addEdge(conjoin, tile);
				} else if (
					tileIsPointingTowardsConjoin &&
					!conjoinIsPointingTowardsTile
				) {
					this._addEdge(tile, conjoin);
				}

				break;
			}

			case tileType.disjoinN:
			case tileType.disjoinE:
			case tileType.disjoinS:
			case tileType.disjoinW: {
				if (
					tileIsPointingTowardsConjoin &&
					conjoinIsPointingTowardsTile
				) {
					this._addEdge(conjoin, tile);
				} else if (
					!tileIsPointingTowardsConjoin &&
					!conjoinIsPointingTowardsTile
				) {
					this._addEdge(tile, conjoin);
				}

				break;
			}

			default: {
				throw new TypeError('Invalid tile type');
			}
		}
	}

	// eslint-disable-next-line complexity
	private _processDisjoin(
		tile: QuadTreeNode,
		disjoin: QuadTreeNode,
		dir: number,
	) {
		const tileIsPointingTowardsDisjoin =
			(4 + (tile.type % 10) - dir) % 4 === 0;
		const disjoinIsPointingTowardsTile =
			(4 + disjoin.type - tileType.disjoinN - dir) % 4 === 2;

		switch (tile.type) {
			case tileType.io: {
				if (disjoinIsPointingTowardsTile) {
					this._addEdge(tile, disjoin);
				} else {
					this._addEdge(disjoin, tile);
				}

				break;
			}

			case tileType.negate: {
				if (disjoinIsPointingTowardsTile) {
					this._addEdge(tile, disjoin);
				} else {
					this._addEdge(disjoin, tile, false);
				}

				break;
			}

			case tileType.conjoinN:
			case tileType.conjoinE:
			case tileType.conjoinS:
			case tileType.conjoinW: {
				if (
					tileIsPointingTowardsDisjoin &&
					disjoinIsPointingTowardsTile
				) {
					this._addEdge(tile, disjoin);
				} else if (
					!disjoinIsPointingTowardsTile &&
					!disjoinIsPointingTowardsTile
				) {
					this._addEdge(disjoin, tile);
				}

				break;
			}

			case tileType.disjoinN:
			case tileType.disjoinE:
			case tileType.disjoinS:
			case tileType.disjoinW: {
				if (
					!tileIsPointingTowardsDisjoin &&
					disjoinIsPointingTowardsTile
				) {
					this._addEdge(tile, disjoin);
				} else if (
					tileIsPointingTowardsDisjoin &&
					!disjoinIsPointingTowardsTile
				) {
					this._addEdge(disjoin, tile);
				}

				break;
			}

			default: {
				throw new TypeError('Invalid tile type');
			}
		}
	}

	private _vertexFor(tile: QuadTreeNode, other: QuadTreeNode) {
		const horizontal = mapGet(
			this.horizontalVertices,
			tile,
			() => this.verticesCount++,
		);

		const vertical = mapGet(this.verticalVertices, tile, () =>
			tile.type === tileType.negate ? this.verticesCount++ : horizontal,
		);

		return other.bounds.topLeft.y === tile.bounds.topLeft.y
			? horizontal
			: vertical;
	}

	private _addEdge(from: QuadTreeNode, to: QuadTreeNode, positive = true) {
		const map = positive ? this.positiveEdges : this.negativeEdges;
		const vertexTo = this._vertexFor(to, from);
		mapGet(map, vertexTo, () => new Set()).add(this._vertexFor(from, to));
	}
}

const unchanged = Symbol('unchanged');
export const evalEvents = new EventTarget();

export class EvalEvent extends Event {
	constructor(
		readonly context: EvalContext,
		type: string,
		eventInitDict?: EventInit,
	) {
		super(type, eventInitDict);
	}
}

export class EvalStepEvent extends EvalEvent {
	constructor(
		context: EvalContext,
		readonly isStable: boolean,
		eventInitDict?: EventInit,
	) {
		super(context, 'update', eventInitDict);
	}
}

export type Evaluator = {
	graph: EvalGraph | undefined;
	input(vertex: number, value: boolean): void;
	output(vertex: number): boolean;
	load(source: ReadonlySet<number>): void;
	save(target: Set<number>): void;
	tickForward(): boolean;
};

export class EvalContext {
	tickCount = 0n;
	tickType: 'tickForward' | 'tickBackward' | undefined;
	targetTick = -1n;
	readonly yieldedTiles;
	protected _timer: Timer | undefined;
	protected readonly _undoStack;

	protected readonly _graph: EvalGraph;

	constructor(
		protected readonly _evaluator: Evaluator,
		undoCount: number,
	) {
		assert(_evaluator.graph);
		this._graph = _evaluator.graph;
		this.yieldedTiles = this._graph.inputTiles;
		this._undoStack = new PooledRingBuffer<Set<number> | typeof unchanged>(
			undoCount,
		);
	}

	isUnidirectional(tile: QuadTreeNode) {
		return (
			this._graph.horizontalVertices.get(tile) ===
			this._graph.verticalVertices.get(tile)
		);
	}

	input(tile: QuadTreeNode, value: boolean) {
		const vertex = this._graph.horizontalVertices.get(tile);
		if (vertex === undefined) return;
		this._evaluator.input(vertex, value);
	}

	outputHorizontal(tile: QuadTreeNode) {
		const vertex = this._graph.horizontalVertices.get(tile);
		return vertex !== undefined && this._evaluator.output(vertex);
	}

	outputVertical(tile: QuadTreeNode) {
		const vertex = this._graph.verticalVertices.get(tile);
		return vertex !== undefined && this._evaluator.output(vertex);
	}

	tickForward() {
		if (this._undoStack.size > 0) {
			const set = this._undoStack.getFromPool() ?? new Set();
			set.clear();
			this._evaluator.save(set);
			this._undoStack.push(set);
		}

		this.tickCount++;
		if (import.meta.env.DEV) console.group('Next Tick:', this.tickCount);

		try {
			const anythingUpdated = this._evaluator.tickForward();

			if (!anythingUpdated && this._undoStack.size > 0) {
				this._undoStack.updateLast(unchanged);
			}

			evalEvents.dispatchEvent(new EvalStepEvent(this, !anythingUpdated));
			return anythingUpdated;
		} finally {
			if (import.meta.env.DEV) console.groupEnd();
		}
	}

	tickBackward() {
		const oldState = this._undoStack.pop();
		if (!oldState) return false;
		this._undoStack.addToPool(oldState);
		this.tickCount--;
		if (import.meta.env.DEV) console.log('Previous Tick:', this.tickCount);
		if (oldState !== unchanged) this._evaluator.load(oldState);
		evalEvents.dispatchEvent(
			new EvalStepEvent(this, oldState === unchanged),
		);
		return oldState !== unchanged;
	}

	stop() {
		this._timer?.stop();
		this._timer = undefined;
	}

	start(rate: number | 0) {
		this.stop();
		this._timer = new Interval(1000 / rate, () => {
			this._step();
		});
	}

	protected _step() {
		if (!this.tickType) return;
		const updated = this[this.tickType]();
		if (this.targetTick > 0 ? --this.targetTick === 0n : !updated) {
			this.tickType = undefined;
		}
	}
}

let evalWasm: typeof EvalWasm;

// eslint-disable-next-line unicorn/prefer-top-level-await
import('./eval-wasm.js').then(
	(mod) => {
		evalWasm = mod;
	},
	(error) => {
		console.warn('Could not import the Wasm evaluator.', error);
	},
);

export function getEvaluator(tree: QuadTree, useWasm = false): Evaluator {
	const graph = new EvalGraph(new TilesMap(tree));

	if (import.meta.env.DEV) {
		console.group('Optimization');
		console.log(
			graph.verticesCount,
			graph.positiveEdges.size,
			graph.negativeEdges.size,
		);
	}

	try {
		for (let updated = true; updated; ) {
			updated = false;

			for (const optimize of optimizations) {
				const delta = optimize(graph);
				if (import.meta.env.DEV) console.log(optimize.name, delta);
				if (delta > 0) updated = true;
			}
		}
	} finally {
		if (import.meta.env.DEV) {
			console.log(
				graph.verticesCount,
				graph.positiveEdges.size,
				graph.negativeEdges.size,
			);
			console.groupEnd();
		}
	}

	try {
		if (evalWasm && useWasm) {
			evalWasm.setupWasmEvaluator(graph);
			return evalWasm.wasmEvaluator;
		}
	} catch (error) {
		console.error(
			'Failed to setup the Wasm evaluator. Falling back to the JS evaluator.',
			error,
		);
	}

	return new JsEvaluator(graph);
}
