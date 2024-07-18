import {AxisAlignedBoundingBox} from './aabb.js';
import {nonNullable, assert} from './assert.js';
import {asBigInt, asNumber, maxBigInt, minBigInt, toBigInt} from './bigint.js';
import {Point} from './point.js';
import {Schematic} from './schematic.js';
import * as tileType from './tile-type.js';

class AnchorBox extends AxisAlignedBoundingBox {
	getTop() {
		return new Point(
			this.topLeft.x + toBigInt(this.width / 2n),
			this.topLeft.y,
		);
	}

	getTopRight() {
		return new Point(this.topLeft.x + this.width - 1n, this.topLeft.y);
	}

	getRight() {
		return new Point(
			this.topLeft.x + this.width - 1n,
			this.topLeft.y + toBigInt(this.height / 2n),
		);
	}

	getBottom() {
		return new Point(
			this.topLeft.x + toBigInt(this.width / 2n),
			this.topLeft.y + this.height - 1n,
		);
	}

	getBottomLeft() {
		return new Point(this.topLeft.x, this.topLeft.y + this.height - 1n);
	}

	getLeft() {
		return new Point(
			this.topLeft.x,
			this.topLeft.y + toBigInt(this.height / 2n),
		);
	}

	getCenter() {
		return new Point(
			this.topLeft.x + toBigInt(this.width / 2n),
			this.topLeft.y + toBigInt(this.height / 2n),
		);
	}

	pad(top = 1n, right = top, bottom = top, left = right) {
		return new AnchorBox(
			new Point(this.topLeft.x - left, this.topLeft.y - top),
			this.width + left + right,
			this.height + top + bottom,
		);
	}
}

class GenerationContext extends Schematic {
	static repeatTileFor(
		tile: tileType.QuadTreeTileType | tileType.QuadTreeTileType[],
		columns: bigint,
		rows: bigint,
	) {
		assert(
			!Array.isArray(tile) || tile.length === asNumber(rows * columns),
		);

		const context = new GenerationContext(columns, rows);

		for (let y = 0n; y < rows; y++) {
			for (let x = 0n; x < columns; x++) {
				context.drawTile(
					Array.isArray(tile)
						? nonNullable(tile[asNumber(x + y * columns)])
						: tile,
					new Point(x, y),
				);
			}
		}

		return context;
	}

	static repeatSchematicFor(
		schematic: Schematic | Schematic[],
		columns: bigint,
		rows: bigint,
	) {
		assert(
			!Array.isArray(schematic) ||
				schematic.length === asNumber(rows * columns),
		);

		const {realWidth, realHeight} = Array.isArray(schematic)
			? nonNullable(schematic[0])
			: schematic;

		const context = new GenerationContext(
			columns * realWidth,
			rows * realHeight,
		);

		for (let y = 0n; y < rows; y++) {
			for (let x = 0n; x < columns; x++) {
				const currentSchematic = Array.isArray(schematic)
					? nonNullable(schematic[asNumber(x + y * columns)])
					: schematic;

				assert(
					currentSchematic.realWidth === realWidth &&
						currentSchematic.realHeight === realHeight,
				);

				context.drawSchematic(
					currentSchematic,
					new Point(x * realWidth, y * realHeight),
				);
			}
		}

		return context;
	}

	static verticalJoin(...schematics: Schematic[]) {
		const realWidth = nonNullable(schematics[0]).realWidth;
		const realHeight = schematics.reduce((a, b) => a + b.realHeight, 0n);
		const context = new GenerationContext(realWidth, realHeight);
		let lastPoint = context.bounds.topLeft;

		for (const schematic of schematics) {
			assert(schematic.realWidth === realWidth);
			lastPoint = context
				.drawSchematic(schematic, lastPoint)
				.pad(1n, 0n)
				.getBottomLeft();
		}

		return context;
	}

	static horizontalJoin(...schematics: Schematic[]) {
		const realWidth = schematics.reduce((a, b) => a + b.realWidth, 0n);
		const realHeight = nonNullable(schematics[0]).realHeight;
		const context = new GenerationContext(realWidth, realHeight);
		let lastPoint = context.bounds.topLeft;

		for (const schematic of schematics) {
			assert(schematic.realHeight === realHeight);
			lastPoint = context
				.drawSchematic(schematic, lastPoint)
				.pad(0n, 1n)
				.getTopRight();
		}

		return context;
	}

	// eslint-disable-next-line max-params
	static pad(
		schematic: Schematic,
		top: bigint,
		right: bigint,
		bottom: bigint,
		left: bigint,
	) {
		const context = new GenerationContext(
			schematic.realWidth + left + right,
			schematic.realHeight + top + bottom,
		);

		context.drawSchematic(schematic, new Point(left, top));

		return context;
	}

	readonly bounds: AnchorBox;
	transparentDrawing = false;

