import {AxisAlignedBoundingBox} from '../lib/aabb.js';
import {activeFillStyles, passiveFillStyles} from '../lib/colors.js';
import {
	pointerScaleMultiplier,
	wheelScaleMultiplier,
	minorGridStrokeWidth,
	majorGridStrokeWidth,
	strokeWidth,
	selectionStrokeWidth,
	selectionStrokeDashLength,
	selectionStrokeSpeed,
} from '../lib/constants.js';
import {Point} from '../lib/point.js';
import * as searchMode from '../lib/search-mode.js';
import * as tileType from '../lib/tile-type.js';
import {WalkStep} from '../lib/walk.js';
import * as canvas from './canvas.js';
import * as screenshot from './dialog/screenshot.js';
import * as eval_ from './eval.js';
import * as grid from './grid.js';
import * as hudEdit from './hud/edit.js';
import * as mode from './mode.js';
import * as pointer from './pointer.js';
import * as selection from './selection.js';
import * as theme from './theme.js';
import * as tree from './tree.js';
import * as wheel from './wheel.js';

let currentTime = /* @__PURE__ */ performance.now();

export function setup() {
	onFrame(currentTime);
}

function getScaleIntOffset(point: number, oldScale: number) {
	return BigInt(Math.trunc(point / oldScale) - Math.trunc(point / tree.scale));
}

function getScaleFloatOffset(point: number, oldScale: number) {
	return ((point / oldScale) % 1) - ((point / tree.scale) % 1);
}

function commitInputs() {
	let deltaScale = pointer.deltaScale * pointerScaleMultiplier;

	if (wheel.ctrl) {
		deltaScale -= (wheel.deltaX + wheel.deltaY) * wheelScaleMultiplier;
	} else {
		tree.scrollX.float += wheel.deltaX / tree.scale;
		tree.scrollY.float += wheel.deltaY / tree.scale;
	}

	if (deltaScale) {
		const oldScale = tree.scale;
		tree.setScale(tree.scale + deltaScale);
		tree.scrollX.bigint += getScaleIntOffset(pointer.centerX, oldScale);
		tree.scrollY.bigint += getScaleIntOffset(pointer.centerY, oldScale);
		tree.scrollX.float += getScaleFloatOffset(pointer.centerX, oldScale);
		tree.scrollY.float += getScaleFloatOffset(pointer.centerY, oldScale);
	}

	canvas.canvas.classList.toggle(
		'dragging',
		pointer.isDragging && !pointer.isSelecting,
	);

	if (mode.mode !== 'eval' && pointer.isSelecting) {
		const x =
			tree.scrollX.bigint +
			BigInt(Math.trunc(pointer.centerX / tree.scale + tree.scrollX.float));
		const y =
			tree.scrollY.bigint +
			BigInt(Math.trunc(pointer.centerY / tree.scale + tree.scrollY.float));

		if (pointer.wasSelecting) {
			selection.setSecondPosition(x, y);
		} else {
			selection.setFirstPosition(x, y);
		}
	} else if (pointer.isDragging) {
		tree.scrollX.float -= pointer.deltaX / tree.scale;
		tree.scrollY.float -= pointer.deltaY / tree.scale;
	}

	if (pointer.hasClicked) {
		const currentPoint = new Point(
			tree.scrollX.bigint +
				BigInt(Math.trunc(pointer.centerX / tree.scale + tree.scrollX.float)),
			tree.scrollY.bigint +
				BigInt(Math.trunc(pointer.centerY / tree.scale + tree.scrollY.float)),
		);

		switch (mode.mode) {
			case 'eval': {
				const tile = tree.tree.getTileData(currentPoint, searchMode.find);

				if (tile?.type === tileType.io) {
					const context = eval_.getEvalContext();
					context.input(tile, !context.output(tile));
				}

				break;
			}

			case 'pasting': {
				selection.paste(currentPoint);
				mode.setMode('selected');
				break;
			}

			case 'selected': {
				selection.unselect();
				break;
			}

			default: {
				tree.tree.getTileData(currentPoint, searchMode.make).type =
					hudEdit.getSelectedTileType();
			}
		}
	}

	pointer.commit();
	wheel.commit();
	tree.scrollX.normalize();
	tree.scrollY.normalize();
}

