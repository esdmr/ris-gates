import {
	type AxisAlignedBoundingBox,
	type QuadTreeBoundingBox,
	type QuadTreeChildIndex,
} from './aabb.js';
import {assert, assertArray} from './assert.js';
import {type Point} from './point.js';
import {find, type Mode} from './search-mode.js';
import {serializedBranch, empty, type QuadTreeTileType} from './tile-type.js';

/** Items inside the {@link QuadTree}. Could be a branch or a leaf */
export class QuadTreeNode {
	static from(value: unknown, bounds: QuadTreeBoundingBox, parity: boolean) {
		if (value === serializedBranch) return undefined;

		const node = new QuadTreeNode(bounds, parity);

		if (typeof value === 'number') {
			assert(bounds.width === 1n);

			// Cast safety: This is unsafe, actually.
			//
			// FIXME: Add assertion.
			node.type = value as QuadTreeTileType;
			return node;
		}

		assert(bounds.width > 1n);
		assertArray(value);

		if (value.length === 2) {
			const [key, subValue] = value;
			assert(key === 0 || key === 1 || key === 2 || key === 3);
			node[key] = QuadTreeNode.from(subValue, bounds.narrow(key), !parity);
			return node;
		}

		assert(value.length === 4);

		for (let i = 0; i < 4; i++) {
			// Cast safety: Value of i is between 0 and 3, exactly the same as
			// QuadTreeChildIndex.
			const index = i as QuadTreeChildIndex;
			node[index] = QuadTreeNode.from(
				value[index],
				bounds.narrow(index),
				!parity,
			);
		}

		return node;
	}

	/** `undefined` if this node is a branch */
	type: QuadTreeTileType | undefined;

	/* eslint-disable @typescript-eslint/naming-convention */
	/** Top left child */
	0: QuadTreeNode | undefined;
	/** Top right child */
	1: QuadTreeNode | undefined;
	/** Bottom left child */
	2: QuadTreeNode | undefined;
	/** Bottom right child */
	3: QuadTreeNode | undefined;
	/* eslint-enable @typescript-eslint/naming-convention */

	constructor(
		readonly bounds: QuadTreeBoundingBox,
		/** @see {@link QuadTreeBoundingBox.widen} */
		readonly parity: boolean,
	) {
		this.type = bounds.isTile() ? empty : undefined;
	}

	/**
	 * Chooses the smallest node which fully contains the
	 * {@link AxisAlignedBoundingBox}. `undefined` if
	 * {@link AxisAlignedBoundingBox} is out-of-bounds.
	 */
	getContainingNode(aabb: AxisAlignedBoundingBox, mode: Mode) {
		let node: QuadTreeNode = this;
		let previousNode: QuadTreeNode | undefined;

		while (node.bounds.contains(aabb)) {
			if (node.type !== undefined) {
				// Tile contains the bounding box. Since we cannot go any
				// deeper, we stop.
				return node;
			}

			// Try to see if some child node contains the AABB.
			const index = node.bounds.childIndex(aabb.topLeft);

			if (node[index]) {
				previousNode = node;
				// Cast safety: We checked for this already.
				node = node[index]!;
			} else if (mode === find) {
				// Child node is not initialized. We will exit early.
				return node;
			} else {
				// Child node is not initialized. We will keep initializing
				// until we get a tight fit.
				const bound = node.bounds.narrow(index);
				const newNode = new QuadTreeNode(bound, !node.parity);
				node[index] = newNode;
				node = newNode;
			}
		}

		// Child node did not contain the AABB. Since the parent did, return
		// that.
		return previousNode;
	}

	/**
	 * Walks down the tree to find a tile at some point. `undefined` if point is
	 * out-of-bounds. Also `undefined` if trying to find a tile and failing.
	 *
	 * @param mode `make` tries to create a tile if uninitialized. `find` will
	 * just return `undefined`.
	 */
	getTileData(point: Point, mode: Mode) {
		let node: QuadTreeNode = this;

		// `childIndex` requires an explicit bound check.
		if (!node.bounds.has(point)) {
			return undefined;
		}

		while (!node.bounds.isTile()) {
			const index = node.bounds.childIndex(point);

			if (node[index]) {
				// Cast safety: We already checked for this.
				node = node[index]!;
			} else if (mode === find) {
				// Child node is not initialized. We will exit early.
				return undefined;
			} else {
				// Child node is not initialized. We will keep initializing
				// until we get a tight fit.
				const bound = node.bounds.narrow(index);
				const newNode = new QuadTreeNode(bound, !node.parity);
				node[index] = newNode;
				node = newNode;
			}
		}

		// Found a tile node. We need not check its bounds, the initial bounds
		// check and childIndex is enough to guarantee that.
		return node;
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	toJSON() {
		if (this.type !== undefined) return this.type;

		const emptyBranches =
			Number(this[0] === undefined) +
			Number(this[1] === undefined) +
			Number(this[2] === undefined) +
			Number(this[3] === undefined);

		if (emptyBranches === 4) return serializedBranch;

		if (emptyBranches < 3) {
			return [
				this[0] ?? serializedBranch,
				this[1] ?? serializedBranch,
				this[2] ?? serializedBranch,
				this[3] ?? serializedBranch,
			];
		}

		if (this[0] !== undefined) return [0, this[0]];
		if (this[1] !== undefined) return [1, this[1]];
		if (this[2] !== undefined) return [2, this[2]];
		assert(this[3] !== undefined);
		return [3, this[3]];
	}
}