	constructor(
		width: bigint,
		height: bigint,
		tiles = Array.from<unknown, tileType.QuadTreeTileType>(
			// eslint-disable-next-line @internal/no-object-literals
			{
				length: asNumber(width * height),
			},
			() => tileType.empty,
		),
	) {
		super(width, height, tiles);
		this.bounds = new AnchorBox(new Point(0n, 0n), width, height);
	}

	drawTile(tile: tileType.QuadTreeTileType, point: Point) {
		assert(point.x >= 0n && point.x < this.width);
		assert(point.y >= 0n && point.y < this.height);

		if (!this.transparentDrawing || tile !== tileType.empty) {
			this.tiles[asNumber(point.y * this.width + point.x)] = tile;
		}
	}

	repeatTileUntil(
		tile: tileType.QuadTreeTileType,
		topLeft: Point,
		bottomRight: Point,
	) {
		return this.drawSchematic(
			GenerationContext.repeatTileFor(
				tile,
				bottomRight.x - topLeft.x + 1n,
				bottomRight.y - topLeft.y + 1n,
			),
			topLeft,
		);
	}

	drawSchematic(schematic: Schematic, topLeft: Point) {
		assert(
			topLeft.x >= 0n && topLeft.x + schematic.realWidth <= this.width,
		);
		assert(
			topLeft.y >= 0n && topLeft.y + schematic.realHeight <= this.height,
		);

		for (let y = 0n; y < schematic.height; y++) {
			for (let x = 0n; x < schematic.width; x++) {
				this.drawTile(
					schematic.transformTile(x, y),
					schematic.transformPoint(x, y, topLeft),
				);
			}
		}

		return new AnchorBox(
			topLeft,
			schematic.realWidth,
			schematic.realHeight,
		);
	}

	repeatSchematicUntil(
		schematic: Schematic,
		topLeft: Point,
		bottomRight: Point,
	) {
		return this.drawSchematic(
			GenerationContext.repeatSchematicFor(
				schematic,
				toBigInt(
					(bottomRight.x - topLeft.x + 1n) / schematic.realWidth,
				),
				toBigInt(
					(bottomRight.y - topLeft.y + 1n) / schematic.realHeight,
				),
			),
			topLeft,
		);
	}
}

const gridRightActive = new GenerationContext(4n, 2n, [
	tileType.empty,
	tileType.conjoinS,
	tileType.conjoinS,
	tileType.disjoinN,

	tileType.conjoinE,
	tileType.negate,
	tileType.conjoinE,
	tileType.negate,
]);

const gridLeftActive = new GenerationContext(4n, 2n, [
	tileType.empty,
	tileType.disjoinN,
	tileType.conjoinS,
	tileType.conjoinS,

	tileType.conjoinE,
	tileType.negate,
	tileType.conjoinE,
	tileType.negate,
]);

const gridConjoin = new GenerationContext(1n, 2n, [
	tileType.empty,
	tileType.conjoinE,
]);

const gridIo = new GenerationContext(1n, 2n, [tileType.empty, tileType.io]);

const gridNegate = new GenerationContext(1n, 2n, [
	tileType.empty,
	tileType.negate,
]);

const gridVerticalDoubleInput = new GenerationContext(4n, 3n, [
	tileType.empty,
	tileType.empty,
	tileType.empty,
	tileType.io,

	tileType.empty,
	tileType.conjoinS,
	tileType.conjoinW,
	tileType.disjoinN,

	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.negate,
]);

function drawGrid(activation: boolean[][]) {
	const activationMapped = activation.map((row, index, {length}) => {
		const base = (length - index) % 2 === 0;
		return row.map((i) => (i === base ? gridRightActive : gridLeftActive));
	});

	return GenerationContext.horizontalJoin(
		GenerationContext.repeatSchematicFor(
			activationMapped.flat(),
			asBigInt(nonNullable(activationMapped[0]).length),
			asBigInt(activationMapped.length),
		),
		GenerationContext.repeatSchematicFor(
			gridConjoin,
			1n,
			asBigInt(activationMapped.length),
		),
	);
}

function drawIoBridge(
	rows: bigint,
	type:
		| typeof tileType.conjoinN
		| typeof tileType.disjoinN
		| typeof tileType.negate
		| typeof tileType.io,
) {
	if (type === tileType.negate) {
		return GenerationContext.repeatSchematicFor(gridNegate, 1n, rows);
	}

	if (type === tileType.io) {
		return GenerationContext.repeatSchematicFor(gridIo, 1n, rows);
	}

	const context = new GenerationContext(2n, rows * gridConjoin.realHeight);

	context.repeatTileUntil(
		type === tileType.conjoinN ? tileType.conjoinS : tileType.disjoinS,
		context.bounds.pad(-1n, 0n).topLeft,
		context.bounds.getLeft(),
	);

	context.repeatTileUntil(
		type === tileType.conjoinN ? tileType.conjoinN : tileType.disjoinN,
		context.bounds.getLeft(),
		context.bounds.getBottomLeft(),
	);

	context.drawTile(
		type === tileType.conjoinN ? tileType.conjoinE : tileType.disjoinE,
		context.bounds.getLeft(),
	);

	context.drawTile(tileType.io, context.bounds.getRight());

	context.horizontalReflection = type === tileType.disjoinN;

	return context;
}

