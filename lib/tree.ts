import {QuadTreeBoundingBox, type AxisAlignedBoundingBox} from './aabb.js';
import {
	QuadTreeNode,
	type searchModeFind,
	type SearchMode,
	type searchModeMake,
} from './node.js';
import {Point} from './point.js';

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
	getContainingNode(aabb: AxisAlignedBoundingBox, searchMode: SearchMode) {
		this.expandToFit(aabb.topLeft);
		this.expandToFit(aabb.getBottomRight());
		// Cast safety: We expanded the QuadTree to fit the AABB.
		// `getContainingNode` is only nullish if the AABB does not fit.
		return this.root.getContainingNode(aabb, searchMode)!;
	}

	/** @see {@link QuadTreeNode.getTileData} */
	getTileData(point: Point, searchMode: typeof searchModeMake): QuadTreeNode;
	/** @see {@link QuadTreeNode.getTileData} */
	getTileData(
		point: Point,
		searchMode: typeof searchModeFind,
	): QuadTreeNode | undefined;

	getTileData(point: Point, searchMode: SearchMode) {
		this.expandToFit(point);
		return this.root.getTileData(point, searchMode);
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
