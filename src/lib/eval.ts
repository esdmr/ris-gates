import {type QuadTreeNode} from './node.js';
import type {QuadTree} from './tree.js';
import {WalkStep} from './walk.js';
import * as tileType from './tile-type.js';
import {assert} from './assert.js';
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

			if (node.type === undefined) {
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
				if (tileType.isConjoin(other.type!)) {
					this._processConjoin(tile, other, dir);
				} else if (tileType.isDisjoin(other.type!)) {
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
		// Cast safety: Guaranteed to be a tile.
		const tileIsUpwards = (4 + (tile.type! % 10) - dir) % 4 === 0;
		// Cast safety: Guaranteed to be a tile.
		const otherIsDownwards =
			(4 + other.type! - tileType.conjoinN - dir) % 4 === 2;

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
					this._addEdge(other, tile);
				} else {
					this._addEdge(tile, other, false);
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
		// Cast safety: Guaranteed to be a tile.
		const tileIsUpwards = (4 + (tile.type! % 10) - dir) % 4 === 0;
		// Cast safety: Guaranteed to be a tile.
		const otherIsDownwards =
			(4 + other.type! - tileType.disjoinN - dir) % 4 === 2;

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
					this._addEdge(tile, other, false);
				} else {
					this._addEdge(other, tile);
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

export class EvalContext {
	static for(tree: QuadTree) {
		return new EvalContext(new EvalGraph(new TilesMap(tree)));
	}

	enabled = new Set<symbol>();
	tickCount = 0n;

	constructor(readonly graph: EvalGraph) {}

	input(tile: QuadTreeNode, value: boolean) {
		const symbol = this.graph.vertices.get(tile);
		assert(typeof symbol === 'symbol');
		setToggle(this.enabled, symbol, value);
	}

	output(tile: QuadTreeNode) {
		const symbol = this.graph.vertices.get(tile);
		assert(typeof symbol === 'symbol');
		return this.enabled.has(symbol);
	}

	tickUntilStable() {
		console.group('Tick until stability');
		while (this.tick());
		console.log('done');
		console.groupEnd();
	}

	tick() {
		let anythingUpdated = false;
		console.group(`Tick ${++this.tickCount}`);

		for (let updated = true; updated; ) {
			updated = false;

			for (const [to, from] of this.graph.negativeEdges) {
				let value = false;

				for (const fromSymbol of from) {
					value = this.enabled.has(fromSymbol);
					if (value) continue;
				}

				if (this.enabled.has(to) === value) {
					console.log('-', to, !value);
					setToggle(this.enabled, to, !value);
					updated = true;
					anythingUpdated = true;
				}
			}
		}

		for (let updated = true; updated; ) {
			updated = false;

			for (const [to, from] of this.graph.positiveEdges) {
				let value = false;

				for (const fromSymbol of from) {
					value = this.enabled.has(fromSymbol);
					if (value) continue;
				}

				if (this.enabled.has(to) !== value) {
					console.log('+', to, value);
					setToggle(this.enabled, to, value);
					updated = true;
					anythingUpdated = true;
				}
			}
		}

		console.groupEnd();
		return anythingUpdated;
	}
}