export function drawEncoderBridge(output: bigint) {
	assert(output > 0n);

	const rowsPerBit = 2n ** (output - 1n);
	const context = new GenerationContext(
		2n,
		((rowsPerBit - 1n) * output + 2n) * gridConjoin.realHeight,
	);
	let lastPoint = context.bounds.topLeft;

	context.transparentDrawing = true;

	for (let i = 0n; i < output; i++) {
		const bounds = context
			.drawSchematic(
				drawIoBridge(rowsPerBit, tileType.conjoinN),
				lastPoint,
			)
			.pad(-1n, 0n);

		if (i > 0n) {
			context.drawTile(tileType.disjoinW, bounds.topLeft);
		}

		lastPoint = bounds.getBottomLeft();
	}

	context.drawSchematic(
		drawIoBridge(1n, tileType.conjoinN),
		context.bounds.pad(-1n, 0n).getBottomLeft(),
	);

	return context;
}

export function generateMultiplexer(input: bigint, output: bigint) {
	assert(minBigInt(input, output) === 1n);
	const p = maxBigInt(input, output);
	const q = asBigInt(Math.ceil(Math.log2(asNumber(p))));

	const grid = drawGrid(
		// eslint-disable-next-line @internal/no-object-literals
		Array.from({length: asNumber(p)}, (_, index) =>
			index
				.toString(2)
				.padStart(asNumber(q), '0')
				.split('')
				.map((i) => i === '1'),
		),
	);

	const dataIn = drawIoBridge(
		p,
		input > output ? tileType.io : tileType.disjoinN,
	);

	const dataOut = drawIoBridge(
		p,
		input > output ? tileType.conjoinN : tileType.io,
	);

	const selector = GenerationContext.repeatSchematicFor(
		gridVerticalDoubleInput,
		q,
		1n,
	);

	return GenerationContext.verticalJoin(
		GenerationContext.pad(
			selector,
			0n,
			dataOut.realWidth + 1n,
			0n,
			dataIn.realWidth,
		),
		GenerationContext.horizontalJoin(dataIn, grid, dataOut),
	);
}

export function generateDecoder(input: bigint, output: bigint) {
	assert(output <= 2n ** input);
	const p = output;
	const q = input;

	const grid = drawGrid(
		// eslint-disable-next-line @internal/no-object-literals
		Array.from({length: asNumber(p)}, (_, index) =>
			index
				.toString(2)
				.padStart(asNumber(q), '0')
				.split('')
				.map((i) => i === '1'),
		),
	);

	const dataIn = drawIoBridge(p, tileType.negate);

	const dataOut = drawIoBridge(p, tileType.io);

	const selector = GenerationContext.repeatSchematicFor(
		gridVerticalDoubleInput,
		q,
		1n,
	);

	return GenerationContext.verticalJoin(
		GenerationContext.pad(
			selector,
			0n,
			dataOut.realWidth + 1n,
			0n,
			dataIn.realWidth,
		),
		GenerationContext.horizontalJoin(dataIn, grid, dataOut),
	);
}

export function generateEncoder(input: bigint, output: bigint) {
	assert(input === 2n ** output);

	const activation: bigint[] = [];

	for (
		let i = 0n, shared: bigint | undefined, last: bigint | undefined;
		i < output;
		i++, shared = last
	) {
		for (let j = 0n; j < input; j++) {
			// eslint-disable-next-line no-bitwise
			if ((j & (1n << i)) === 0n || j === shared) continue;
			// eslint-disable-next-line no-bitwise
			activation.push(1n << j);
			last = j;
		}
	}

	activation.reverse();
	activation.push(0n);

	const p = asBigInt(activation.length);
	const q = input;

	const grid = drawGrid(
		activation.map((value) =>
			value
				.toString(2)
				.padStart(asNumber(q), '0')
				.split('')
				.map((i) => i === '1'),
		),
	);

	const dataIn = drawIoBridge(p, tileType.negate);

	const dataOut = drawEncoderBridge(output);

	const selector = GenerationContext.repeatSchematicFor(
		gridVerticalDoubleInput,
		q,
		1n,
	);

	return GenerationContext.verticalJoin(
		GenerationContext.pad(
			selector,
			0n,
			dataOut.realWidth + 1n,
			0n,
			dataIn.realWidth,
		),
		GenerationContext.horizontalJoin(dataIn, grid, dataOut),
	);
}
