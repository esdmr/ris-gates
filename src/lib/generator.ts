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

const gridVerticalSingleInput = new GenerationContext(2n, 3n, [
	tileType.empty,
	tileType.io,

	tileType.empty,
	tileType.conjoinS,

	tileType.empty,
	tileType.conjoinS,
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

const memoryDataInput = new GenerationContext(8n, 3n, [
	tileType.empty,
	tileType.io,
	tileType.empty,
	tileType.empty,
	tileType.empty,
	tileType.empty,
	tileType.empty,
	tileType.empty,

	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.empty,
	tileType.empty,
	tileType.empty,
	tileType.empty,
	tileType.empty,

	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.empty,
	tileType.empty,
	tileType.empty,
	tileType.empty,
	tileType.negate,
]);

const memoryDecoderFalse = new GenerationContext(4n, 8n, [
	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,

	tileType.conjoinE,
	tileType.negate,
	tileType.conjoinE,
	tileType.negate,

	tileType.empty,
	tileType.conjoinS,
	tileType.conjoinN,
	tileType.disjoinN,

	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,

	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,

	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,

	tileType.empty,
	tileType.conjoinS,
	tileType.conjoinS,
	tileType.disjoinN,

	tileType.conjoinE,
	tileType.negate,
	tileType.conjoinE,
	tileType.negate,
]);

const memoryDecoderTrue = new GenerationContext(4n, 8n, [
	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,

	tileType.conjoinE,
	tileType.negate,
	tileType.conjoinE,
	tileType.negate,

	tileType.empty,
	tileType.disjoinN,
	tileType.conjoinN,
	tileType.conjoinS,

	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,

	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,

	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,

	tileType.empty,
	tileType.disjoinN,
	tileType.conjoinS,
	tileType.conjoinS,

	tileType.conjoinE,
	tileType.negate,
	tileType.conjoinE,
	tileType.negate,
]);

const memoryDecoderControl = new GenerationContext(7n, 8n, [
	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,
	tileType.empty,

	tileType.conjoinE,
	tileType.negate,
	tileType.conjoinE,
	tileType.negate,
	tileType.conjoinE,
	tileType.negate,
	tileType.conjoinE,

	tileType.empty,
	tileType.disjoinN,
	tileType.conjoinN,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,
	tileType.empty,

	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,
	tileType.empty,

	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,
	tileType.empty,

	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinS,
	tileType.empty,

	tileType.empty,
	tileType.disjoinN,
	tileType.conjoinS,
	tileType.disjoinN,
	tileType.disjoinE,
	tileType.disjoinN,
	tileType.empty,

	tileType.conjoinE,
	tileType.negate,
	tileType.conjoinE,
	tileType.negate,
	tileType.conjoinE,
	tileType.negate,
	tileType.conjoinE,
]);

const memoryDecoderNegate = new GenerationContext(1n, 8n, [
	tileType.empty,
	tileType.negate,
	tileType.empty,
	tileType.empty,
	tileType.empty,
	tileType.empty,
	tileType.empty,
	tileType.negate,
]);

const memoryCell = new GenerationContext(8n, 8n, [
	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.empty,
	tileType.empty,
	tileType.empty,
	tileType.empty,
	tileType.conjoinS,

	tileType.conjoinE,
	tileType.negate,
	tileType.conjoinE,
	tileType.conjoinE,
	tileType.disjoinW,
	tileType.disjoinW,
	tileType.disjoinW,
	tileType.negate,

	tileType.empty,
	tileType.conjoinS,
	tileType.empty,
	tileType.conjoinE,
	tileType.disjoinW,
	tileType.conjoinE,
	tileType.negate,
	tileType.conjoinS,

	tileType.empty,
	tileType.conjoinS,
	tileType.conjoinS,
	tileType.negate,
	tileType.conjoinW,
	tileType.conjoinW,
	tileType.empty,
	tileType.conjoinS,

	tileType.empty,
	tileType.conjoinS,
	tileType.conjoinE,
	tileType.conjoinN,
	tileType.empty,
	tileType.negate,
	tileType.empty,
	tileType.conjoinS,

	tileType.empty,
	tileType.disjoinN,
	tileType.conjoinE,
	tileType.negate,
	tileType.conjoinE,
	tileType.conjoinN,
	tileType.empty,
	tileType.conjoinS,

	tileType.empty,
	tileType.disjoinN,
	tileType.conjoinE,
	tileType.conjoinN,
	tileType.empty,
	tileType.conjoinN,
	tileType.empty,
	tileType.conjoinS,

	tileType.conjoinE,
	tileType.negate,
	tileType.conjoinE,
	tileType.disjoinW,
	tileType.conjoinE,
	tileType.disjoinW,
	tileType.conjoinE,
	tileType.negate,
]);

const memoryOutput = GenerationContext.pad(
	new GenerationContext(1n, 4n, [
		tileType.conjoinS,
		tileType.negate,
		tileType.conjoinS,
		tileType.io,
	]),
	0n,
	0n,
	0n,
	7n,
);

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

function generateMultiplexerLike(
	p: bigint,
	q: bigint,
	dataIn: GenerationContext,
	dataOut: GenerationContext,
) {
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

export function generateMultiplexer(input: bigint) {
	return generateMultiplexerLike(
		input,
		asBigInt(Math.ceil(Math.log2(asNumber(input)))),
		drawIoBridge(input, tileType.io),
		drawIoBridge(input, tileType.conjoinN),
	);
}

export function generateDemultiplexer(output: bigint) {
	return generateMultiplexerLike(
		output,
		asBigInt(Math.ceil(Math.log2(asNumber(output)))),
		drawIoBridge(output, tileType.disjoinN),
		drawIoBridge(output, tileType.io),
	);
}

export function generateDecoder(input: bigint, output: bigint) {
	assert(output <= 2n ** input);

	return generateMultiplexerLike(
		output,
		input,
		drawIoBridge(output, tileType.negate),
		drawIoBridge(output, tileType.io),
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

export function generateMemory(address: bigint, data: bigint) {
	const p = 2n ** address;
	const rows = [];

	for (let i = 0n; i < p; i++) {
		const row = [];

		row.push(memoryDecoderNegate);

		for (let j = 0n; j < address; j++) {
			// eslint-disable-next-line no-bitwise
			row.push(i & (1n << j) ? memoryDecoderTrue : memoryDecoderFalse);
		}

		row.push(
			memoryDecoderControl,
			memoryDecoderNegate,
			GenerationContext.repeatSchematicFor(memoryCell, data, 1n),
		);

		rows.push(GenerationContext.horizontalJoin(...row));
	}

	return GenerationContext.verticalJoin(
		GenerationContext.horizontalJoin(
			new GenerationContext(1n, 3n),
			GenerationContext.repeatSchematicFor(
				gridVerticalDoubleInput,
				address,
				1n,
			),
			GenerationContext.repeatSchematicFor(
				gridVerticalSingleInput,
				3n,
				1n,
			),
			new GenerationContext(2n, 3n),
			GenerationContext.repeatSchematicFor(memoryDataInput, data, 1n),
		),
		...rows,
		GenerationContext.pad(
			GenerationContext.repeatSchematicFor(memoryOutput, data, 1n),
			0n,
			0n,
			0n,
			1n +
				gridVerticalDoubleInput.realWidth * address +
				gridVerticalSingleInput.realWidth * 3n +
				2n,
		),
	);
}
