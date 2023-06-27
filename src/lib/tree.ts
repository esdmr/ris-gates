import {QuadTreeBoundingBox, type AxisAlignedBoundingBox} from './aabb.js';
import {assertObject} from './assert.js';
import {roundedSqrt} from './bigint.js';
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
	static from(json: unknown) {
		try {
			assertObject(json);

			const bounds = QuadTreeBoundingBox.from(json.bounds);
			const {root} = json;

			// To avoid data manipulation/duplication errors, we manually
			// calculate the parity. If the width was an odd power of two (odd
			// parity), the result of sqrt would be rounded. Any errors caused
			// by that rounding indicates that parity is odd or `true`.
			const parity = roundedSqrt(bounds.width) ** 2n !== bounds.width;

			const node = QuadTreeNode.from(root, bounds, parity);
			const tree = new QuadTree();
			if (node) tree._root = node;
			return tree;
		} catch (error) {
			// eslint-disable-next-line @internal/no-object-literals
			throw new TypeError('Could not deserialize', {cause: error});
		}
	}

	private _root = new QuadTreeNode(
		new QuadTreeBoundingBox(new Point(0n, 0n), 1n),
		false,
	);

	get root() {
		return this._root;
	}

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

	// eslint-disable-next-line @typescript-eslint/naming-convention
	toJSON() {
		// eslint-disable-next-line @internal/no-object-literals
		return {
			root: this._root.toJSON(),
			bounds: this._root.bounds.toJSON(),
		};
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
