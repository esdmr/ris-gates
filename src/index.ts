import {canvas, context} from './input/canvas.js';
import {getSelectedTileType, isEval} from './input/controls.js';
import * as pointer from './input/pointer.js';
import * as wheel from './input/wheel.js';
import {AxisAlignedBoundingBox} from './lib/aabb.js';
import {FloatingBigInt} from './lib/floating-bigint.js';
import * as searchMode from './lib/search-mode.js';
import * as tileType from './lib/tile-type.js';
import {Point} from './lib/point.js';
import {WalkStep} from './lib/walk.js';
import {tree} from './tree.js';
import {activeFillStyles, passiveFillStyles} from './colors.js';
import {
	pointerScaleMultiplier,
	wheelScaleMultiplier,
	minimumScale,
	maximumScale,
	strokeWidth,
} from './constants.js';
import {getEvalContext} from './eval.js';

const scrollX = new FloatingBigInt();
const scrollY = new FloatingBigInt();
let scale = 50;
let currentTime = performance.now();
let strokeStyle: string;

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
	updateStrokeStyle();
});

updateStrokeStyle();
onFrame(currentTime);

function updateStrokeStyle() {
	// Cast safety: `document.firstElementChild` is the <html> element.
	strokeStyle = getComputedStyle(document.firstElementChild!).getPropertyValue(
		'--foreground',
	);
}

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

	canvas.classList.toggle('dragging', pointer.isDragging);

	if (pointer.isDragging) {
		scrollX.float -= pointer.deltaX / scale;
		scrollY.float -= pointer.deltaY / scale;
	}

	if (pointer.hasClicked) {
		if (isEval) {
			const tile = tree.getTileData(
				new Point(
					scrollX.bigint +
						BigInt(Math.trunc(pointer.centerX / scale + scrollX.float)),
					scrollY.bigint +
						BigInt(Math.trunc(pointer.centerY / scale + scrollY.float)),
				),
				searchMode.find,
			);

			if (tile?.type === tileType.io) {
				const context = getEvalContext();
				context.input(tile, !context.output(tile));
			}
		} else {
			tree.getTileData(
				new Point(
					scrollX.bigint +
						BigInt(Math.trunc(pointer.centerX / scale + scrollX.float)),
					scrollY.bigint +
						BigInt(Math.trunc(pointer.centerY / scale + scrollY.float)),
				),
				searchMode.make,
			).type = getSelectedTileType();
		}
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
	context.lineCap = 'butt';
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
	let wasActive = true;
	context.fillStyle = 'transparent';
	context.strokeStyle = strokeStyle;

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

		if (node.type === tileType.branch) {
			progress.push(new WalkStep(node[index]));
			continue;
		}

		const isActive = !isEval || getEvalContext().output(node);
		const {type} = node;
		if (type !== lastType || wasActive !== isActive) {
			context.fillStyle = isActive
				? activeFillStyles[type]
				: passiveFillStyles[type];
			lastType = type;
			wasActive = isActive;
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
		case tileType.disjoinN: {
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
		case tileType.disjoinS: {
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
		case tileType.disjoinE: {
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
		case tileType.disjoinW: {
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
