import {canvas, context} from './input/canvas.js';
import * as controls from './input/controls.js';
import * as pointer from './input/pointer.js';
import * as wheel from './input/wheel.js';
import {AxisAlignedBoundingBox} from './lib/aabb.js';
import * as searchMode from './lib/search-mode.js';
import * as tileType from './lib/tile-type.js';
import {Point} from './lib/point.js';
import {WalkStep} from './lib/walk.js';
import {tree} from './tree.js';
import {activeFillStyles, passiveFillStyles} from './colors.js';
import * as constants from './constants.js';
import {getEvalContext} from './eval.js';
import * as dialogs from './input/dialogs.js';
import * as page from './input/page.js';
import * as storage from './storage.js';
import * as selection from './selection.js';
import * as svgCanvas from './lib/svg-canvas.js';

let currentTime = /* @__PURE__ */ performance.now();

svgCanvas.setup();
storage.setup();
page.setup();
controls.setup();
dialogs.setup();
pointer.setup();
wheel.setup();

onFrame(currentTime);

function getScaleIntOffset(point: number, oldScale: number) {
	return BigInt(Math.trunc(point / oldScale) - Math.trunc(point / page.scale));
}

function getScaleFloatOffset(point: number, oldScale: number) {
	return ((point / oldScale) % 1) - ((point / page.scale) % 1);
}

function commitInputs() {
	let deltaScale = pointer.deltaScale * constants.pointerScaleMultiplier;

	if (wheel.ctrl) {
		deltaScale -=
			(wheel.deltaX + wheel.deltaY) * constants.wheelScaleMultiplier;
	} else {
		page.scrollX.float += wheel.deltaX / page.scale;
		page.scrollY.float += wheel.deltaY / page.scale;
	}

	if (deltaScale) {
		const oldScale = page.scale;
		page.setScale(page.scale + deltaScale);
		page.scrollX.bigint += getScaleIntOffset(pointer.centerX, oldScale);
		page.scrollY.bigint += getScaleIntOffset(pointer.centerY, oldScale);
		page.scrollX.float += getScaleFloatOffset(pointer.centerX, oldScale);
		page.scrollY.float += getScaleFloatOffset(pointer.centerY, oldScale);
	}

	canvas.classList.toggle(
		'dragging',
		pointer.isDragging && !pointer.isSelecting,
	);

	if (!controls.isEval && pointer.isSelecting) {
		if (pointer.wasSelecting) {
			selection.setSecondPosition(
				page.scrollX.bigint +
					BigInt(Math.trunc(pointer.centerX / page.scale + page.scrollX.float)),
				page.scrollY.bigint +
					BigInt(Math.trunc(pointer.centerY / page.scale + page.scrollY.float)),
			);
		} else {
			selection.setFirstPosition(
				page.scrollX.bigint +
					BigInt(Math.trunc(pointer.centerX / page.scale + page.scrollX.float)),
				page.scrollY.bigint +
					BigInt(Math.trunc(pointer.centerY / page.scale + page.scrollY.float)),
			);
		}
	} else if (pointer.isDragging) {
		page.scrollX.float -= pointer.deltaX / page.scale;
		page.scrollY.float -= pointer.deltaY / page.scale;
	}

	if (pointer.hasClicked) {
		if (controls.isEval) {
			const tile = tree.getTileData(
				new Point(
					page.scrollX.bigint +
						BigInt(
							Math.trunc(pointer.centerX / page.scale + page.scrollX.float),
						),
					page.scrollY.bigint +
						BigInt(
							Math.trunc(pointer.centerY / page.scale + page.scrollY.float),
						),
				),
				searchMode.find,
			);

			if (tile?.type === tileType.io) {
				const context = getEvalContext();
				context.input(tile, !context.output(tile));
			}
		} else if (controls.shouldPaste) {
			selection.paste(
				new Point(
					page.scrollX.bigint +
						BigInt(
							Math.trunc(pointer.centerX / page.scale + page.scrollX.float),
						),
					page.scrollY.bigint +
						BigInt(
							Math.trunc(pointer.centerY / page.scale + page.scrollY.float),
						),
				),
			);
			controls.donePasting();
		} else if (selection.isSelecting) {
			selection.unselect();
		} else {
			tree.getTileData(
				new Point(
					page.scrollX.bigint +
						BigInt(
							Math.trunc(pointer.centerX / page.scale + page.scrollX.float),
						),
					page.scrollY.bigint +
						BigInt(
							Math.trunc(pointer.centerY / page.scale + page.scrollY.float),
						),
				),
				searchMode.make,
			).type = controls.getSelectedTileType();
		}
	}

	pointer.commit();
	wheel.commit();
	page.scrollX.normalize();
	page.scrollY.normalize();
}

// eslint-disable-next-line complexity
function onFrame(ms: DOMHighResTimeStamp) {
	const dip = dialogs.takingScreenshot ? 1 : devicePixelRatio;
	const width = canvas.clientWidth * dip;
	const height = canvas.clientHeight * dip;

	if (dialogs.takingScreenshot) {
		context.fillStyle = page.backgroundStyle;
		context.fillRect(0, 0, width, height);
	} else if (canvas.width === width && canvas.height === height) {
		context.clearRect(0, 0, width, height);
	} else {
		canvas.width = width;
		canvas.height = height;
	}

	commitInputs();

	const realScale = page.scale * dip;
	const offsetX = Math.trunc(page.scrollX.float * realScale);
	const offsetY = Math.trunc(page.scrollY.float * realScale);

	const display = new AxisAlignedBoundingBox(
		new Point(page.scrollX.bigint, page.scrollY.bigint),
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
	context.strokeStyle = page.strokeStyle;

	if (dialogs.shouldDrawMinorGrid) {
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

	if (dialogs.majorGridLength) {
		context.lineWidth = constants.majorGridStrokeWidth * dip;
		context.beginPath();

		for (let dx = 1; dx <= display.width; dx++) {
			if ((page.scrollX.bigint + BigInt(dx)) % dialogs.majorGridLength === 0n) {
				context.moveTo(dx * realScale - offsetX, 0);
				context.lineTo(dx * realScale - offsetX, height);
			}
		}

		for (let dy = 1; dy <= display.height; dy++) {
			if ((page.scrollY.bigint + BigInt(dy)) % dialogs.majorGridLength === 0n) {
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

		const i = Number(node.bounds.topLeft.x - page.scrollX.bigint);
		const j = Number(node.bounds.topLeft.y - page.scrollY.bigint);

		if (node.type === tileType.branch) {
			progress.push(new WalkStep(node[index]));
			continue;
		}

		const isActive = !controls.isEval || getEvalContext().output(node);
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

	if (selection.isSelecting) {
		const box = selection.getBox();
		const x = convertAxisToDisplayCoordinate(
			box.topLeft.x,
			page.scrollX.bigint,
			realScale,
			offsetX,
			width,
		);
		const y = convertAxisToDisplayCoordinate(
			box.topLeft.y,
			page.scrollY.bigint,
			realScale,
			offsetY,
			height,
		);
		const w = convertSizeToDisplayCoordinate(
			box.topLeft.x,
			box.width,
			page.scrollX.bigint,
			realScale,
			offsetX,
			width,
			x,
		);
		const h = convertSizeToDisplayCoordinate(
			box.topLeft.y,
			box.height,
			page.scrollY.bigint,
			realScale,
			offsetY,
			height,
			y,
		);

		if (w && h) {
			context.lineWidth = constants.selectionStrokeWidth * dip;
			context.strokeStyle = page.selectionStrokeStyle;
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
