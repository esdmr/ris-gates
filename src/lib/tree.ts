import {QuadTreeBoundingBox, type AxisAlignedBoundingBox} from './aabb.js';
import {QuadTreeNode} from './node.js';
import {Point} from './point.js';
import * as searchMode from './search-mode.js';

/**
 * Partitions space in four parts equally. If a partition does not contain any
 * data, it will be `undefined`.
 *
 * This implementation is also expandable. It starts at the origin and expands
 * outwards as necessary, which lets us partition an unbounded space.
 */
export class QuadTree {
	root = new QuadTreeNode(new QuadTreeBoundingBox(new Point(0n, 0n), 1n), true);

	/** @see {@link QuadTreeNode.getContainingNode} */
	getContainingNode(
		aabb: AxisAlignedBoundingBox,
		mode: typeof searchMode.make,
	): QuadTreeNode;
	/** @see {@link QuadTreeNode.getContainingNode} */
	getContainingNode(
		aabb: AxisAlignedBoundingBox,
		mode: typeof searchMode.find,
	): QuadTreeNode | undefined;

	/** @see {@link QuadTreeNode.getContainingNode} */
	getContainingNode(aabb: AxisAlignedBoundingBox, mode: searchMode.Mode) {
		if (mode === searchMode.make) {
			this._expandToFit(aabb.topLeft);
			this._expandToFit(aabb.getBottomRight());
		}

		return this._root.getContainingNode(aabb, mode) ?? this._root;
	}

	/** @see {@link QuadTreeNode.getTileData} */
	getTileData(point: Point, mode: typeof searchMode.make): QuadTreeNode;
	/** @see {@link QuadTreeNode.getTileData} */
	getTileData(
		point: Point,
		mode: typeof searchMode.find,
	): QuadTreeNode | undefined;

	getTileData(point: Point, mode: searchMode.Mode) {
		if (mode === searchMode.make) {
			this._expandToFit(point);
		}

		return this._root.getTileData(point, mode);
	}

	private _expandToFit(point: Point) {
		while (!this._root.bounds.has(point)) {
			const parity = !this._root.parity;
			const node = new QuadTreeNode(this._root.bounds.widen(parity), parity);
			node[parity ? 0 : 3] = this._root;
			this._root = node;
		}
	}
}
