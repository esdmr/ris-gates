/** Coordinate in 2D space */
export class Point {
	constructor(readonly x: bigint, readonly y: bigint) {}

	equals(other: Point) {
		return this.x === other.x && this.y === other.y;
	}
}

/** Index for partitions of {@link QuadTreeNode} */
export type PartitionIndex = 0 | 1 | 2 | 3;

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
			x + width > targetX &&
			y + height > targetY
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
	 * Shrinks the bounding box to initialize some child partition.
	 *
	 * @param partitionIndex Index of that child partition.
	 */
	narrow(partitionIndex: PartitionIndex) {
		const {_subWidth} = this;

		return new QuadTreeBoundingBox(
			new Point(
				this.topLeft.x + _subWidth * BigInt(partitionIndex % 2),
				this.topLeft.y + _subWidth * BigInt(Math.trunc(partitionIndex / 2)),
			),
			_subWidth,
		);
	}

	/**
	 * Which partition contains some point. Assumes that the point is inside
	 * this bounding box.
	 */
	partitionIndex(point: Point) {
		const {_subWidth} = this;
		const dx = point.x - this.topLeft.x;
		const dy = point.y - this.topLeft.y;
		const xi = dx < _subWidth ? 0 : 1;
		const yi = dy < _subWidth ? 0 : 2;

		return (xi + yi) as PartitionIndex;
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
	/** Top left partition */
	0: QuadTreeNode | undefined;
	/** Top right partition */
	1: QuadTreeNode | undefined;
	/** Bottom left partition */
	2: QuadTreeNode | undefined;
	/** Bottom right partition */
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
	getContainingNode(aabb: AxisAlignedBoundingBox) {
		// eslint-disable-next-line unicorn/no-this-assignment, @typescript-eslint/no-this-alias
		let node: QuadTreeNode = this;
		let previousNode: QuadTreeNode | undefined;

		while (node.bounds.contains(aabb)) {
			if (node.type !== undefined) {
				return node;
			}

			const index = node.bounds.partitionIndex(aabb.topLeft);

			if (node[index]) {
				previousNode = node;
				node = node[index]!;
			} else {
				const bound = node.bounds.narrow(index);
				const newNode = new QuadTreeNode(bound, !node.parity);
				node[index] = newNode;
				previousNode = node;
				node = newNode;
			}
		}

		return previousNode;
	}

	/**
	 * Walks down the tree to find a tile at some point. `undefined` if point is
	 * out-of-bounds. Also `undefined` if trying to find a tile and failing.
	 */
	getTileData(point: Point, mode: 'make' | 'find') {
		// eslint-disable-next-line unicorn/no-this-assignment, @typescript-eslint/no-this-alias
		let node: QuadTreeNode = this;

		if (!node.bounds.has(point)) {
			return undefined;
		}

		while (!node.bounds.isTile) {
			assert(node.type === undefined);
			const index = node.bounds.partitionIndex(point);

			if (node[index]) {
				node = node[index]!;
			} else if (mode === 'find') {
				return undefined;
			} else {
				const bound = node.bounds.narrow(index);
				const newNode = new QuadTreeNode(bound, !node.parity);
				node[index] = newNode;
				node = newNode;
			}
		}

		assert(node.type !== undefined);
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
 * data, it will be `undefined`. This implementation is also expandable. It
 * starts at the origin and expands outwards as necessary, which lets us
 * partition a unbounded space.
 */
export class QuadTree {
	root = new QuadTreeNode(new QuadTreeBoundingBox(new Point(0n, 0n), 1n), true);

	/** @see {@link QuadTreeNode.getContainingNode} */
	getContainingNode(aabb: AxisAlignedBoundingBox) {
		this.expandToFit(aabb.topLeft);
		this.expandToFit(aabb.bottomRight);
		return this.root.getContainingNode(aabb)!;
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
