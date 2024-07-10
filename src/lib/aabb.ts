import {assert, assertObject} from './assert.js';
import {asBigInt, isPowerOfTwo, parseBigInt, toBigInt} from './bigint.js';
import {Point} from './point.js';

/**
 * Represents an axis-aligned area of screen consisting of the
 * {@link topLeft top left} point, {@link width}, and {@link height}. The right
 * and bottom edge are not part of it.
 */
export class AxisAlignedBoundingBox {
	constructor(
		readonly topLeft: Point,
		readonly width: bigint,
		readonly height: bigint,
	) {}

	getBottomRight() {
		return new Point(
			this.topLeft.x + this.width - 1n,
			this.topLeft.y + this.height - 1n,
		);
	}

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

/** Index for child nodes of {@link QuadTreeNode} */
export type QuadTreeChildIndex = 0 | 1 | 2 | 3;

/** A square {@link AxisAlignedBoundingBox} with a power of two {@link width} */
export class QuadTreeBoundingBox extends AxisAlignedBoundingBox {
	static from(value: unknown) {
		assertObject(value);
		assert(typeof value.x === 'string');
		assert(typeof value.y === 'string');
		assert(typeof value.w === 'string');

		const w = parseBigInt(value.w);
		assert(isPowerOfTwo(w));

		return new QuadTreeBoundingBox(
			new Point(parseBigInt(value.x), parseBigInt(value.y)),
			w,
		);
	}

	constructor(topLeft: Point, width: bigint) {
		assert(width >= 1);
		super(topLeft, width, width);
	}

	isTile() {
		return this.width === 1n;
	}

	/**
	 * Expands the bounding box for the root {@link QuadTreeNode}. To keep the
	 * {@link QuadTree} somewhat centered, we will grow it either down-right or
	 * up-left depending on its parity.
	 *
	 * @param parity Equal to `Math.log2(asNumber(this.width)) % 2 === 0`. Since
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
		const subWidth = this.width / 2n;

		return new QuadTreeBoundingBox(
			new Point(
				this.topLeft.x + subWidth * asBigInt(childIndex % 2),
				this.topLeft.y + subWidth * toBigInt(childIndex / 2),
			),
			subWidth,
		);
	}

	/**
	 * Which child contains some point. Assumes that the point is inside this
	 * bounding box.
	 */
	childIndex(point: Point) {
		const subWidth = this.width / 2n;

		const dx = point.x - this.topLeft.x;
		const dy = point.y - this.topLeft.y;
		const xi = dx < subWidth ? 0 : 1;
		const yi = dy < subWidth ? 0 : 2;

		// Cast safety: Adding {0, 1} and {0, 2} will always be between 0 and 3.
		return (xi + yi) as QuadTreeChildIndex;
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	toJSON() {
		// eslint-disable-next-line @internal/no-object-literals
		return {
			x: String(this.topLeft.x),
			y: String(this.topLeft.y),
			w: String(this.width),
		};
	}
}
