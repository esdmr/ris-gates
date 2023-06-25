import {QuadTreeBoundingBox, type AxisAlignedBoundingBox} from './aabb.js';
import {QuadTreeNode, type modeFind, type Mode, modeMake} from './node.js';
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
	getContainingNode(
		aabb: AxisAlignedBoundingBox,
		mode: typeof modeMake,
	): QuadTreeNode;
	/** @see {@link QuadTreeNode.getContainingNode} */
	getContainingNode(
		aabb: AxisAlignedBoundingBox,
		mode: typeof modeFind,
	): QuadTreeNode | undefined;

	/** @see {@link QuadTreeNode.getContainingNode} */
	getContainingNode(aabb: AxisAlignedBoundingBox, mode: Mode) {
		if (mode === modeMake) {
			this.expandToFit(aabb.topLeft);
			this.expandToFit(aabb.getBottomRight());
		}

		return this.root.getContainingNode(aabb, mode) ?? this.root;
	}

	/** @see {@link QuadTreeNode.getTileData} */
	getTileData(point: Point, mode: typeof modeMake): QuadTreeNode;
	/** @see {@link QuadTreeNode.getTileData} */
	getTileData(point: Point, mode: typeof modeFind): QuadTreeNode | undefined;

	getTileData(point: Point, mode: Mode) {
		if (mode === modeMake) {
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
