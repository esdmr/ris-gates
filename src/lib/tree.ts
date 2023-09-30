import {QuadTreeBoundingBox, AxisAlignedBoundingBox} from './aabb.js';
import {assert, assertArray, assertObject} from './assert.js';
import {roundedSqrt} from './bigint.js';
import {QuadTreeNode} from './node.js';
import {Point} from './point.js';
import {Schematic} from './schematic.js';
import * as searchMode from './search-mode.js';
import {WalkStep} from './walk.js';
import * as tileType from './tile-type.js';

// eslint-disable-next-line @internal/no-object-literals
const currentSaveVersion = [1, 1] as const;

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

			const {version = [1, 0], sequence = ''} = json;
			assertArray(version);
			assert(
				version[0] === currentSaveVersion[0] &&
					typeof version[1] === 'number' &&
					version[1] <= currentSaveVersion[1] &&
					typeof sequence === 'string',
			);

			const bounds = QuadTreeBoundingBox.from(json.bounds);

			// To avoid data manipulation/duplication errors, we manually
			// calculate the parity. If the width was an odd power of two (odd
			// parity), the result of sqrt would be rounded. Any errors caused
			// by that rounding indicates that parity is odd or `true`.
			const parity = roundedSqrt(bounds.width) ** 2n !== bounds.width;

			const node = QuadTreeNode.from(json.root, bounds, parity);
			const tree = new QuadTree();
			tree.sequence = sequence;
			if (node) tree.root = node;
			return tree;
		} catch (error) {
			// eslint-disable-next-line @internal/no-object-literals
			throw new TypeError('Could not deserialize', {cause: error});
		}
	}

	root = new QuadTreeNode(
		new QuadTreeBoundingBox(new Point(0n, 0n), 1n),
		false,
	);

	sequence = '';

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
			this._expandToFit(point);
		}

		return this.root.getTileData(point, mode);
	}

	getSchematic(display: AxisAlignedBoundingBox): Schematic {
		// eslint-disable-next-line @internal/no-object-literals
		const tiles = Array.from<tileType.QuadTreeTileType>({
			length: Number(display.width * display.height),
		}).fill(tileType.empty);

		const progress: WalkStep[] = [
			new WalkStep(this.getContainingNode(display, searchMode.find)),
		];

		while (progress.length > 0) {
			// Cast safety: length is at least one, so there is always a last
			// element.
			const {node, index} = progress.at(-1)!;

			if (
				node === undefined ||
				index === 4 ||
				!display.colliding(node.bounds)
			) {
				progress.pop();

				if (progress.length > 0) {
					// Cast safety: length is at least one, so there is always a
					// last element.
					progress.at(-1)!.index++;
				}

				continue;
			}

			if (node.type === tileType.branch) {
				progress.push(new WalkStep(node[index]));
				continue;
			}

			const i = Number(node.bounds.topLeft.x - display.topLeft.x);
			const j = Number(node.bounds.topLeft.y - display.topLeft.y);

			tiles[i + j * Number(display.width)] = node.type;

			progress.pop();

			if (progress.length > 0) {
				// Cast safety: length is at least one, so there is always a last
				// element.
				progress.at(-1)!.index++;
			}
		}

		return new Schematic(Number(display.width), Number(display.height), tiles);
	}

	putSchematic({tiles, width, height}: Schematic, topLeft: Point) {
		const display = new AxisAlignedBoundingBox(
			topLeft,
			BigInt(width),
			BigInt(height),
		);

		const root = this.getContainingNode(display, searchMode.make);

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				// Cast safety: Point is always inside the display, and root
				// contains the display.
				root.getTileData(
					new Point(topLeft.x + BigInt(x), topLeft.y + BigInt(y)),
					searchMode.make,
				)!.type = tiles[x + y * width] ?? tileType.empty;
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	toJSON() {
		// eslint-disable-next-line @internal/no-object-literals
		return {
			version: currentSaveVersion,
			root: this.root.toJSON(),
			bounds: this.root.bounds.toJSON(),
			sequence: this.sequence,
		};
	}

	private _expandToFit(point: Point) {
		while (!this.root.bounds.has(point)) {
			const parity = !this.root.parity;
			const node = new QuadTreeNode(this.root.bounds.widen(parity), parity);
			node[parity ? 0 : 3] = this.root;
			this.root = node;
		}
	}
}
