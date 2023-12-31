import {mapGet, setToggle} from './map-and-set.js';
import type {QuadTreeNode} from './node.js';
import type {Point} from './point.js';
import {RingBuffer} from './ring.js';
import * as tileType from './tile-type.js';
import {Interval, type Timer} from './timer.js';
import type {QuadTree} from './tree.js';
import {WalkStep} from './walk.js';

export class TilesMap {
	readonly tiles = new Map<string, QuadTreeNode>();
	readonly ioTiles = new Set<QuadTreeNode>();

	constructor(readonly tree: QuadTree) {
		const progress: WalkStep[] = [new WalkStep(tree.root)];

		while (progress.length > 0) {
			// Cast safety: length is at least one, so there is always a last
			// element.
			const {node, index} = progress.at(-1)!;

			if (node === undefined || index === 4 || node.type === tileType.empty) {
				progress.pop();

				if (progress.length > 0) {
					// Cast safety: length is at least one, so there is always a
					// last element.
					progress.at(-1)!.index++;
				}

				continue;
			}

			if (node.type === tileType.branch) {
				progress.push(new WalkStep(node[index]));
				continue;
			}

			if (node.type === tileType.io) {
				this.ioTiles.add(node);
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
		public x: symbol,
		public y: symbol,
	) {}
}

export class EvalGraph {
	readonly vertices = new Map<QuadTreeNode, symbol | NegateVertex>();
	readonly positiveEdges = new Map<symbol, Set<symbol>>();
	readonly negativeEdges = new Map<symbol, Set<symbol>>();
	readonly inputTiles = new Set<QuadTreeNode>();
	protected declare _toDot?: () => string;

	static {
		if (import.meta.env.DEV) {
			EvalGraph.prototype._toDot = function () {
				let output = 'digraph G {';

				for (const [to, from] of this.positiveEdges) {
					for (const fromSymbol of from) {
						output +=
							JSON.stringify(fromSymbol.description) +
							'->' +
							JSON.stringify(to.description) +
							';';
					}
				}

				for (const [to, from] of this.negativeEdges) {
					for (const fromSymbol of from) {
						output +=
							JSON.stringify(fromSymbol.description) +
							'->' +
							JSON.stringify(to.description) +
							'[color=red];';
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
			const vertex = this.vertices.get(tile);

			if (
				typeof vertex === 'symbol' &&
				!this.positiveEdges.has(vertex) &&
				!this.negativeEdges.has(vertex)
			) {
				this.inputTiles.add(tile);
			}
		}
	}

	// eslint-disable-next-line complexity
	private _processConjoin(
		tile: QuadTreeNode,
		other: QuadTreeNode,
		dir: number,
	) {
		const tileIsUpwards = (4 + (tile.type % 10) - dir) % 4 === 0;
		const otherIsDownwards =
			(4 + other.type - tileType.conjoinN - dir) % 4 === 2;

		switch (tile.type) {
			case tileType.io: {
				if (otherIsDownwards) {
					this._addEdge(other, tile);
				} else {
					this._addEdge(tile, other);
				}

				break;
			}

			case tileType.negate: {
				if (otherIsDownwards) {
					this._addEdge(other, tile, false);
				} else {
					this._addEdge(tile, other);
				}

				break;
			}

			case tileType.conjoinN:
			case tileType.conjoinE:
			case tileType.conjoinS:
			case tileType.conjoinW: {
				if (!tileIsUpwards && otherIsDownwards) {
					this._addEdge(other, tile);
				} else if (tileIsUpwards && !otherIsDownwards) {
					this._addEdge(tile, other);
				}

				break;
			}

			case tileType.disjoinN:
			case tileType.disjoinE:
			case tileType.disjoinS:
			case tileType.disjoinW: {
				if (tileIsUpwards && otherIsDownwards) {
					this._addEdge(other, tile);
				} else if (!tileIsUpwards && !otherIsDownwards) {
					this._addEdge(tile, other);
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
		other: QuadTreeNode,
		dir: number,
	) {
		const tileIsUpwards = (4 + (tile.type % 10) - dir) % 4 === 0;
		const otherIsDownwards =
			(4 + other.type - tileType.disjoinN - dir) % 4 === 2;

		switch (tile.type) {
			case tileType.io: {
				if (otherIsDownwards) {
					this._addEdge(tile, other);
				} else {
					this._addEdge(other, tile);
				}

				break;
			}

			case tileType.negate: {
				if (otherIsDownwards) {
					this._addEdge(tile, other);
				} else {
					this._addEdge(other, tile, false);
				}

				break;
			}

			case tileType.conjoinN:
			case tileType.conjoinE:
			case tileType.conjoinS:
			case tileType.conjoinW: {
				if (tileIsUpwards && otherIsDownwards) {
					this._addEdge(tile, other);
				} else if (!otherIsDownwards && !otherIsDownwards) {
					this._addEdge(other, tile);
				}

				break;
			}

			case tileType.disjoinN:
			case tileType.disjoinE:
			case tileType.disjoinS:
			case tileType.disjoinW: {
				if (!tileIsUpwards && otherIsDownwards) {
					this._addEdge(tile, other);
				} else if (tileIsUpwards && !otherIsDownwards) {
					this._addEdge(other, tile);
				}

				break;
			}

			default: {
				throw new TypeError('Invalid tile type');
			}
		}
	}

	private _symbolFor(tile: QuadTreeNode, other: QuadTreeNode) {
		const symbol = mapGet(this.vertices, tile, () => {
			const {x, y} = tile.bounds.topLeft;
			return tile.type === tileType.negate
				? new NegateVertex(Symbol(`X(${x}, ${y})`), Symbol(`Y(${x}, ${y})`))
				: Symbol(`Q(${x}, ${y})`);
		});

		return typeof symbol === 'symbol'
			? symbol
			: other.bounds.topLeft.y === tile.bounds.topLeft.y
			? symbol.x
			: symbol.y;
	}

	private _addEdge(from: QuadTreeNode, to: QuadTreeNode, positive = true) {
		const map = positive ? this.positiveEdges : this.negativeEdges;
		const symbolTo = this._symbolFor(to, from);
		mapGet(map, symbolTo, () => new Set()).add(this._symbolFor(from, to));
	}
}

const maxUndoCount = 128;
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

export class EvalContext {
	tickCount = 0n;
	tickType: 'tickForward' | 'tickBackward' | undefined;
	targetTick = -1n;
	readonly yieldedTiles;
	protected _enabled = new Set<symbol>();
	protected _timer: Timer | undefined;
	protected readonly _graph: EvalGraph;
	protected readonly _undoStack = new RingBuffer<
		Set<symbol> | typeof unchanged
	>(maxUndoCount);

	constructor(tree: QuadTree) {
		const graph = new EvalGraph(new TilesMap(tree));
		this._graph = graph;
		this.yieldedTiles = this._graph.inputTiles;

		for (const symbols of graph.vertices.values()) {
			if (typeof symbols === 'symbol') continue;
			this._enabled.add(symbols.x);
			this._enabled.add(symbols.y);
		}
	}

	input(tile: QuadTreeNode, value: boolean) {
		const symbol = this._graph.vertices.get(tile);
		if (typeof symbol !== 'symbol') return;
		setToggle(this._enabled, symbol, value);
	}

	output(tile: QuadTreeNode) {
		const symbol = this._graph.vertices.get(tile);
		return typeof symbol === 'symbol' && this._enabled.has(symbol);
	}

	tickForward() {
		this._undoStack.push(new Set(this._enabled));

		let anythingUpdated = false;
		this.tickCount++;
		if (import.meta.env.DEV) console.group('Next Tick:', this.tickCount);

		// Make sure this loop terminates. If you created a loop with an IO
		// tile, it would have produced a sub-tick pulse and cause this loop to
		// never end. Since the worst-case scenario for a non-looping circuit is
		// equal to the number of positive edges, we will terminate at that
		// point, plus one more for good measure. (Of course, this scenario
		// implies that there will never be a stable tick, which technically is
		// not supported.)
		for (
			let updated = true, count = this._graph.positiveEdges.size;
			updated && count >= 0;
			count--
		) {
			updated = false;

			for (const [to, from] of this._graph.positiveEdges) {
				let value = false;

				for (const fromSymbol of from) {
					value = this._enabled.has(fromSymbol);
					if (value) break;
				}

				if (this._enabled.has(to) !== value) {
					if (import.meta.env.DEV) console.log('+', to, value, from);
					setToggle(this._enabled, to, value);
					updated = true;
					anythingUpdated = true;
				}
			}
		}

		// Since only Conjoins and Disjoins can interact with other tiles, two
		// negative edges can never connect to each other. Therefore, no need to
		// loop multiple times here.
		for (const [to, from] of this._graph.negativeEdges) {
			let value = false;

			for (const fromSymbol of from) {
				value = this._enabled.has(fromSymbol);
				if (value) break;
			}

			if (this._enabled.has(to) === value) {
				if (import.meta.env.DEV) console.log('-', to, !value, from);
				setToggle(this._enabled, to, !value);
				anythingUpdated = true;
			}
		}

		if (import.meta.env.DEV) console.groupEnd();

		if (!anythingUpdated) {
			this._undoStack.updateLast(unchanged);
		}

		evalEvents.dispatchEvent(new EvalStepEvent(this, !anythingUpdated));
		return anythingUpdated;
	}

	tickBackward() {
		const oldState = this._undoStack.pop();
		if (!oldState) return false;
		this.tickCount--;
		if (import.meta.env.DEV) console.log('Previous Tick:', this.tickCount);
		if (oldState !== unchanged) this._enabled = oldState;
		evalEvents.dispatchEvent(new EvalStepEvent(this, oldState === unchanged));
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
