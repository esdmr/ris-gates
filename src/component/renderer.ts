import {AxisAlignedBoundingBox} from '../lib/aabb.js';
import {activeFillStyles, passiveFillStyles} from '../lib/colors.js';
import * as constants from '../lib/constants.js';
import {Point} from '../lib/point.js';
import * as searchMode from '../lib/search-mode.js';
import * as tileType from '../lib/tile-type.js';
import {WalkStep} from '../lib/walk.js';
import {canvas, context} from './canvas.js';
import {useDip} from './dialog/screenshot.js';
import {getEvalContext} from './eval.js';
import {majorGridLength, shouldDrawMinorGrid} from './grid.js';
import {getSelectedTileType} from './hud/edit.js';
import {mode, setMode} from './mode.js';
import * as pointer from './pointer.js';
import * as selection from './selection.js';
import * as theme from './theme.js';
import {scale, scrollX, scrollY, setScale, tree} from './tree.js';
import * as wheel from './wheel.js';

let currentTime = /* @__PURE__ */ performance.now();

export function setup() {
	onFrame(currentTime);
}

function getScaleIntOffset(point: number, oldScale: number) {
	return BigInt(Math.trunc(point / oldScale) - Math.trunc(point / scale));
}

function getScaleFloatOffset(point: number, oldScale: number) {
	return ((point / oldScale) % 1) - ((point / scale) % 1);
}

function commitInputs() {
	let deltaScale = pointer.deltaScale * constants.pointerScaleMultiplier;

	if (wheel.ctrl) {
		deltaScale -=
			(wheel.deltaX + wheel.deltaY) * constants.wheelScaleMultiplier;
	} else {
		scrollX.float += wheel.deltaX / scale;
		scrollY.float += wheel.deltaY / scale;
	}

	if (deltaScale) {
		const oldScale = scale;
		setScale(scale + deltaScale);
		scrollX.bigint += getScaleIntOffset(pointer.centerX, oldScale);
		scrollY.bigint += getScaleIntOffset(pointer.centerY, oldScale);
		scrollX.float += getScaleFloatOffset(pointer.centerX, oldScale);
		scrollY.float += getScaleFloatOffset(pointer.centerY, oldScale);
	}

	canvas.classList.toggle(
		'dragging',
		pointer.isDragging && !pointer.isSelecting,
	);

	if (mode !== 'eval' && pointer.isSelecting) {
		if (pointer.wasSelecting) {
			selection.setSecondPosition(
				scrollX.bigint +
					BigInt(Math.trunc(pointer.centerX / scale + scrollX.float)),
				scrollY.bigint +
					BigInt(Math.trunc(pointer.centerY / scale + scrollY.float)),
			);
		} else {
			selection.setFirstPosition(
				scrollX.bigint +
					BigInt(Math.trunc(pointer.centerX / scale + scrollX.float)),
				scrollY.bigint +
					BigInt(Math.trunc(pointer.centerY / scale + scrollY.float)),
			);
		}
	} else if (pointer.isDragging) {
		scrollX.float -= pointer.deltaX / scale;
		scrollY.float -= pointer.deltaY / scale;
	}

	if (pointer.hasClicked) {
		switch (mode) {
			case 'eval': {
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

				break;
			}

			case 'pasting': {
				selection.paste(
					new Point(
						scrollX.bigint +
							BigInt(Math.trunc(pointer.centerX / scale + scrollX.float)),
						scrollY.bigint +
							BigInt(Math.trunc(pointer.centerY / scale + scrollY.float)),
					),
				);
				setMode('selected');
				break;
			}

			case 'selected': {
				selection.unselect();
				break;
			}

			default: {
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
	}

	pointer.commit();
	wheel.commit();
	scrollX.normalize();
	scrollY.normalize();
}

// eslint-disable-next-line complexity
function onFrame(ms: DOMHighResTimeStamp) {
	const dip = mode === 'screenshot' && !useDip ? 1 : devicePixelRatio;
	const width = canvas.clientWidth * dip;
	const height = canvas.clientHeight * dip;

	if (mode === 'screenshot') {
		context.fillStyle = theme.backgroundStyle;
		context.fillRect(0, 0, width, height);
	} else if (canvas.width === width && canvas.height === height) {
		context.clearRect(0, 0, width, height);
	} else {
		canvas.width = width;
		canvas.height = height;
	}

	commitInputs();

	const realScale = scale * dip;
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

	context.lineCap = 'butt';
	context.lineJoin = 'bevel';
	context.fillStyle = 'transparent';
	context.strokeStyle = theme.strokeStyle;

	if (shouldDrawMinorGrid) {
		context.lineWidth = constants.minorGridStrokeWidth * dip;
		context.beginPath();

		for (let dx = 1; dx <= display.width; dx++) {
			context.moveTo(dx * realScale - offsetX, 0);
			context.lineTo(dx * realScale - offsetX, height);
		}

		for (let dy = 1; dy <= display.height; dy++) {
			context.moveTo(0, dy * realScale - offsetY);
			context.lineTo(width, dy * realScale - offsetY);
		}

		context.stroke();
	}

	if (majorGridLength) {
		context.lineWidth = constants.majorGridStrokeWidth * dip;
		context.beginPath();

		for (let dx = 1; dx <= display.width; dx++) {
			if ((scrollX.bigint + BigInt(dx)) % majorGridLength === 0n) {
				context.moveTo(dx * realScale - offsetX, 0);
				context.lineTo(dx * realScale - offsetX, height);
			}
		}

		for (let dy = 1; dy <= display.height; dy++) {
			if ((scrollY.bigint + BigInt(dy)) % majorGridLength === 0n) {
				context.moveTo(0, dy * realScale - offsetY);
				context.lineTo(width, dy * realScale - offsetY);
			}
		}

		context.stroke();
	}

	context.lineWidth = constants.strokeWidth * dip;

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

		const isActive = mode !== 'eval' || getEvalContext().output(node);
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

	if (mode === 'selected') {
		const box = selection.getBox();
		const x = convertAxisToDisplayCoordinate(
			box.topLeft.x,
			scrollX.bigint,
			realScale,
			offsetX,
			width,
		);
		const y = convertAxisToDisplayCoordinate(
			box.topLeft.y,
			scrollY.bigint,
			realScale,
			offsetY,
			height,
		);
		const w = convertSizeToDisplayCoordinate(
			box.topLeft.x,
			box.width,
			scrollX.bigint,
			realScale,
			offsetX,
			width,
			x,
		);
		const h = convertSizeToDisplayCoordinate(
			box.topLeft.y,
			box.height,
			scrollY.bigint,
			realScale,
			offsetY,
			height,
			y,
		);

		if (w && h) {
			context.lineWidth = constants.selectionStrokeWidth * dip;
			context.strokeStyle = theme.selectionStrokeStyle;
			context.lineDashOffset =
				(ms % constants.selectionStrokeDashLength) *
				constants.selectionStrokeSpeed *
				dip;
			context.setLineDash([
				constants.selectionStrokeDashLength * dip,
				constants.selectionStrokeDashLength * dip,
			]);
			context.strokeRect(x, y, w, h);
			context.setLineDash([]);
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

		case tileType.io: {
			context.beginPath();
			context.arc(
				(i + 0.5) * realScale - offsetX,
				(j + 0.5) * realScale - offsetY,
				realScale / 2,
				0,
				2 * Math.PI,
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
