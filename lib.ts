/** Coordinate in 2D space */
export class Point {
	constructor(readonly x: bigint, readonly y: bigint) {}

	equals(other: Point) {
		return this.x === other.x && this.y === other.y;
	}
}

/** Index for child nodes of {@link QuadTreeNode} */
export type QuadTreeChildIndex = 0 | 1 | 2 | 3;

/**
 * Represents an axis-aligned area of screen consisting of the
 * {@link topLeft top left} point, {@link width}, and {@link height}. The right
 * and bottom edge are not part of it.
 */
export class AxisAlignedBoundingBox {
	get bottomRight() {
		return new Point(
			this.topLeft.x + this.width - 1n,
			this.topLeft.y + this.height - 1n,
		);
	}

	constructor(
		readonly topLeft: Point,
		readonly width: bigint,
		readonly height: bigint,
	) {}

	/** Is some {@link Point} inside this? */
	has(target: Point) {
		const {
			topLeft: {x, y},
			width,
			height,
		} = this;
		const {x: targetX, y: targetY} = target;

		return (
			x <= targetX &&
			y <= targetY &&
			targetX < x + width &&
			targetY < y + height
		);
	}

	/** Is some {@link AxisAlignedBoundingBox} inside this? */
	contains(aabb: AxisAlignedBoundingBox) {
		const {x, y} = this.topLeft;
		const {x: targetX, y: targetY} = aabb.topLeft;

		return (
			x <= targetX &&
			y <= targetY &&
			targetX + aabb.width <= x + this.width &&
			targetY + aabb.height <= y + this.height
		);
	}

	/** Are two {@link AxisAlignedBoundingBox} overlapping? (Order does not matter.) */
	colliding(aabb: AxisAlignedBoundingBox) {
		const {x, y} = this.topLeft;
		const {x: targetX, y: targetY} = aabb.topLeft;

		return (
			x < targetX + aabb.width &&
			y < targetY + aabb.height &&
			targetX < x + this.width &&
			targetY < y + this.height
		);
	}
}

/** A square {@link AxisAlignedBoundingBox} with a power of two {@link width} */
export class QuadTreeBoundingBox extends AxisAlignedBoundingBox {
	get isTile() {
		return this.width === 1n;
	}

	private get _subWidth() {
		return this.width / 2n;
	}

	constructor(topLeft: Point, width: bigint) {
		assert(width >= 1);
		super(topLeft, width, width);
	}

	/**
	 * Expands the bounding box for the root {@link QuadTreeNode}. To keep the
	 * {@link QuadTree} somewhat centered, we will grow it either down-right or
	 * up-left depending on its parity.
	 *
	 * @param parity Equal to `Math.log2(Number(this.width)) % 2 === 0`. Since
	 * we cannot use {@link Math.log2} directly on a {@link BigInt}, we will
	 * just start at `false` for the origin and invert at each step.
	 */
	widen(parity: boolean) {
		const {
			topLeft: {x, y},
			width,
		} = this;

		return new QuadTreeBoundingBox(
			new Point(x - (parity ? 0n : width), y - (parity ? 0n : width)),
			2n * width,
		);
	}

	/**
	 * Shrinks the bounding box to initialize some child node.
	 *
	 * @param childIndex Index of that child node.
	 */
	narrow(childIndex: QuadTreeChildIndex) {
		const {_subWidth} = this;

		return new QuadTreeBoundingBox(
			new Point(
				this.topLeft.x + _subWidth * BigInt(childIndex % 2),
				this.topLeft.y + _subWidth * BigInt(Math.trunc(childIndex / 2)),
			),
			_subWidth,
		);
	}

	/**
	 * Which child contains some point. Assumes that the point is inside this
	 * bounding box.
	 */
	childIndex(point: Point) {
		const {_subWidth} = this;
		const dx = point.x - this.topLeft.x;
		const dy = point.y - this.topLeft.y;
		const xi = dx < _subWidth ? 0 : 1;
		const yi = dy < _subWidth ? 0 : 2;

		// Cast safety: Adding {0, 1} and {0, 2} will always be between 0 and 3.
		return (xi + yi) as QuadTreeChildIndex;
	}
}

export type QuadTreeNodeType =
	| 'source'
	| 'negate'
	| 'conjoin'
	| 'disjoin'
	| 'empty';

/** Items inside the {@link QuadTree}. Could be a branch or a leaf */
export class QuadTreeNode {
	/** `undefined` if this node is a branch */
	type: QuadTreeNodeType | undefined;

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
		this.type = bounds.isTile ? 'empty' : undefined;
	}

	/**
	 * Chooses the smallest node which fully contains the
	 * {@link AxisAlignedBoundingBox}. `undefined` if
	 * {@link AxisAlignedBoundingBox} is out-of-bounds.
	 */
	getContainingNode(aabb: AxisAlignedBoundingBox, mode: 'make' | 'find') {
		// eslint-disable-next-line unicorn/no-this-assignment, @typescript-eslint/no-this-alias
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
			} else if (mode === 'find') {
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
	getTileData(point: Point, mode: 'make' | 'find') {
		// eslint-disable-next-line unicorn/no-this-assignment, @typescript-eslint/no-this-alias
		let node: QuadTreeNode = this;

		// `childIndex` requires an explicit bound check.
		if (!node.bounds.has(point)) {
			return undefined;
		}

		while (!node.bounds.isTile) {
			const index = node.bounds.childIndex(point);

			if (node[index]) {
				// Cast safety: We already checked for this.
				node = node[index]!;
			} else if (mode === 'find') {
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

export function assert(condition: unknown): asserts condition {
	if (!condition) {
		throw new Error('Assertion Error');
	}
}

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
	getContainingNode(aabb: AxisAlignedBoundingBox, mode: 'make' | 'find') {
		this.expandToFit(aabb.topLeft);
		this.expandToFit(aabb.bottomRight);
		// Cast safety: We expanded the QuadTree to fit the AABB.
		// `getContainingNode` is only nullish if the AABB does not fit.
		return this.root.getContainingNode(aabb, mode)!;
	}

	/** @see {@link QuadTreeNode.getTileData} */
	getTileData(point: Point, mode: 'make'): QuadTreeNode;
	/** @see {@link QuadTreeNode.getTileData} */
	getTileData(point: Point, mode: 'find'): QuadTreeNode | undefined;

	getTileData(point: Point, mode: 'make' | 'find') {
		this.expandToFit(point);
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
