import {type Point} from './point.js';
import {type QuadTreeBoundingBox, type AxisAlignedBoundingBox} from './aabb.js';
import {type QuadTreeTileType, empty} from './tile-type.js';
import {type Mode, find} from './search-mode.js';

/** Items inside the {@link QuadTree}. Could be a branch or a leaf */
export class QuadTreeNode {
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
}
