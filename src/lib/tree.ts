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
			this.expandToFit(aabb.topLeft);
			this.expandToFit(aabb.getBottomRight());
		}

		return this.root.getContainingNode(aabb, mode) ?? this.root;
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
			this.expandToFit(point);
		}

		return this.root.getTileData(point, mode);
	}

	private expandToFit(point: Point) {
		while (!this.root.bounds.has(point)) {
			const parity = !this.root.parity;
			const node = new QuadTreeNode(this.root.bounds.widen(parity), parity);
			node[parity ? 0 : 3] = this.root;
			this.root = node;
		}
	}
}
