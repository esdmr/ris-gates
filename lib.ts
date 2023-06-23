export class Point {
	constructor(readonly x: bigint, readonly y: bigint) {}

	equals(other: Point) {
		return this.x === other.x && this.y === other.y;
	}
}

export type PartitionIndex = 0 | 1 | 2 | 3;

const cachedPowersOfTwo = new Set([1n]);

export class Rect {
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

	contains(rect: Rect) {
		const {x, y} = this.topLeft;
		const {x: targetX, y: targetY} = rect.topLeft;

		return (
			x <= targetX &&
			y <= targetY &&
			targetX + rect.width <= x + this.width &&
			targetY + rect.height <= y + this.height
		);
	}

	colliding(rect: Rect) {
		const {x, y} = this.topLeft;
		const {x: targetX, y: targetY} = rect.topLeft;

		return (
			x < targetX + rect.width &&
			y < targetY + rect.height &&
			targetX < x + this.width &&
			targetY < y + this.height
		);
	}
}

export class Square extends Rect {
	get isTile() {
		return this.width === 1n;
	}

	get subWidth() {
		return this.width / 2n;
	}

	constructor(readonly topLeft: Point, readonly width: bigint) {
		assert(width >= 1 && cachedPowersOfTwo.has(width));
		super(topLeft, width, width);
	}

	widen(even: boolean) {
		const {
			topLeft: {x, y},
			width,
		} = this;

		cachedPowersOfTwo.add(2n * width);
		return new Square(
			new Point(x - (even ? 0n : width), y - (even ? 0n : width)),
			2n * width,
		);
	}

	narrow(partitionIndex: PartitionIndex) {
		const {subWidth} = this;

		cachedPowersOfTwo.add(subWidth);
		return new Square(
			new Point(
				this.topLeft.x + subWidth * BigInt(partitionIndex % 2),
				this.topLeft.y +
					subWidth * BigInt(Math.trunc(partitionIndex / 2)),
			),
			subWidth,
		);
	}

	partitionIndex(point: Point) {
		const {subWidth} = this;
		const dx = point.x - this.topLeft.x;
		const dy = point.y - this.topLeft.y;
		const xi = dx < subWidth ? 0 : 1;
		const yi = dy < subWidth ? 0 : 2;

		return (xi + yi) as PartitionIndex;
	}
}

export type NodeType = 'source' | 'negate' | 'conjoin' | 'disjoin' | 'empty';

export class TreeNode {
	type: NodeType | undefined;

	/* eslint-disable @typescript-eslint/naming-convention */
	0: TreeNode | undefined;
	1: TreeNode | undefined;
	2: TreeNode | undefined;
	3: TreeNode | undefined;
	/* eslint-enable @typescript-eslint/naming-convention */

	constructor(readonly square: Square, readonly even: boolean) {
		this.type = square.isTile ? 'empty' : undefined;
	}

	getContainingNode(rect: Rect) {
		// eslint-disable-next-line unicorn/no-this-assignment, @typescript-eslint/no-this-alias
		let node: TreeNode = this;
		let previousNode = node;

		while (node.square.contains(rect)) {
			if (node.type !== undefined) {
				return node;
			}

			const index = node.square.partitionIndex(rect.topLeft);

			if (node[index]) {
				previousNode = node;
				node = node[index]!;
			} else {
				const square = node.square.narrow(index);
				const newNode = new TreeNode(square, !node.even);
				node[index] = newNode;
				previousNode = node;
				node = newNode;
			}
		}

		return previousNode;
	}

	getTileData(point: Point, mode: 'make' | 'find') {
		// eslint-disable-next-line unicorn/no-this-assignment, @typescript-eslint/no-this-alias
		let node: TreeNode = this;

		if (!node.square.has(point)) {
			return undefined;
		}

		while (!node.square.isTile) {
			assert(node.type === undefined);
			const index = node.square.partitionIndex(point);

			if (node[index]) {
				node = node[index]!;
			} else if (mode === 'find') {
				return undefined;
			} else {
				const square = node.square.narrow(index);
				const newNode = new TreeNode(square, !node.even);
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

export class SpacePartitioningTree {
	root = new TreeNode(new Square(new Point(0n, 0n), 1n), false);

	getContainingNode(rect: Rect) {
		this.expandToFit(rect.topLeft);
		this.expandToFit(rect.bottomRight);
		return this.root.getContainingNode(rect);
	}

	getTileData(point: Point, mode: 'make'): TreeNode;
	getTileData(point: Point, mode: 'find'): TreeNode | undefined;

	getTileData(point: Point, mode: 'make' | 'find') {
		this.expandToFit(point);
		return this.root.getTileData(point, mode);
	}

	private expandToFit(point: Point) {
		while (!this.root.square.has(point)) {
			const even = !this.root.even;
			const node = new TreeNode(this.root.square.widen(even), even);
			node[even ? 0 : 3] = this.root;
			this.root = node;
		}
	}
}
