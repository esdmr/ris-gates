import {canvas, context} from './input/canvas.js';
import {getSelectedTileType} from './input/controls.js';
import * as pointer from './input/pointer.js';
import * as wheel from './input/wheel.js';
import {AxisAlignedBoundingBox} from './lib/aabb.js';
import {FloatingBigInt} from './lib/floating-bigint.js';
import * as searchMode from './lib/search-mode.js';
import * as tileType from './lib/tile-type.js';
import {Point} from './lib/point.js';
import {QuadTree} from './lib/tree.js';
import {WalkStep} from './lib/walk.js';

declare global {
	/** @internal For debug purposes only. */
	// eslint-disable-next-line no-var
	var tree: QuadTree;
}

const tree = new QuadTree();
globalThis.tree = tree;

// SR Nor Latch
tree.getTileData(new Point(0n, 2n), searchMode.make).type = tileType.io;
tree.getTileData(new Point(1n, 1n), searchMode.make).type = tileType.conjoinS;
tree.getTileData(new Point(1n, 2n), searchMode.make).type = tileType.conjoinE;
tree.getTileData(new Point(2n, 0n), searchMode.make).type = tileType.io;
tree.getTileData(new Point(2n, 1n), searchMode.make).type = tileType.disjoinN;
tree.getTileData(new Point(2n, 2n), searchMode.make).type = tileType.negate;
tree.getTileData(new Point(2n, 3n), searchMode.make).type = tileType.conjoinN;
tree.getTileData(new Point(2n, 4n), searchMode.make).type = tileType.io;
tree.getTileData(new Point(3n, 2n), searchMode.make).type = tileType.disjoinE;
tree.getTileData(new Point(3n, 3n), searchMode.make).type = tileType.conjoinW;
tree.getTileData(new Point(4n, 2n), searchMode.make).type = tileType.io;

// eslint-disable-next-line @internal/no-object-literals
const fillStyles: Record<tileType.QuadTreeTileType, string> = {
	[tileType.io]: '#0072B2',
	[tileType.negate]: '#D55E00',
	[tileType.conjoinN]: '#009E73',
	[tileType.conjoinS]: '#009E73',
	[tileType.conjoinE]: '#009E73',
	[tileType.conjoinW]: '#009E73',
	[tileType.disjoinN]: '#E69F00',
	[tileType.disjoinS]: '#E69F00',
	[tileType.disjoinE]: '#E69F00',
	[tileType.disjoinW]: '#E69F00',
	[tileType.empty]: 'transparent',
};

const scrollX = new FloatingBigInt();
const scrollY = new FloatingBigInt();
const pointerScaleMultiplier = 0.75;
const wheelScaleMultiplier = 0.2;
const minimumScale = 8;
const maximumScale = 400;
const strokeWidth = 1.5;
let scale = 50;
let currentTime = performance.now();

onFrame(currentTime);

function getScaleIntOffset(point: number, oldScale: number) {
	return BigInt(Math.trunc(point / oldScale) - Math.trunc(point / scale));
}

function getScaleFloatOffset(point: number, oldScale: number) {
	return ((point / oldScale) % 1) - ((point / scale) % 1);
}

function commitInputs() {
	let deltaScale = pointer.deltaScale * pointerScaleMultiplier;

	if (wheel.ctrl) {
		deltaScale -= (wheel.deltaX + wheel.deltaY) * wheelScaleMultiplier;
	} else {
		scrollX.float += wheel.deltaX / scale;
		scrollY.float += wheel.deltaY / scale;
	}

	if (deltaScale) {
		const oldScale = scale;
		scale += deltaScale;
		if (scale < minimumScale) scale = minimumScale;
		else if (scale > maximumScale) scale = maximumScale;
		scrollX.bigint += getScaleIntOffset(pointer.centerX, oldScale);
		scrollY.bigint += getScaleIntOffset(pointer.centerY, oldScale);
		scrollX.float += getScaleFloatOffset(pointer.centerX, oldScale);
		scrollY.float += getScaleFloatOffset(pointer.centerY, oldScale);
	}

	if (pointer.isDragging) {
		scrollX.float -= pointer.deltaX / scale;
		scrollY.float -= pointer.deltaY / scale;
	}

	if (pointer.hasClicked) {
		tree.getTileData(
			new Point(
				scrollX.bigint +
					BigInt(Math.trunc(pointer.centerX / scale + scrollX.float)),
				scrollY.bigint +
					BigInt(Math.trunc(pointer.centerY / scale + scrollY.float)),
			),
			'make',
		).type = getSelectedTileType();
	}

	pointer.commit();
	wheel.commit();
	scrollX.normalize();
	scrollY.normalize();
}

