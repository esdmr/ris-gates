import {AxisAlignedBoundingBox} from '../lib/aabb.js';
import {Point} from '../lib/point.js';
import * as tileType from '../lib/tile-type.js';
import {WalkStep} from '../lib/walk.js';
import * as searchMode from '../lib/search-mode.js';
import {tree} from './tree.js';

export let isSelecting = false;
export let firstX = 0n;
export let firstY = 0n;
export let secondX = 0n;
export let secondY = 0n;

export function unselect() {
	isSelecting = false;
	document.body.classList.remove('selected');
}

export function setFirstPosition(fromX: bigint, fromY: bigint) {
	firstX = fromX;
	firstY = fromY;
	secondX = fromX;
	secondY = fromY;
	isSelecting = true;
	document.body.classList.add('selected');
}

export function setSecondPosition(toX: bigint, toY: bigint) {
	secondX = toX;
	secondY = toY;
}

export function getBox() {
	return new AxisAlignedBoundingBox(
		new Point(
			firstX > secondX ? secondX : firstX,
			firstY > secondY ? secondY : firstY,
		),
		firstX > secondX ? firstX - secondX + 1n : secondX - firstX + 1n,
		firstY > secondY ? firstY - secondY + 1n : secondY - firstY + 1n,
	);
}

class SavedTiles {
	constructor(
		readonly tiles: readonly tileType.QuadTreeTileType[],
		readonly width: number,
		readonly height: number,
	) {}
}

function get(display: AxisAlignedBoundingBox): SavedTiles {
	// eslint-disable-next-line @internal/no-object-literals
	const tiles = Array.from<tileType.QuadTreeTileType>({
		length: Number(display.width * display.height),
	}).fill(tileType.empty);

	const progress: WalkStep[] = [
		new WalkStep(tree.getContainingNode(display, searchMode.find)),
	];

	while (progress.length > 0) {
		// Cast safety: length is at least one, so there is always a last
		// element.
		const {node, index} = progress.at(-1)!;

		if (node === undefined || index === 4 || !display.colliding(node.bounds)) {
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

	return new SavedTiles(tiles, Number(display.width), Number(display.height));
}

function set({tiles, width, height}: SavedTiles, topLeft: Point) {
	const display = new AxisAlignedBoundingBox(
		topLeft,
		BigInt(width),
		BigInt(height),
	);

	const root = tree.getContainingNode(display, searchMode.make);

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

let savedTiles: SavedTiles | undefined;

export function copy() {
	if (isSelecting) {
		savedTiles = get(getBox());
		document.body.classList.add('used-clipboard');
	}
}

export function remove() {
	if (isSelecting) {
		const {width, height} = getBox();
		set(new SavedTiles([], Number(width), Number(height)), getBox().topLeft);
	}
}

export function cut() {
	copy();
	remove();
	unselect();
}

export function paste(point: Point) {
	if (savedTiles) {
		set(savedTiles, point);
		firstX = point.x;
		firstY = point.y;
		secondX = firstX + BigInt(savedTiles.width) - 1n;
		secondY = firstY + BigInt(savedTiles.height) - 1n;
	}
}

export function hasSavedTiles() {
	return Boolean(savedTiles);
}

export function discard() {
	savedTiles = undefined;
	document.body.classList.remove('used-clipboard');
}
