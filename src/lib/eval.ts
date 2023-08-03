import {type QuadTreeNode} from './node.js';
import type {QuadTree} from './tree.js';
import {WalkStep} from './walk.js';
import * as tileType from './tile-type.js';
import {mapGet, setToggle} from './map-and-set.js';

export class TilesMap {
	readonly tiles = new Map<string, QuadTreeNode>();
	readonly io = new Set<QuadTreeNode>();
	readonly negates = new Set<QuadTreeNode>();

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

			const {x, y} = node.bounds.topLeft;
			this.tiles.set(`${x},${y}`, node);

			if (node.type === tileType.io) {
				this.io.add(node);
			} else if (node.type === tileType.negate) {
				this.negates.add(node);
			}

			progress.pop();

			if (progress.length > 0) {
				// Cast safety: length is at least one, so there is always a last
				// element.
				progress.at(-1)!.index++;
			}
		}
	}
}

export class EvalGraph {
	readonly vertices = new Map<QuadTreeNode, symbol | [h: symbol, v: symbol]>();
	readonly positiveEdges = new Map<symbol, Set<symbol>>();
	readonly negativeEdges = new Map<symbol, Set<symbol>>();
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
			] as const;

			for (const [dir, other] of adjacentTiles.entries()) {
				if (!other) {
					continue;
				}

				// Cast safety: Guaranteed to be a tile.
				const type = other.type as tileType.QuadTreeTileType;

				if (tileType.isConjoin(type)) {
					this._processConjoin(tile, other, dir);
				} else if (tileType.isDisjoin(type)) {
					this._processDisjoin(tile, other, dir);
				}
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
				? ([
						Symbol(`QTN(${x}, ${y}, H)`),
						Symbol(`QTN(${x}, ${y}, V)`),
				  ] as const)
				: Symbol(`QTN(${x}, ${y})`);
		});

		return typeof symbol === 'symbol'
			? symbol
			: other.bounds.topLeft.y === tile.bounds.topLeft.y
			? symbol[0]
			: symbol[1];
	}

	private _addEdge(from: QuadTreeNode, to: QuadTreeNode, positive = true) {
		const map = positive ? this.positiveEdges : this.negativeEdges;
		const symbolTo = this._symbolFor(to, from);
		mapGet(map, symbolTo, () => new Set()).add(this._symbolFor(from, to));
	}
}

const maxUndoCount = 128;
const unchanged = Symbol('unchanged');

export class EvalContext {
	static for(tree: QuadTree) {
		return new EvalContext(new EvalGraph(new TilesMap(tree)));
	}

	private _enabled = new Set<symbol>();
	private readonly _undoStack: Array<Set<symbol> | typeof unchanged> = [];
	private _tickCount = 0n;

	get canUndo() {
		return this._undoStack.length > 0;
	}

	get tickCount() {
		return this._tickCount;
	}

	constructor(private readonly _graph: EvalGraph) {
		for (const symbols of _graph.vertices.values()) {
			if (!Array.isArray(symbols)) continue;
			this._enabled.add(symbols[0]);
			this._enabled.add(symbols[1]);
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

	tickForwardUntilStable() {
		console.group('Tick forward until stable');
		while (this.tickForward());
		console.log('done');
		console.groupEnd();
	}

	tickForward() {
		this._undoStack.push(new Set(this._enabled));
		if (this._undoStack.length > maxUndoCount) this._undoStack.shift();

		let anythingUpdated = false;
		console.group('Next Tick:', ++this._tickCount);

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
					console.log('+', from, to, value);
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
				console.log('-', from, to, !value);
				setToggle(this._enabled, to, !value);
				anythingUpdated = true;
			}
		}

		console.groupEnd();

		if (!anythingUpdated) {
			this._undoStack[this._undoStack.length - 1] = unchanged;
		}

		return anythingUpdated;
	}

	tickBackwardUntilStable() {
		console.group('Tick backward until stable');
		while (this.tickBackward());
		console.log('done');
		console.groupEnd();
	}

	tickBackward() {
		const oldState = this._undoStack.pop();
		if (!oldState) return false;
		console.log('Previous Tick:', --this._tickCount);
		if (oldState !== unchanged) this._enabled = oldState;
		return oldState !== unchanged;
	}
}