// eslint-disable-next-line complexity
function onFrame(ms: DOMHighResTimeStamp) {
	const dip =
		mode.mode === 'screenshot' && !screenshot.useDip ? 1 : devicePixelRatio;
	const width = canvas.canvas.clientWidth * dip;
	const height = canvas.canvas.clientHeight * dip;

	if (mode.mode === 'screenshot') {
		canvas.context.fillStyle = theme.backgroundStyle;
		canvas.context.fillRect(0, 0, width, height);
	} else if (canvas.canvas.width === width && canvas.canvas.height === height) {
		canvas.context.clearRect(0, 0, width, height);
	} else {
		canvas.canvas.width = width;
		canvas.canvas.height = height;
	}

	commitInputs();

	const realScale = tree.scale * dip;
	const offsetX = Math.trunc(tree.scrollX.float * realScale);
	const offsetY = Math.trunc(tree.scrollY.float * realScale);

	const display = new AxisAlignedBoundingBox(
		new Point(tree.scrollX.bigint, tree.scrollY.bigint),
		BigInt(Math.ceil(width / realScale) + 1),
		BigInt(Math.ceil(height / realScale) + 1),
	);

	const progress: WalkStep[] = [
		new WalkStep(tree.tree.getContainingNode(display, searchMode.find)),
	];

	let lastType: tileType.QuadTreeTileType = tileType.empty;
	let wasActive = true;

	canvas.context.lineCap = 'butt';
	canvas.context.lineJoin = 'bevel';
	canvas.context.fillStyle = 'transparent';
	canvas.context.strokeStyle = theme.strokeStyle;

	drawGrid(dip, realScale, display, offsetX, offsetY, width, height);

	canvas.context.lineWidth = strokeWidth * dip;

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

		const i = Number(node.bounds.topLeft.x - tree.scrollX.bigint);
		const j = Number(node.bounds.topLeft.y - tree.scrollY.bigint);

		if (node.type === tileType.branch) {
			progress.push(new WalkStep(node[index]));
			continue;
		}

		const isActive =
			mode.mode !== 'eval' || eval_.getEvalContext().output(node);
		const {type} = node;
		if (type !== lastType || wasActive !== isActive) {
			canvas.context.fillStyle =
				(isActive ? activeFillStyles : passiveFillStyles).get(type) ??
				'transparent';
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

	if (mode.mode === 'selected') {
		const box = selection.getBox();
		const x = convertAxisToDisplayCoordinate(
			box.topLeft.x,
			tree.scrollX.bigint,
			realScale,
			offsetX,
			width,
		);
		const y = convertAxisToDisplayCoordinate(
			box.topLeft.y,
			tree.scrollY.bigint,
			realScale,
			offsetY,
			height,
		);
		const w = convertSizeToDisplayCoordinate(
			box.topLeft.x,
			box.width,
			tree.scrollX.bigint,
			realScale,
			offsetX,
			width,
			x,
		);
		const h = convertSizeToDisplayCoordinate(
			box.topLeft.y,
			box.height,
			tree.scrollY.bigint,
			realScale,
			offsetY,
			height,
			y,
		);

		if (w && h) {
			canvas.context.lineWidth = selectionStrokeWidth * dip;
			canvas.context.strokeStyle = theme.selectionStrokeStyle;
			canvas.context.lineDashOffset =
				(ms % selectionStrokeDashLength) * selectionStrokeSpeed * dip;
			canvas.context.setLineDash([
				selectionStrokeDashLength * dip,
				selectionStrokeDashLength * dip,
			]);
			canvas.context.strokeRect(x, y, w, h);
			canvas.context.setLineDash([]);
		}
	}

	currentTime = ms;
	requestAnimationFrame(onFrame);
}

function clampDisplayCoordinate(display: number, max: number) {
	if (display < -1) return -1;
	if (display > max) return max;
	return display;
}

// eslint-disable-next-line max-params
function convertAxisToDisplayCoordinate(
	axisValue: bigint,
	scrollAxis: bigint,
	realScale: number,
	offset: number,
	max: number,
) {
	return clampDisplayCoordinate(
		Number(axisValue - scrollAxis) * realScale - offset,
		max,
	);
}

// eslint-disable-next-line max-params
function convertSizeToDisplayCoordinate(
	axisValue: bigint,
	sizeValue: bigint,
	scrollAxis: bigint,
	realScale: number,
	offset: number,
	max: number,
	axisDisplay: number,
) {
	return (
		clampDisplayCoordinate(
			Number(axisValue + sizeValue - scrollAxis) * realScale - offset,
			max,
		) - axisDisplay
	);
}

// eslint-disable-next-line max-params
function drawGrid(
	dip: number,
	realScale: number,
	display: AxisAlignedBoundingBox,
	offsetX: number,
	offsetY: number,
	width: number,
	height: number,
) {
	if (grid.shouldDrawMinorGrid) {
		canvas.context.lineWidth = minorGridStrokeWidth * dip;
		canvas.context.beginPath();

		for (let dx = 1; dx <= display.width; dx++) {
			canvas.context.moveTo(dx * realScale - offsetX, 0);
			canvas.context.lineTo(dx * realScale - offsetX, height);
		}

		for (let dy = 1; dy <= display.height; dy++) {
			canvas.context.moveTo(0, dy * realScale - offsetY);
			canvas.context.lineTo(width, dy * realScale - offsetY);
		}

		canvas.context.stroke();
	}

	if (grid.majorGridLength) {
		canvas.context.lineWidth = majorGridStrokeWidth * dip;
		canvas.context.beginPath();

		for (let dx = 1; dx <= display.width; dx++) {
			if ((tree.scrollX.bigint + BigInt(dx)) % grid.majorGridLength === 0n) {
				canvas.context.moveTo(dx * realScale - offsetX, 0);
				canvas.context.lineTo(dx * realScale - offsetX, height);
			}
		}

		for (let dy = 1; dy <= display.height; dy++) {
			if ((tree.scrollY.bigint + BigInt(dy)) % grid.majorGridLength === 0n) {
				canvas.context.moveTo(0, dy * realScale - offsetY);
				canvas.context.lineTo(width, dy * realScale - offsetY);
			}
		}

		canvas.context.stroke();
	}
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
	canvas.context.fillRect(
		i * realScale - offsetX,
		j * realScale - offsetY,
		Math.ceil(realScale),
		Math.ceil(realScale),
	);

	switch (type) {
		case tileType.conjoinN:
		case tileType.disjoinN: {
			canvas.context.beginPath();
			canvas.context.moveTo(
				i * realScale - offsetX,
				(j + 1) * realScale - offsetY,
			);
			canvas.context.lineTo(
				(i + 0.5) * realScale - offsetX,
				j * realScale - offsetY,
			);
			canvas.context.lineTo(
				(i + 1) * realScale - offsetX,
				(j + 1) * realScale - offsetY,
			);
			canvas.context.stroke();
			break;
		}

		case tileType.conjoinS:
		case tileType.disjoinS: {
			canvas.context.beginPath();
			canvas.context.moveTo(i * realScale - offsetX, j * realScale - offsetY);
			canvas.context.lineTo(
				(i + 0.5) * realScale - offsetX,
				(j + 1) * realScale - offsetY,
			);
			canvas.context.lineTo(
				(i + 1) * realScale - offsetX,
				j * realScale - offsetY,
			);
			canvas.context.stroke();
			break;
		}

		case tileType.conjoinE:
		case tileType.disjoinE: {
			canvas.context.beginPath();
			canvas.context.moveTo(i * realScale - offsetX, j * realScale - offsetY);
			canvas.context.lineTo(
				(i + 1) * realScale - offsetX,
				(j + 0.5) * realScale - offsetY,
			);
			canvas.context.lineTo(
				i * realScale - offsetX,
				(j + 1) * realScale - offsetY,
			);
			canvas.context.stroke();
			break;
		}

		case tileType.conjoinW:
		case tileType.disjoinW: {
			canvas.context.beginPath();
			canvas.context.moveTo(
				(i + 1) * realScale - offsetX,
				j * realScale - offsetY,
			);
			canvas.context.lineTo(
				i * realScale - offsetX,
				(j + 0.5) * realScale - offsetY,
			);
			canvas.context.lineTo(
				(i + 1) * realScale - offsetX,
				(j + 1) * realScale - offsetY,
			);
			canvas.context.stroke();
			break;
		}

		case tileType.io: {
			canvas.context.beginPath();
			canvas.context.arc(
				(i + 0.5) * realScale - offsetX,
				(j + 0.5) * realScale - offsetY,
				realScale / 2,
				0,
				2 * Math.PI,
			);
			canvas.context.stroke();
			break;
		}

		// No default
	}

	if (type !== tileType.empty) {
		canvas.context.strokeRect(
			i * realScale - offsetX,
			j * realScale - offsetY,
			Math.ceil(realScale),
			Math.ceil(realScale),
		);
	}
}