function onFrame(ms: DOMHighResTimeStamp) {
	const dip = devicePixelRatio;
	const width = canvas.clientWidth * dip;
	const height = canvas.clientHeight * dip;

	if (canvas.width === width && canvas.height === height) {
		context.clearRect(0, 0, width, height);
	} else {
		canvas.width = width;
		canvas.height = height;
	}

	commitInputs();

	const realScale = scale * dip;
	context.lineWidth = strokeWidth * dip;
	context.lineJoin = 'bevel';

	const offsetX = Math.trunc(scrollX.float * realScale);
	const offsetY = Math.trunc(scrollY.float * realScale);

	const display = new AxisAlignedBoundingBox(
		new Point(scrollX.bigint, scrollY.bigint),
		BigInt(Math.ceil(width / realScale) + 1),
		BigInt(Math.ceil(height / realScale) + 1),
	);

	const progress: WalkStep[] = [
		new WalkStep(tree.getContainingNode(display, searchMode.find)),
	];

	let lastType: tileType.QuadTreeTileType = tileType.empty;
	context.fillStyle = 'transparent';

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

		const i = Number(node.bounds.topLeft.x - scrollX.bigint);
		const j = Number(node.bounds.topLeft.y - scrollY.bigint);

		if (node.type === undefined) {
			progress.push(new WalkStep(node[index]));
			continue;
		}

		const {type} = node;
		if (type !== lastType) {
			context.fillStyle = fillStyles[type];
			lastType = type;
		}

		drawTile(realScale, offsetX, offsetY, i, j, lastType);

		progress.pop();

		if (progress.length > 0) {
			// Cast safety: length is at least one, so there is always a last
			// element.
			progress.at(-1)!.index++;
		}
	}

	currentTime = ms;
	requestAnimationFrame(onFrame);
}

// eslint-disable-next-line max-params
function drawTile(
	realScale: number,
	offsetX: number,
	offsetY: number,
	i: number,
	j: number,
	type: number,
) {
	context.fillRect(
		i * realScale - offsetX,
		j * realScale - offsetY,
		Math.ceil(realScale),
		Math.ceil(realScale),
	);

	switch (type) {
		case tileType.conjoinN:
		case tileType.disjoinS: {
			context.beginPath();
			context.moveTo(i * realScale - offsetX, (j + 1) * realScale - offsetY);
			context.lineTo((i + 0.5) * realScale - offsetX, j * realScale - offsetY);
			context.lineTo(
				(i + 1) * realScale - offsetX,
				(j + 1) * realScale - offsetY,
			);
			context.stroke();
			break;
		}

		case tileType.conjoinS:
		case tileType.disjoinN: {
			context.beginPath();
			context.moveTo(i * realScale - offsetX, j * realScale - offsetY);
			context.lineTo(
				(i + 0.5) * realScale - offsetX,
				(j + 1) * realScale - offsetY,
			);
			context.lineTo((i + 1) * realScale - offsetX, j * realScale - offsetY);
			context.stroke();
			break;
		}

		case tileType.conjoinE:
		case tileType.disjoinW: {
			context.beginPath();
			context.moveTo(i * realScale - offsetX, j * realScale - offsetY);
			context.lineTo(
				(i + 1) * realScale - offsetX,
				(j + 0.5) * realScale - offsetY,
			);
			context.lineTo(i * realScale - offsetX, (j + 1) * realScale - offsetY);
			context.stroke();
			break;
		}

		case tileType.conjoinW:
		case tileType.disjoinE: {
			context.beginPath();
			context.moveTo((i + 1) * realScale - offsetX, j * realScale - offsetY);
			context.lineTo(i * realScale - offsetX, (j + 0.5) * realScale - offsetY);
			context.lineTo(
				(i + 1) * realScale - offsetX,
				(j + 1) * realScale - offsetY,
			);
			context.stroke();
			break;
		}

		// No default
	}

	if (type !== tileType.empty) {
		context.strokeRect(
			i * realScale - offsetX,
			j * realScale - offsetY,
			Math.ceil(realScale),
			Math.ceil(realScale),
		);
	}
}
